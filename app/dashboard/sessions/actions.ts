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
        .select('org_id, start_time, end_time, ticket_format, time_slots_config')
        .eq('id', data.template_id)
        .single();

    if (templateError || !template) {
        throw new Error('Template not found or access denied.');
    }

    // 2. Calculate End Time
    // We calculate duration from the template and apply it to the session's start_time
    let sessionEndTime = null;

    if (data.start_time) {
        // Helper to convert HH:MM to minutes
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        // Helper to convert minutes back to HH:MM
        const toTimeStr = (minutes: number) => {
            const h = Math.floor(minutes / 60) % 24;
            const m = minutes % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

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
            const startMinutes = toMinutes(data.start_time);
            sessionEndTime = toTimeStr(startMinutes + duration);
        } else if (template.end_time) {
            // Fallback: Use template end time directly if calculation fails
            sessionEndTime = template.end_time;
        }
    }

    // 2. Insert Session
    const payload = {
        org_id: template.org_id,
        template_id: data.template_id,
        session_date: data.session_date,
        start_time: data.start_time,
        end_time: sessionEndTime, // Add calculated end_time
        status: data.status,
    };

    const { error: insertError } = await sbClient
        .from('sessions')
        .insert(payload);

    if (insertError) {
        console.error('Session Creation Error:', insertError);
        throw new Error('Failed to create session: ' + insertError.message);
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
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
