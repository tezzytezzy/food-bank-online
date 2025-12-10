'use server'

import { createClient } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type TemplateData = {
    name: string;
    ticket_type: 'Numeric' | 'TimeAllotted';
    distribution_type: 'Sequential' | 'NonSequential';
    max_numeric_tickets?: number;
    time_slots_config?: {
        start_time: string;
        slot_duration: number;
        total_slots: number;
        capacity_per_slot: number;
    };
    required_user_fields: Array<{ label: string; type: string }>;
    dietary_info?: string;
};

export async function createTemplate(data: TemplateData) {
    const { userId, getToken } = await auth();

    if (!userId) {
        throw new Error('Unauthorized');
    }

    const token = await getToken({ template: 'supabase' });
    if (!token) throw new Error('No Supabase token found');

    const supabase = await createClient(); // Uses cookies() inside, but we need the token for RLS if configured via headers in lib? 
    // Wait, lib/supabase.ts does NOT inject the token.
    // We MUST manually initialize the client like we did in onboarding actions.ts OR update lib/supabase.ts.
    // For consistency with my previous fix in onboarding, I'll use the manual client creation pattern here.

    // Actually, I should probably DRY this up, but for now copy-paste pattern is safer than breaking `lib/supabase.ts`.

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

    // Get User's Org (Admin/Editor role check is implicit in RLS but we need org_id for insert)
    // We need to find which Org to insert into.
    // For now, assuming single org or we pick the first one where they are Admin/Editor.

    const { data: membership, error: memberError } = await sbClient
        .from('org_members')
        .select('org_id')
        .eq('user_id', userId)
        .in('role', ['Admin', 'Editor'])
        .single();

    if (memberError || !membership) {
        throw new Error('You must be an Admin or Editor of an organisation to create templates.');
    }

    // Data Mapping
    const payload = {
        org_id: membership.org_id,
        name: data.name,
        ticket_type: data.ticket_type,
        distribution_type: data.distribution_type,
        max_numeric_tickets: data.max_numeric_tickets || null,
        // Store Start Time in its own column
        start_time: data.time_slots_config?.start_time || null,
        // Config JSON no longer needs start_time if we stored it above, but user interface passes it in one config object?
        // Let's rely on data passed.
        time_slots_config: data.time_slots_config ? {
            slot_duration: data.time_slots_config.slot_duration,
            total_slots: data.time_slots_config.total_slots,
            capacity_per_slot: data.time_slots_config.capacity_per_slot
        } : null,
        required_user_fields: data.required_user_fields,
        dietary_info: data.dietary_info,
    };

    const { error: insertError } = await sbClient
        .from('templates')
        .insert(payload);

    if (insertError) {
        console.error('Template Creation Error:', insertError);
        throw new Error('Failed to create template: ' + insertError.message);
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
}
