import { openDB, IDBPDatabase } from 'idb';
import { createClient } from './supabase-client';
import { Ticket } from './PdfGenerator';
import { FieldDefinition } from '@/components/DynamicUserFields';

// Extended Ticket interface for local storage
export interface LocalTicket extends Ticket {
    org_id: string;
    session_id: string;
    template_id: string;
    ticket_number_str?: string;
    assigned_start_time?: string;
    status: 'generated' | 'redeemed';
    user_data: Record<string, any>;
    lastScanTimestamp?: number | null;
    synced?: boolean;
}

export interface LocalTemplate {
    id: string;
    required_user_fields: Record<string, FieldDefinition>;
    ticket_format: string;
}

const DB_NAME = 'food-bank-offline';
const STORE_NAME = 'tickets';
const TEMPLATE_STORE = 'templates';
const SYNC_LOGS_STORE = 'sync_logs';

export const OfflineService = {
    async initDB() {
        return openDB(DB_NAME, 2, { // Bump version
            upgrade(db, oldVersion, newVersion, transaction) {
                // Tickets Store
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'qr_code' });
                    store.createIndex('session_id', 'session_id');
                    store.createIndex('status', 'status');
                }

                // Templates Store (New)
                if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
                    db.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
                }

                // Sync Logs Store
                if (!db.objectStoreNames.contains(SYNC_LOGS_STORE)) {
                    db.createObjectStore(SYNC_LOGS_STORE, { autoIncrement: true });
                }
            },
        });
    },

    async downloadSessionData(sessionId: string, token: string): Promise<{ count: number }> {
        const supabase = createClient(token);

        // 1. Fetch Tickets
        const { data: tickets, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('session_id', sessionId);

        if (ticketError) throw ticketError;
        if (!tickets || tickets.length === 0) return { count: 0 };

        // 2. Fetch Template (Optimization: only fetch distinct template_ids if they differ, but typically one session has one template)
        // We know tickets have template_id. Let's get the distinct template_id from the first ticket (or all unique ones).
        const templateIds = Array.from(new Set(tickets.map(t => t.template_id)));

        let templates: LocalTemplate[] = [];
        if (templateIds.length > 0) {
            const { data: templateData, error: tempError } = await supabase
                .from('templates')
                .select('id, required_user_fields, ticket_format')
                .in('id', templateIds);

            if (tempError) throw tempError;
            // Cast to LocalTemplate - assuming migration 2026... ran or data is compatible.
            // If required_user_fields is Array, this might require runtime conversion or we trust DB is migrated.
            // For robustness, let's just save what we get. The UI might need to handle legacy array.
            if (templateData) {
                templates = templateData.map(t => ({
                    id: t.id,
                    required_user_fields: t.required_user_fields as unknown as Record<string, FieldDefinition>, // Expect Object Map
                    ticket_format: t.ticket_format
                }));
            }
        }

        const db = await this.initDB();
        const tx = db.transaction([STORE_NAME, TEMPLATE_STORE], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const tplStore = tx.objectStore(TEMPLATE_STORE);

        // Save Templates
        for (const tpl of templates) {
            await tplStore.put(tpl);
        }

        // Save Tickets
        await store.clear(); // Clear existing generic dump logic, maybe refine later to only clear relevant session?
        // Actually, if we clear, we lose other sessions. Ideally we sort by session.
        // But current logic was `store.clear()`. I will keep it but it implies "Single Session Mode".

        for (const ticket of tickets) {
            await store.put({
                ...ticket,
                status: ticket.status || 'generated',
                lastScanTimestamp: null,
                synced: true
            });
        }

        await tx.done;
        return { count: tickets.length };
    },

    async getTicket(qrCode: string): Promise<LocalTicket | undefined> {
        const db = await this.initDB();
        return db.get(STORE_NAME, qrCode);
    },

    async getTemplate(templateId: string): Promise<LocalTemplate | undefined> {
        const db = await this.initDB();
        return db.get(TEMPLATE_STORE, templateId);
    },

    async scanTicket(qrCode: string, updates: { user_data?: Record<string, any> }): Promise<void> {
        const db = await this.initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const ticket = await store.get(qrCode);
        if (!ticket) throw new Error('Ticket not found');

        const updatedTicket: LocalTicket = {
            ...ticket,
            status: 'redeemed',
            user_data: updates.user_data || ticket.user_data,
            lastScanTimestamp: Date.now(),
            synced: false,
        };

        await store.put(updatedTicket);
        await tx.done;
    },

    async syncSessionData(token: string): Promise<{ total: number; success: number; failed: number; errors: any[] }> {
        const db = await this.initDB();

        const allTickets: LocalTicket[] = await db.getAll(STORE_NAME);
        const dirtyTickets = allTickets.filter(t => t.synced === false && t.status === 'redeemed');

        if (dirtyTickets.length === 0) {
            return { total: 0, success: 0, failed: 0, errors: [] };
        }

        const supabase = createClient(token);
        let successCount = 0;
        let failCount = 0;
        const errors: any[] = [];

        const successfulQrCodes: string[] = [];
        const syncLogs: any[] = [];

        for (const ticket of dirtyTickets) {
            const { error } = await supabase
                .from('tickets')
                .update({
                    status: ticket.status,
                    user_data: ticket.user_data,
                    lastScanTimestamp: ticket.lastScanTimestamp ? new Date(ticket.lastScanTimestamp).toISOString() : null
                })
                .eq('id', ticket.id);

            if (error) {
                failCount++;
                errors.push({ ticket: ticket.qr_code, error: error.message });
                syncLogs.push({ timestamp: new Date(), ticket: ticket.qr_code, error: error.message });
            } else {
                successCount++;
                successfulQrCodes.push(ticket.qr_code);
            }
        }

        if (successfulQrCodes.length > 0 || syncLogs.length > 0) {
            const tx = db.transaction([STORE_NAME, SYNC_LOGS_STORE], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const logsStore = tx.objectStore(SYNC_LOGS_STORE);

            for (const qr of successfulQrCodes) {
                const t = await store.get(qr);
                if (t) {
                    t.synced = true;
                    await store.put(t);
                }
            }

            for (const log of syncLogs) {
                await logsStore.add(log);
            }

            await tx.done;
        }

        return { total: dirtyTickets.length, success: successCount, failed: failCount, errors };
    }
};
