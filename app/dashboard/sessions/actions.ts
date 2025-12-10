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

    const { data: template, error: templateError } = await sbClient
        .from('templates')
        .select('org_id')
        .eq('id', data.template_id)
        .single();

    if (templateError || !template) {
        throw new Error('Template not found or access denied.');
    }

    // 2. Insert Session
    const payload = {
        org_id: template.org_id,
        template_id: data.template_id,
        session_date: data.session_date,
        start_time: data.start_time,
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
