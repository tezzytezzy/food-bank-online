import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!SIGNING_SECRET) {
        throw new Error('Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
    }

    // Create new Svix instance with secret
    const wh = new Webhook(SIGNING_SECRET)

    // Get headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error: Missing Svix headers', {
            status: 400,
        })
    }

    // Get body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    let evt: WebhookEvent

    // Verify payload with headers
    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as WebhookEvent
    } catch (err) {
        console.error('Error: Could not verify webhook:', err)
        return new Response('Error: Verification error', {
            status: 400,
        })
    }

    // Do something with payload
    // For this guide, log payload to console
    const eventType = evt.type


    if (eventType === 'user.created') {
        const { id, public_metadata } = evt.data

        // Check if user has metadata for org invite
        const orgId = public_metadata?.org_id as string | undefined
        const role = public_metadata?.role as string | undefined

        if (orgId && role) {
            // Init Supabase Admin Client (Service Role)
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            // Add user to org_members
            const { error } = await supabaseAdmin
                .from('org_members')
                .insert({
                    org_id: orgId,
                    user_id: id,
                    role: role
                })

            if (error) {
                console.error('Error adding user to org:', error)
                return new Response('Error adding user to org', { status: 500 })
            }

        }
    }

    return new Response('Webhook received', { status: 200 })
}
