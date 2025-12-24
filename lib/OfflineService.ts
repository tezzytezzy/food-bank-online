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
    ticket_desc: string;
    status: 'generated' | 'redeemed';
    required_user_fields: any[]; // JSONB

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
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'ticket_key' }); // Query by key is fast
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

    async downloadSessionData(sessionId: string): Promise<{ count: number }> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('session_id', sessionId);

        if (error) throw error;
        if (!data) return { count: 0 };

        const db = await this.initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        // Clear existing for this session? Or all?
        // Requirement: "overwrite local IndexedDB". 
        // Safer to clear all if we assume single session focus, but clearing specific session is safer if multiple cached.
        // For "Download (Check-out)", implied prepping for specific session. We'll clear everything to ensure clean state and avoid stale data from other sessions.
        await store.clear();

        for (const ticket of data) {
            await store.put({ ...ticket, synced: true }); // Mark as synced initially since strict copy
        }

        await tx.done;
        return { count: data.length };
    },

    async getTicket(ticketKey: string): Promise<LocalTicket | undefined> {
        const db = await this.initDB();
        return db.get(STORE_NAME, ticketKey);
    },

    async scanTicket(ticketKey: string, updates: { required_user_fields?: any[] }): Promise<void> {
        const db = await this.initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const ticket = await store.get(ticketKey);
        if (!ticket) throw new Error('Ticket not found');

        if (ticket.status === 'redeemed') {
            // Already redeemed logic? 
            // Depending on policy, might allow update of fields. 
            // For now, allow update.
        }

        const updatedTicket: LocalTicket = {
            ...ticket,
            status: 'redeemed',
            required_user_fields: updates.required_user_fields || ticket.required_user_fields,
            synced: false, // Mark dirty
        };

        await store.put(updatedTicket);
        await tx.done;
    },

    async syncSessionData(): Promise<{ total: number; success: number; failed: number; errors: any[] }> {
        const db = await this.initDB();
        const tx = db.transaction([STORE_NAME, SYNC_LOGS_STORE], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const logsStore = tx.objectStore(SYNC_LOGS_STORE);

        const allTickets: LocalTicket[] = await store.getAll();
        const dirtyTickets = allTickets.filter(t => t.synced === false);

        if (dirtyTickets.length === 0) {
            return { total: 0, success: 0, failed: 0, errors: [] };
        }

        const supabase = createClient();
        let successCount = 0;
        let failCount = 0;
        const errors: any[] = [];

        // Batch upsert? Or individual to isolate failures?
        // "Include a syncSummary... If a sync fails... store error in sync_logs array"
        // Individual upsert allows precise tracking.

        for (const ticket of dirtyTickets) {
            const { error } = await supabase
                .from('tickets')
                .update({
                    status: ticket.status,
                    required_user_fields: ticket.required_user_fields
                })
                .eq('ticket_id', ticket.ticket_id); // Match by immutable ID

            if (error) {
                failCount++;
                errors.push({ ticket: ticket.ticket_key, error: error.message });
                await logsStore.add({ timestamp: new Date(), ticket: ticket.ticket_key, error: error.message });
            } else {
                successCount++;
                // Update local to synced
                ticket.synced = true;
                await store.put(ticket);
            }
        }

        await tx.done;

        return { total: dirtyTickets.length, success: successCount, failed: failCount, errors };
    }
};
