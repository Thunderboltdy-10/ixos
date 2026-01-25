import { headers } from "next/headers";
import crypto from "crypto";
import { db, subscriptions, users, webhookEvents } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  normalizePlanFromProductName,
  normalizeSubscriptionStatus,
} from "@/lib/controlPlane";
import { getResend, getResendFromAddress } from "@/lib/email/resend";
import { PurchaseConfirmationEmail } from "@/lib/email/templates/purchase-confirmation";

function normalizeSignature(signature: string) {
  const trimmed = signature.trim();
  const parts = trimmed.split("=");
  const value = parts.length > 1 ? parts[parts.length - 1] : trimmed;
  return value.toLowerCase();
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  const normalized = normalizeSignature(signature);
  try {
    return crypto.timingSafeEqual(Buffer.from(normalized), Buffer.from(digest));
  } catch {
    return false;
  }
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: Request) {
  const headerPayload = await headers();
  const signature = headerPayload.get("x-signature");

  console.log("=== LemonSqueezy Webhook Received ===");

  if (!signature) {
    console.log("Missing signature header");
    return new Response("Missing signature", { status: 400 });
  }

  const rawBody = await req.text();
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

  // Verify signature
  const signatureValid = verifySignature(rawBody, signature, secret);
  console.log("Signature valid:", signatureValid);

  type LemonPayload = {
    meta?: {
      event_name?: string;
      custom_data?: Record<string, unknown>;
      webhook_id?: string;
      test_mode?: boolean;
    };
    data?: {
      id?: string | number;
      type?: string;
      attributes?: Record<string, unknown>;
    };
  };

  let payload: LemonPayload;
  try {
    payload = JSON.parse(rawBody) as LemonPayload;
  } catch (error) {
    console.error("Invalid webhook JSON:", error);
    return new Response("Invalid payload", { status: 400 });
  }

  const eventName =
    typeof payload.meta?.event_name === "string"
      ? payload.meta.event_name
      : "unknown";
  const dataType = payload.data?.type || "unknown";

  const data = payload.data;
  const attributes = (data?.attributes ?? {}) as Record<string, unknown>;
  const customData = (payload.meta?.custom_data ?? {}) as Record<string, unknown>;
  const eventTimestamp =
    (typeof attributes["updated_at"] === "string" && attributes["updated_at"]) ||
    (typeof attributes["created_at"] === "string" && attributes["created_at"]) ||
    null;

  const eventId =
    headerPayload.get("x-event-id") ||
    (typeof payload.meta?.webhook_id === "string" &&
    (payload.data?.id || eventTimestamp)
      ? `${payload.meta.webhook_id}:${payload.meta.event_name ?? "event"}:${payload.data?.id ?? "unknown"}:${eventTimestamp ?? "unknown"}`
      : null) ||
    crypto.randomUUID();

  console.log("Event ID:", eventId);
  console.log("Event Name:", eventName);
  console.log("Data Type:", dataType);

  // Insert webhook event for audit
  let webhookEventId: string | null = null;
  try {
    const [webhookEvent] = await db
      .insert(webhookEvents)
      .values({
        eventId,
        provider: "lemonsqueezy",
        eventName,
        rawBody,
        signatureValid,
        processedAt: null,
      })
      .onConflictDoNothing()
      .returning();

    if (!webhookEvent) {
      console.log("Webhook already processed, skipping:", eventId);
      return new Response("Webhook already processed", { status: 200 });
    }
    webhookEventId = webhookEvent.id;
  } catch (dbError) {
    console.error("Failed to insert webhook event:", dbError);
    // Continue anyway - don't fail the webhook for DB audit issues
  }

  if (!signatureValid) {
    console.log("Invalid signature");
    if (webhookEventId) {
      await db
        .update(webhookEvents)
        .set({ processingError: "Invalid signature" })
        .where(eq(webhookEvents.id, webhookEventId))
        .catch(() => {});
    }
    return new Response("Invalid signature", { status: 400 });
  }

  const getAttrString = (key: string): string | null => {
    const value = attributes[key];
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    return null;
  };

  // Extract user identification
  const clerkUserIdRaw = customData["clerk_user_id"] ?? customData["user_id"] ?? null;
  const clerkUserId = typeof clerkUserIdRaw === "string" ? clerkUserIdRaw : null;
  const userEmail = getAttrString("user_email") ?? getAttrString("customer_email") ??
    (typeof customData["email"] === "string" ? customData["email"] : null);

  console.log("Clerk User ID:", clerkUserId);
  console.log("User Email:", userEmail);

  try {
    // Handle different event types
    if (eventName === "order_created" || eventName === "order_refunded") {
      // Order events - log and return success (subscription events will handle the actual subscription)
      console.log(`Order event ${eventName} received, logging and returning success`);
      if (webhookEventId) {
        await db
          .update(webhookEvents)
          .set({ processedAt: new Date() })
          .where(eq(webhookEvents.id, webhookEventId));
      }
      return new Response("Order event logged", { status: 200 });
    }

    // For subscription events, we need a subscription ID
    if (!eventName.startsWith("subscription_")) {
      console.log(`Non-subscription event ${eventName}, logging and returning success`);
      if (webhookEventId) {
        await db
          .update(webhookEvents)
          .set({ processedAt: new Date() })
          .where(eq(webhookEvents.id, webhookEventId));
      }
      return new Response("Event logged", { status: 200 });
    }

    // Find or create user
    let userRecord = null;

    if (clerkUserId) {
      userRecord = await db.query.users.findFirst({
        where: eq(users.clerkUserId, clerkUserId),
      });
    }

    if (!userRecord && userEmail) {
      userRecord = await db.query.users.findFirst({
        where: eq(users.email, userEmail),
      });

      // If user found by email but doesn't have clerk ID, update it
      if (userRecord && clerkUserId && !userRecord.clerkUserId) {
        await db
          .update(users)
          .set({ clerkUserId, updatedAt: new Date() })
          .where(eq(users.id, userRecord.id));
      }
    }

    // If still no user and we have email, create a placeholder user
    if (!userRecord && userEmail) {
      console.log("Creating placeholder user for:", userEmail);
      const [newUser] = await db
        .insert(users)
        .values({
          clerkUserId: clerkUserId || `lemon_${data?.id || crypto.randomUUID()}`,
          email: userEmail,
          name: getAttrString("user_name") || null,
        })
        .onConflictDoNothing()
        .returning();

      if (newUser) {
        userRecord = newUser;
      } else {
        // Try to fetch again in case of race condition
        userRecord = await db.query.users.findFirst({
          where: eq(users.email, userEmail),
        });
      }
    }

    if (!userRecord) {
      console.log("Could not find or create user for subscription");
      if (webhookEventId) {
        await db
          .update(webhookEvents)
          .set({ processingError: "User not found and could not be created" })
          .where(eq(webhookEvents.id, webhookEventId));
      }
      // Return 200 anyway to not block retries - we'll handle this manually
      return new Response("User not found", { status: 200 });
    }

    // Get subscription ID
    const lemonSubscriptionId = data?.id?.toString() || getAttrString("subscription_id");
    if (!lemonSubscriptionId) {
      console.log("Missing subscription ID");
      if (webhookEventId) {
        await db
          .update(webhookEvents)
          .set({ processingError: "Missing subscription ID" })
          .where(eq(webhookEvents.id, webhookEventId));
      }
      return new Response("Missing subscription ID", { status: 200 });
    }

    const lemonCustomerId = getAttrString("customer_id");
    const plan = normalizePlanFromProductName(
      getAttrString("variant_name") ??
      getAttrString("product_name") ??
      null
    );

    let status = normalizeSubscriptionStatus(getAttrString("status"));
    if (eventName === "subscription_cancelled") {
      status = "cancelled";
    }
    if (eventName === "subscription_payment_failed") {
      status = "past_due";
    }

    const currentPeriodEnd =
      parseDate(getAttrString("ends_at")) ??
      parseDate(getAttrString("renews_at")) ??
      parseDate(getAttrString("trial_ends_at"));

    // Get customer portal URL for billing management
    const urls = attributes["urls"] as Record<string, string> | undefined;
    const customerPortalUrl = urls?.["customer_portal"] || null;

    console.log("Subscription ID:", lemonSubscriptionId);
    console.log("Status:", status);
    console.log("Plan:", plan);

    // Upsert subscription
    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.lemonSubscriptionId, lemonSubscriptionId),
    });

    const isNewSubscription = !existing;

    if (existing) {
      await db
        .update(subscriptions)
        .set({
          userId: userRecord.id,
          lemonCustomerId,
          status,
          plan,
          currentPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.lemonSubscriptionId, lemonSubscriptionId));
    } else {
      await db.insert(subscriptions).values({
        userId: userRecord.id,
        lemonCustomerId,
        lemonSubscriptionId,
        status,
        plan,
        currentPeriodEnd,
      });
    }

    console.log("Subscription upserted successfully");

    // Send welcome email for new subscriptions
    if (isNewSubscription && userRecord.email && eventName === "subscription_created") {
      const resend = getResend();
      if (resend) {
        const siteUrl = process.env.IXOS_SITE_URL || "https://ixos.app";
        try {
          await resend.emails.send({
            from: getResendFromAddress(),
            to: userRecord.email,
            subject: "Welcome to Ixos Pro!",
            react: PurchaseConfirmationEmail({
              planName: getAttrString("product_name") ?? "Ixos Pro",
              amount: "$7.99/mo",
              billingPeriod: "Monthly",
              purchaseDate: new Date().toLocaleDateString("en-US", {
                dateStyle: "medium",
              }),
              receiptUrl: customerPortalUrl,
              accountUrl: `${siteUrl}/account`,
            }),
          });
          console.log("Welcome email sent");
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }
      }
    }

    // Mark webhook as processed
    if (webhookEventId) {
      await db
        .update(webhookEvents)
        .set({ processedAt: new Date() })
        .where(eq(webhookEvents.id, webhookEventId));
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook processing error:", error);

    if (webhookEventId) {
      await db
        .update(webhookEvents)
        .set({ processingError: message })
        .where(eq(webhookEvents.id, webhookEventId))
        .catch(() => {});
    }

    // Return 200 anyway to prevent endless retries
    return new Response("Webhook processing failed but acknowledged", { status: 200 });
  }
}
