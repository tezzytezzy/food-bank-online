'use server'

import { createClient } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type SessionData = {
    template_id: string;
    session_date: string; // YYYY-MM-DD
    start_time: string; // HH:MM
    status: 'scheduled' | 'open' | 'full' | 'completed' | 'cancelled';
};

export async function createSession(data: SessionData) {
    const { userId, getToken } = await auth();

    if (!userId) {
        throw new Error('Unauthorized');
    }

    const token = await getToken({ template: 'supabase' });
    if (!token) throw new Error('No Supabase token found');

    // Manual client creation for now to ensure token is passed.
    // TODO: Refactor into a reusable server-side client factory.
    const { createServerClient } = await import("@supabase/ssr");
    const sbClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return [] },
                setAll() { }
            },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
    );

    // 1. Validate Template Access
    // We need to fetch the template to ensure it exists and get its org_id.
    // We also need to check if the user has write access to that org (Admin/Editor).
    // The RLS policy for inserting into sessions requires this, but we need the org_id to insert.

    // 1. Validate Template Access
    // We need to fetch the template to ensure it exists and get its org_id.
    // We also need to get the timing config to calculate end_time.
    const { data: template, error: templateError } = await sbClient
        .from('templates')
        .select('org_id, start_time, end_time, ticket_format, time_slots_config, capacity, required_user_fields')
        .eq('id', data.template_id)
        .single();

    if (templateError || !template) {
        throw new Error('Template not found or access denied.');
    }

    // Helper functions for time calculation
    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const toTimeStr = (minutes: number) => {
        const h = Math.floor(minutes / 60) % 24;
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // 2. Calculate End Time
    // We calculate duration from the template and apply it to the session's start_time
    let sessionEndTime = null;

    if (data.start_time) {
        let duration = 0;

        if (template.ticket_format === 'TimeAllotted' && template.time_slots_config) {
            // CAST config to any because Supabase types might be inferred loosely
            const config = template.time_slots_config as any;
            duration = (Number(config.slot_duration) || 0) * (Number(config.total_slots) || 0);
        } else if (template.start_time && template.end_time) {
            // Numeric: Duration = End - Start
            duration = toMinutes(template.end_time) - toMinutes(template.start_time);
        }

        // Apply duration to session start time
        if (duration > 0) {
            // If we have a duration, add it to the start time
            const startMinutes = toMinutes(data.start_time);
            sessionEndTime = toTimeStr(startMinutes + duration);
        } else if (template.end_time) {
            // Fallback: Use template end time directly if calculation fails
            sessionEndTime = template.end_time;
        }
    }

    // 3. Insert Session
    const payload = {
        org_id: template.org_id,
        template_id: data.template_id,
        session_date: data.session_date,
        start_time: data.start_time,
        end_time: sessionEndTime, // Add calculated end_time
        status: data.status,
    };

    const { data: session, error: insertError } = await sbClient
        .from('sessions')
        .insert(payload)
        .select('id')
        .single();

    if (insertError || !session) {
        console.error('Session Creation Error:', insertError);
        throw new Error('Failed to create session: ' + (insertError?.message || 'Unknown error'));
    }

    // 4. Generate Tickets
    try {
        const tickets = [];
        const usedKeys = new Set<string>();
        const capacity = template.capacity || 0;

        // Prepare initial user data
        const initialUserData = initialiseUserDataFromTemplate(template.required_user_fields as any[]);

        if (template.ticket_format === 'Numeric') {
            for (let i = 1; i <= capacity; i++) {
                tickets.push({
                    org_id: template.org_id,
                    session_id: session.id,
                    template_id: data.template_id,
                    qr_code: generateUniqueTicketKey(usedKeys),
                    assigned_value: String(i),
                    user_data: initialUserData,
                    status: 'generated'
                });
            }
        } else if (template.ticket_format === 'TimeAllotted' && template.time_slots_config && data.start_time) {
            const config = template.time_slots_config as any;
            const slotDuration = Number(config.slot_duration) || 0;
            const totalSlots = Number(config.total_slots) || 0;
            const capacityPerSlot = Number(config.capacity_per_slot) || 0;
            const sessionStartMinutes = toMinutes(data.start_time);

            for (let slotIdx = 0; slotIdx < totalSlots; slotIdx++) {
                // Calculate time for this slot
                const slotTimeMinutes = sessionStartMinutes + (slotIdx * slotDuration);
                const slotTimeStr = toTimeStr(slotTimeMinutes);

                // Create tickets for this slot
                for (let i = 0; i < capacityPerSlot; i++) {
                    tickets.push({
                        org_id: template.org_id,
                        session_id: session.id,
                        template_id: data.template_id,
                        qr_code: generateUniqueTicketKey(usedKeys),
                        assigned_value: slotTimeStr, // e.g., "09:00", "09:30"
                        user_data: initialUserData,
                        status: 'generated'
                    });
                }
            }
        }

        // 5. Bulk Insert Tickets
        if (tickets.length > 0) {
            const { error: ticketError } = await sbClient
                .from('tickets')
                .insert(tickets);

            if (ticketError) {
                // Determine if we should delete the session? 
                // For now, just throw, transaction rollback not guaranteed unless RPC.
                console.error('Error generating tickets:', ticketError);
                // Ideally clean up session here, but let's just surface error for now.
                throw new Error('Created session but failed to generate tickets: ' + ticketError.message);
            }
        }

    } catch (e: any) {
        console.error('Ticket Generation Logic Error:', e);
        throw new Error('Ticket generation failed: ' + e.message);
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
}

// --- Helper Functions ---

function generateUniqueTicketKey(existing: Set<string>): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = "";
    do {
        key = "";
        for (let i = 0; i < 6; i++) {
            key += chars[Math.floor(Math.random() * chars.length)];
        }
    } while (existing.has(key));
    existing.add(key);
    return key;
}

function initialiseUserDataFromTemplate(templateFields: any[]): Record<string, any> {
    const userDataObject: Record<string, any> = {};
    if (!Array.isArray(templateFields)) return userDataObject;

    for (const field of templateFields) {
        if (!field.label) continue;

        // 1. Lowercase
        let key = field.label.toLowerCase();

        // 2. Remove non-alphanumeric/non-space (except hyphen)
        key = key.replace(/[^a-z0-9\s-]/g, '');

        // 3. Replace spaces/hyphens with underscore
        key = key.replace(/[\s-]+/g, '_');

        // 4. Trim underscores
        key = key.replace(/^_+|_+$/g, '');

        if (key) {
            userDataObject[key] = null;
        }
    }
    return userDataObject;
}

export async function getTemplates() {
    const { userId, getToken } = await auth();
    if (!userId) return [];

    const token = await getToken({ template: 'supabase' });
    if (!token) return [];

    const { createServerClient } = await import("@supabase/ssr");
    const sbClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return [] },
                setAll() { }
            },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
    );

    const { data, error } = await sbClient
        .from('templates')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching templates:', error);
        return [];
    }

    return data;
}

export async function cancelSession(sessionId: string) {
    const { userId, getToken } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const token = await getToken({ template: 'supabase' });
    if (!token) throw new Error('No Supabase token found');

    const { createServerClient } = await import("@supabase/ssr");
    const sbClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return [] },
                setAll() { }
            },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
    );

    // Update the session status to 'cancelled'
    const { error } = await sbClient
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

    if (error) {
        console.error('Error cancelling session:', error);
        throw new Error('Failed to cancel session');
    }

    revalidatePath('/dashboard');
}
