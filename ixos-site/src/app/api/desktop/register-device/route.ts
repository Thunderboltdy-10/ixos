import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, devices } from "@/lib/db";
import { getClerkUserIdFromRequest, getOrCreateUserByClerkId } from "@/lib/controlPlane";
import { getResend, getResendFromAddress } from "@/lib/email/resend";
import { NewDeviceLoginEmail } from "@/lib/email/templates/new-device-login";

const bodySchema = z.object({
  deviceId: z.string().min(8),
  deviceLabel: z.string().min(2),
  devicePublicKey: z.string().optional(),
});

export async function POST(req: Request) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { deviceId, deviceLabel, devicePublicKey } = parsed.data;
  const userRecord = await getOrCreateUserByClerkId(clerkUserId);

  const existing = await db.query.devices.findFirst({
    where: eq(devices.deviceId, deviceId),
  });

  if (existing && existing.userId !== userRecord.id) {
    return new Response("Device already registered to another user", {
      status: 409,
    });
  }

  if (existing) {
    await db
      .update(devices)
      .set({
        deviceLabel,
        devicePublicKey: devicePublicKey ?? existing.devicePublicKey,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(devices.id, existing.id));
    return Response.json({
      success: true,
      device: {
        id: existing.id,
        deviceId: existing.deviceId,
        deviceLabel,
      },
    });
  }

  const [created] = await db
    .insert(devices)
    .values({
      userId: userRecord.id,
      deviceId,
      deviceLabel,
      devicePublicKey: devicePublicKey ?? null,
      lastSeenAt: new Date(),
    })
    .returning();

  // Send new device login notification email
  const resend = getResend();
  if (resend && userRecord.email) {
    const siteUrl = process.env.IXOS_SITE_URL || "https://ixos.app";
    try {
      await resend.emails.send({
        from: getResendFromAddress(),
        to: userRecord.email,
        subject: "New device signed in to Ixos",
        react: NewDeviceLoginEmail({
          deviceLabel,
          loginTime: new Date().toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          accountUrl: `${siteUrl}/account`,
        }),
      });
    } catch (error) {
      // Log but don't fail the request if email fails
      console.error("Failed to send new device login email:", error);
    }
  }

  return Response.json({
    success: true,
    device: {
      id: created?.id,
      deviceId,
      deviceLabel,
    },
  });
}
