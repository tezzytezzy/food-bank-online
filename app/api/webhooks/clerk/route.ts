import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', {
            status: 400
        })
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent

    // Verify the payload with the headers
    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error occured', {
            status: 400
        })
    }

    // Handle the event
    const eventType = evt.type;

    // Init Supabase Admin Client (Service Role) to bypass RLS
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (eventType === 'organization.created' || eventType === 'organization.updated') {
        const { id, name, slug, image_url } = evt.data;

        // Upsert to handle both create and update events
        const { error } = await supabase.from('organisations').upsert({
            id,
            name,
            slug,
            logo_url: image_url
        });

        if (error) {
            console.error('Error syncing organisation:', error);
            return new Response('Error syncing organisation', { status: 500 });
        }
    } else if (eventType === 'organization.deleted') {
        const { id } = evt.data;
        // Just delete the organisation. If you have FKs with Cascade, it will clean up.
        // If not, this might fail if there are dependent records, but we assume Cascade or manual cleanup is not needed for this MVP.
        const { error } = await supabase.from('organisations').delete().eq('id', id!);
        if (error) {
            console.error('Error deleting organisation:', error);
            return new Response('Error deleting organisation', { status: 500 });
        }
    }

    return new Response('', { status: 200 })
}
