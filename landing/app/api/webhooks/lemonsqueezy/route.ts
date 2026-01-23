import { headers } from 'next/headers';
import crypto from 'crypto';
import { db, purchases, licenseKeys, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Generate a license key in format: IXOS-XXXX-XXXX-XXXX-XXXX
function generateLicenseKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusable chars
    const segments = [];
    for (let i = 0; i < 4; i++) {
        let segment = '';
        for (let j = 0; j < 4; j++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        segments.push(segment);
    }
    return `IXOS-${segments.join('-')}`;
}

// Verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(req: Request) {
    const headerPayload = await headers();
    const signature = headerPayload.get('x-signature');

    if (!signature) {
        return new Response('Missing signature', { status: 400 });
    }

    const rawBody = await req.text();
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';

    // Verify signature
    if (!verifySignature(rawBody, signature, secret)) {
        return new Response('Invalid signature', { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const data = payload.data;

    try {
        switch (eventName) {
            case 'order_created': {
                const customData = payload.meta.custom_data || {};
                const userId = customData.user_id;
                const userEmail = data.attributes.user_email;

                // Find or create user
                let user = userId ? await db.query.users.findFirst({
                    where: eq(users.id, userId),
                }) : null;

                // Determine tier from product
                const productName = data.attributes.first_order_item?.product_name?.toLowerCase() || '';
                const tier = productName.includes('team') ? 'team' : 'pro';

                // Create purchase record
                const [purchase] = await db.insert(purchases).values({
                    userId: user?.id || null,
                    lemonSqueezyOrderId: data.id,
                    lemonSqueezyCustomerId: data.attributes.customer_id?.toString(),
                    productId: data.attributes.first_order_item?.product_id?.toString() || '',
                    variantId: data.attributes.first_order_item?.variant_id?.toString() || '',
                    status: 'active',
                    purchasedAt: new Date(data.attributes.created_at),
                    metadata: {
                        email: userEmail,
                        total: data.attributes.total_formatted,
                        currency: data.attributes.currency,
                    },
                }).returning();

                // Generate and store license key
                if (user && purchase) {
                    await db.insert(licenseKeys).values({
                        userId: user.id,
                        purchaseId: purchase.id,
                        key: generateLicenseKey(),
                        tier,
                        machineLimit: tier === 'team' ? 10 : 3,
                    });
                }

                // TODO: Send license key email via Resend
                break;
            }

            case 'subscription_created':
            case 'subscription_updated': {
                const orderId = data.attributes.order_id?.toString();
                const status = data.attributes.status;

                if (orderId) {
                    await db
                        .update(purchases)
                        .set({
                            status: status === 'active' ? 'active' : status === 'cancelled' ? 'cancelled' : 'expired',
                            expiresAt: data.attributes.ends_at ? new Date(data.attributes.ends_at) : null,
                        })
                        .where(eq(purchases.lemonSqueezyOrderId, orderId));
                }
                break;
            }

            case 'subscription_cancelled': {
                const orderId = data.attributes.order_id?.toString();

                if (orderId) {
                    await db
                        .update(purchases)
                        .set({ status: 'cancelled' })
                        .where(eq(purchases.lemonSqueezyOrderId, orderId));

                    // Revoke associated license keys
                    const purchase = await db.query.purchases.findFirst({
                        where: eq(purchases.lemonSqueezyOrderId, orderId),
                    });

                    if (purchase) {
                        await db
                            .update(licenseKeys)
                            .set({ isActive: false, revokedAt: new Date() })
                            .where(eq(licenseKeys.purchaseId, purchase.id));
                    }
                }
                break;
            }

            case 'order_refunded': {
                await db
                    .update(purchases)
                    .set({ status: 'refunded' })
                    .where(eq(purchases.lemonSqueezyOrderId, data.id));

                // Revoke license
                const purchase = await db.query.purchases.findFirst({
                    where: eq(purchases.lemonSqueezyOrderId, data.id),
                });

                if (purchase) {
                    await db
                        .update(licenseKeys)
                        .set({ isActive: false, revokedAt: new Date() })
                        .where(eq(licenseKeys.purchaseId, purchase.id));
                }
                break;
            }
        }

        return new Response('Webhook processed', { status: 200 });
    } catch (error) {
        console.error('Webhook error:', error);
        return new Response('Webhook processing failed', { status: 500 });
    }
}
