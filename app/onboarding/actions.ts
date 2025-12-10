'use server'

import { createClient } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createOrganisation(formData: FormData) {
    const { userId, getToken } = await auth();

    if (!userId) {
        redirect('/');
    }

    const name = formData.get('name') as string;
    const country = formData.get('country') as string;
    const state = formData.get('state') as string;
    const city = formData.get('city') as string;

    if (!name || !country || !state || !city) {
        throw new Error('Missing fields');
    }

    const token = await getToken({ template: 'supabase' });
    const supabase = await createClient();

    // Note: createClient uses default cookie store, but for mutations with RLS based on Auth, we generally need the token.
    // BUT `lib/supabase.ts` does NOT accept a token argument in `createClient`.
    // I should update `lib/supabase.ts` to allow passing headers OR use the pattern I used in Middleware.
    // HOWEVER, for Server Actions, `cookies()` are forwarded automatically.
    // IF the Supabase Client is configured with the right headers via middleware setting cookies? No.
    // The standard pattern is:
    // 1. Middleware sets the session/cookie. (We didn't set a session, we used a bearer token in middleware client).
    // 2. OR Server Action uses a client initialized with the Token.
    // Since `lib/supabase.ts` is shared, I created it to use `cookies()`.
    // AND I did NOT implement the logic to mint a fresh token in `lib/supabase` automatically from Clerk.
    //
    // FIX: I will refactor `createOrganisation` to initialize a client manually here using the token, similar to Middleware.
    // 
    // Wait, I can't reuse `createClient` from `@/lib/supabase` effectively if it relies on `process.env` and doesn't inject the Clerk token.
    // UNLESS I update `lib/supabase.ts` to accept an optional token.
    // I'll do it manually here for safety.

    const { createServerClient } = await import("@supabase/ssr");
    const sbClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return [] }, // We don't need to read cookies for this mutation, we use the token.
                setAll() { }
            },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
    );

    // Use RPC to create Organisation and Member atomically.
    // This bypasses the RLS "Chicken and Egg" problem where you can't select the org you just created because you aren't a member yet.
    const { data: orgId, error: rpcError } = await sbClient.rpc('create_new_organisation', {
        org_name: name,
        org_country: country,
        org_state: state,
        org_city: city
    });

    if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw new Error('Organisation creation failed: ' + rpcError.message);
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
}
