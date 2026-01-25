import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db, users, webhookEvents } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const payload = JSON.parse(body);

  console.log("------------------------------------------");
  console.log("WEBHOOK RECEIVED");
  console.log("Headers:", { svixId, svixTimestamp, svixSignature });
  console.log("Payload:", JSON.stringify(payload, null, 2));

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;

    console.log("Webhook verified successfully. Event Type:", evt.type);

  } catch (error) {
    console.error("Error verifying Clerk webhook:", error);
    return new Response("Error verifying webhook", { status: 400 });
  }

  const eventType = evt.type;

  // Insert webhook event FIRST with processedAt: null for idempotency
  // Use onConflictDoNothing to skip if already exists (based on unique index)
  const [insertedEvent] = await db
    .insert(webhookEvents)
    .values({
      eventId: svixId,
      provider: "clerk",
      eventName: eventType,
      rawBody: body,
      signatureValid: true,
      processedAt: null,
    })
    .onConflictDoNothing()
    .returning();

  // If no row was inserted, this event was already processed
  if (!insertedEvent) {
    console.log("Webhook already processed, skipping:", svixId);
    return new Response("Webhook already processed", { status: 200 });
  }

  let processingError: string | null = null;

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses.find(
        (email) => email.id === evt.data.primary_email_address_id
      );

      if (primaryEmail) {
        const name = [first_name, last_name].filter(Boolean).join(" ") || null;

        // Check for existing user by email to handle placeholders (e.g. from LemonSqueezy)
        const existingUserByEmail = await db.query.users.findFirst({
          where: eq(users.email, primaryEmail.email_address)
        });

        if (existingUserByEmail && existingUserByEmail.clerkUserId !== id) {
          console.log(`Merging placeholder user ${existingUserByEmail.id} with Clerk ID ${id}`);
          await db.update(users)
            .set({
              clerkUserId: id,
              name: name || existingUserByEmail.name,
              imageUrl: image_url || existingUserByEmail.imageUrl,
              updatedAt: new Date()
            })
            .where(eq(users.id, existingUserByEmail.id));
        } else {
          // Use upsert pattern to handle race conditions or standard updates
          await db
            .insert(users)
            .values({
              clerkUserId: id,
              email: primaryEmail.email_address,
              name,
              imageUrl: image_url || null,
            })
            .onConflictDoUpdate({
              target: users.clerkUserId,
              set: {
                email: primaryEmail.email_address,
                name,
                imageUrl: image_url || null,
                updatedAt: new Date(),
              },
            });
        }
      }
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data;
      if (id) {
        await db.delete(users).where(eq(users.clerkUserId, id));
      }
    }

    // Mark webhook as successfully processed
    await db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(webhookEvents.id, insertedEvent.id));

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    processingError = error instanceof Error ? error.message : String(error);
    console.error("Clerk webhook processing error:", processingError);

    // Record the error but return 500 so webhook provider will retry
    await db
      .update(webhookEvents)
      .set({ processingError })
      .where(eq(webhookEvents.id, insertedEvent.id));

    return new Response("Webhook processing failed", { status: 500 });
  }
}
