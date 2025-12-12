'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from 'next/cache';

export async function inviteUser(formData: FormData) {
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const { userId, getToken } = await auth();

    if (!userId) {
        throw new Error('Unauthorized');
    }

    // Check if user is Admin
    const token = await getToken({ template: 'supabase' });
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        }
    );

    const { data: membership } = await supabase
        .from('org_members')
        .select('role, org_id')
        .eq('user_id', userId)
        .single();

    if (!membership || membership.role !== 'Admin') {
        throw new Error('Unauthorized: Only Admins can invite users.');
    }

    try {
        const client = await clerkClient()

        await client.invitations.createInvitation({
            emailAddress: email,
            publicMetadata: {
                org_id: membership.org_id,
                role: role
            },
            redirectUrl: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/sign-up` : 'http://localhost:3000/sign-up'
        });

        revalidatePath('/dashboard/team');
    } catch (error) {
        console.error('Clerk Invite Error:', error);
        // Return error to UI? For now, we'll let it throw or handle in the form
        // Throw the actual error message safely
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Clerk errors often come as objects with 'errors' array, let's try to stringify if needed or just pass message
        // @ts-ignore
        const clerkMessage = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || errorMessage;
        throw new Error(`Failed to send invitation: ${clerkMessage}`);
    }

    redirect('/dashboard/team');
}
