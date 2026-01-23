import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Missing svix headers', { status: 400 });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error verifying webhook', { status: 400 });
    }

    // Handle the webhook
    const eventType = evt.type;

    if (eventType === 'user.created') {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);

        if (primaryEmail) {
            await db.insert(users).values({
                id,
                email: primaryEmail.email_address,
                name: [first_name, last_name].filter(Boolean).join(' ') || null,
                imageUrl: image_url || null,
            });
        }
    }

    if (eventType === 'user.updated') {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);

        if (primaryEmail) {
            await db
                .update(users)
                .set({
                    email: primaryEmail.email_address,
                    name: [first_name, last_name].filter(Boolean).join(' ') || null,
                    imageUrl: image_url || null,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, id));
        }
    }

    if (eventType === 'user.deleted') {
        const { id } = evt.data;
        if (id) {
            await db.delete(users).where(eq(users.id, id));
        }
    }

    return new Response('Webhook processed', { status: 200 });
}
