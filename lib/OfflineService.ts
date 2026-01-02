import { openDB, IDBPDatabase } from 'idb';
import { createClient } from './supabase-client';
import { Ticket } from './PdfGenerator'; // Re-use interface if possible, or redefine

// Extended Ticket interface for local storage
export interface LocalTicket extends Ticket {
    // Add fields from DB schema
    // ticket_id?: number; // DB id? 'ticket_id' in local interface might be better
    // Actually, PdfGenerator defined: ticket_key, ticket_id.
    // We need all fields.
    org_id: string; // Matches text type in DB
    session_id: string;
    template_id: string;
    ticket_number_str?: string;
    assigned_start_time?: string;
    status: 'generated' | 'redeemed';
    user_data: Record<string, any>; // JSONB

    // Local flags
    synced?: boolean;
}

const DB_NAME = 'food-bank-offline';
const STORE_NAME = 'tickets';
const SYNC_LOGS_STORE = 'sync_logs';

export const OfflineService = {
    async initDB() {
        return openDB(DB_NAME, 1, {
            upgrade(db) {
                // Tickets Store
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'qr_code' }); // Query by key is fast
                    store.createIndex('session_id', 'session_id');
                    store.createIndex('status', 'status');
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
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('session_id', sessionId);

        if (error) throw error;
        if (!data) return { count: 0 };

        const db = await this.initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        // Clear existing data to ensure clean state for the session
        await store.clear();

        for (const ticket of data) {
            // Check if we have an existing local record to preserve timestamp? 
            // The prompt says "download... downloads and stores". 
            // "Synchronization Logic: When device reconnects... last-saved-state-wins."
            // But download usually means "Fresh Start" or "Pull from Server".
            // If we overwrite local usage, we lose offline scans if not synced.
            // Assumption: User syncs BEFORE downloading fresh data, or this download wipes local state.
            // "Functionality: This action downloads and stores..." implies initialization.
            await store.put({
                ...ticket,
                status: ticket.status || 'generated', // Default to generated if null
                lastScanTimestamp: null, // Initialize
                synced: true
            });
        }

        await tx.done;
        return { count: data.length };
    },

    async getTicket(qrCode: string): Promise<LocalTicket | undefined> {
        const db = await this.initDB();
        return db.get(STORE_NAME, qrCode);
    },

    async scanTicket(qrCode: string, updates: { user_data?: Record<string, any> }): Promise<void> {
        const db = await this.initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const ticket = await store.get(qrCode);
        if (!ticket) throw new Error('Ticket not found');

        // Update Ticket
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

        // 1. Get dirty tickets - use readonly fetch
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

        // 2. Perform Network Operations (outside transaction)
        for (const ticket of dirtyTickets) {
            const { error } = await supabase
                .from('tickets')
                .update({
                    status: ticket.status,
                    user_data: ticket.user_data
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

        // 3. Update Local DB (new transaction)
        if (successfulQrCodes.length > 0 || syncLogs.length > 0) {
            const tx = db.transaction([STORE_NAME, SYNC_LOGS_STORE], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const logsStore = tx.objectStore(SYNC_LOGS_STORE);

            // Mark successful tickets as synced
            for (const qr of successfulQrCodes) {
                const t = await store.get(qr);
                if (t) {
                    t.synced = true;
                    await store.put(t);
                }
            }

            // Write logs
            for (const log of syncLogs) {
                await logsStore.add(log);
            }

            await tx.done;
        }

        return { total: dirtyTickets.length, success: successCount, failed: failCount, errors };
    }
};
