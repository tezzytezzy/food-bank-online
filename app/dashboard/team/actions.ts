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

export async function deleteMember(formData: FormData) {
    const memberId = formData.get('memberId') as string;
    const { userId, getToken } = await auth();

    if (!userId) {
        throw new Error('Unauthorized');
    }

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

    // 1. Get current user's role and org
    const { data: myMembership } = await supabase
        .from('org_members')
        .select('role, org_id')
        .eq('user_id', userId)
        .single();

    if (!myMembership || myMembership.role !== 'Admin') {
        throw new Error('Unauthorized: Only Admins can delete members.');
    }

    // 2. Get target member details to verify they are in the same org
    const { data: targetMembership } = await supabase
        .from('org_members')
        .select('*')
        .eq('id', memberId) // utilizing the unique ID of the membership row
        .single();

    if (!targetMembership) {
        throw new Error('Member not found.');
    }

    if (targetMembership.org_id !== myMembership.org_id) {
        throw new Error('Unauthorized: Member is not in your organisation.');
    }

    // 3. Prevent self-deletion
    if (targetMembership.user_id === userId) {
        throw new Error('Cannot delete yourself.');
    }

    // 4. Delete from Clerk first (if this fails, we shouldn't remove local access maybe? OR remove anyway. 
    //    Removing local access is 'safer' for security, but we want consistency.
    //    Let's try Clerk delete first.)
    const client = await clerkClient();
    try {
        await client.users.deleteUser(targetMembership.user_id);
    } catch (error) {
        console.error('Failed to delete user from Clerk:', error);
        // We might choose to proceed if the user is already gone from Clerk but stuck in DB.
        // But for safety, let's assume if it fails, we assume valid reason and stop, unless it's "not found".
        // @ts-ignore
        if (error.status !== 404) {
            throw new Error('Failed to delete user from authentication provider.');
        }
    }

    // 5. Delete from Supabase org_members
    const { error: deleteError } = await supabase
        .from('org_members')
        .delete()
        .eq('id', memberId);

    if (deleteError) {
        throw new Error(`Failed to remove member: ${deleteError.message}`);
    }

    revalidatePath('/dashboard/team');
    redirect('/dashboard/team');
}
