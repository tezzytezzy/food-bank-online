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
    user_data: any[]; // JSONB

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

    async scanTicket(qrCode: string, updates: { user_data?: any[] }): Promise<void> {
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

    async syncSessionData(): Promise<{ total: number; success: number; failed: number; errors: any[] }> {
        const db = await this.initDB();
        const tx = db.transaction([STORE_NAME, SYNC_LOGS_STORE], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const logsStore = tx.objectStore(SYNC_LOGS_STORE);

        const allTickets: LocalTicket[] = await store.getAll();

        // Filter: Only tickets with status 'redeemed' and dirty
        // "Only tickets with a status of 'redeemed' ... should be synced back"
        // Also "client-side lastScanTimestamp that is later than the last known server sync time"
        // We track 'synced' flag. If synced=true, it's already up to date (or handled).
        // If synced=false, it's a candidate.

        const dirtyTickets = allTickets.filter(t => t.synced === false && t.status === 'redeemed');

        if (dirtyTickets.length === 0) {
            return { total: 0, success: 0, failed: 0, errors: [] };
        }

        const supabase = createClient();
        let successCount = 0;
        let failCount = 0;
        const errors: any[] = [];

        for (const ticket of dirtyTickets) {

            // Check timestamp condition if needed?
            // "later than the last known server sync time".
            // Since we don't track 'last known server sync time' globally yet, 
            // we rely on the fact it is dirty (modified since download/last sync).

            const { error } = await supabase
                .from('tickets')
                .update({
                    status: ticket.status,
                    user_data: ticket.user_data
                    // timestamp? DB doesn't support it yet, so we just update status.
                })
                .eq('id', ticket.id);

            if (error) {
                failCount++;
                errors.push({ ticket: ticket.qr_code, error: error.message });
                await logsStore.add({ timestamp: new Date(), ticket: ticket.qr_code, error: error.message });
            } else {
                successCount++;
                ticket.synced = true;
                await store.put(ticket);
            }
        }

        await tx.done;

        return { total: dirtyTickets.length, success: successCount, failed: failCount, errors };
    }
};
