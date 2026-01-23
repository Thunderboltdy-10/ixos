import { NextRequest, NextResponse } from 'next/server';
import { db, waitlist } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { Resend } from 'resend';

// Lazy initialize Resend to avoid build-time errors
function getResend() {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }
    return new Resend(process.env.RESEND_API_KEY);
}

// Rate limiting: Simple in-memory store (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 requests
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return false;
    }

    if (record.count >= RATE_LIMIT) {
        return true;
    }

    record.count++;
    return false;
}

const waitlistSchema = z.object({
    email: z.string().email('Invalid email address'),
    source: z.string().optional(),
    honeypot: z.string().optional(), // Anti-spam: should be empty
});

export async function POST(req: NextRequest) {
    try {
        // Get IP for rate limiting
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                   req.headers.get('x-real-ip') ||
                   'unknown';

        // Check rate limit
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        const body = await req.json();

        // Validate input
        const result = waitlistSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400 }
            );
        }

        const { email, source, honeypot } = result.data;

        // Anti-spam: reject if honeypot field is filled
        if (honeypot) {
            // Silently reject but return success to not tip off bots
            return NextResponse.json({ success: true });
        }

        // Check if already subscribed
        const existing = await db.query.waitlist.findFirst({
            where: eq(waitlist.email, email.toLowerCase()),
        });

        if (existing) {
            return NextResponse.json(
                { error: 'This email is already on the waitlist.' },
                { status: 409 }
            );
        }

        // Add to waitlist
        await db.insert(waitlist).values({
            email: email.toLowerCase(),
            source: source || 'unknown',
            referrer: req.headers.get('referer') || null,
        });

        // Send confirmation email
        const resend = getResend();
        if (resend) {
            try {
                await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || 'Ixos <noreply@ixos.app>',
                    to: email,
                    subject: "You're on the Ixos waitlist!",
                    html: `
                        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #0d9488;">Welcome to the Ixos waitlist!</h1>
                            <p>Thanks for signing up. We'll notify you when Ixos is ready for your platform.</p>
                            <p>In the meantime, you can:</p>
                            <ul>
                                <li><a href="https://github.com/ixos-protocol/ixos">Star us on GitHub</a></li>
                                <li><a href="https://ixos.app/docs">Read the documentation</a></li>
                            </ul>
                            <p style="color: #64748b; font-size: 14px; margin-top: 40px;">
                                Your files stay on your device. Always.
                            </p>
                        </div>
                    `,
                });
            } catch (emailError) {
                console.error('Failed to send waitlist email:', emailError);
                // Don't fail the request if email fails
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Waitlist error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
