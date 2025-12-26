'use server'

import { createClient } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type TemplateData = {
    name: string;
    ticket_format: 'Numeric' | 'TimeAllotted';
    issuance_order: 'Sequential' | 'NonSequential';
    delivery_mode: 'Digital' | 'Paper' | 'Hybrid';
    capacity?: number;
    time_slots_config?: {
        start_time: string;
        end_time: string;
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

    const { orgId, orgRole } = await auth();

    if (!orgId) {
        throw new Error('No Organization selected.');
    }

    // Optional: Enforce specific Clerk roles if needed
    // if (orgRole !== 'org:admin') ...

    // Data Mapping
    const payload = {
        org_id: orgId,
        name: data.name,
        ticket_format: data.ticket_format,
        issuance_order: data.issuance_order,
        delivery_mode: data.delivery_mode,
        capacity: data.capacity || null,
        // Store Start Time in its own column
        start_time: data.time_slots_config?.start_time || null,
        end_time: data.time_slots_config?.end_time || null,
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
