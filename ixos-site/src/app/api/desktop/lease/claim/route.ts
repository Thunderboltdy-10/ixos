import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import crypto from "crypto";
import { db, devices, leases } from "@/lib/db";
import {
  getActivePlanForUser,
  getClerkUserIdFromRequest,
  getOrCreateUserByClerkId,
  issueEntitlementToken,
} from "@/lib/controlPlane";

const bodySchema = z.object({
  deviceId: z.string().min(8),
});

const LEASE_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

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

  const { deviceId } = parsed.data;
  const userRecord = await getOrCreateUserByClerkId(clerkUserId);
  const plan = await getActivePlanForUser(userRecord.id);

  const device = await db.query.devices.findFirst({
    where: and(eq(devices.userId, userRecord.id), eq(devices.deviceId, deviceId)),
  });

  if (!device) {
    return new Response("Device not registered", { status: 404 });
  }

  const now = new Date();
  const activeLease = await db.query.leases.findFirst({
    where: and(
      eq(leases.userId, userRecord.id),
      eq(leases.status, "active"),
      gt(leases.expiresAt, now)
    ),
  });

  if (plan === "pro" && activeLease && activeLease.deviceId !== device.id) {
    return Response.json(
      {
        conflict: true,
        activeDeviceId: activeLease.deviceId,
        transferToken: crypto.randomUUID(),
      },
      { status: 409 }
    );
  }

  let leaseExpiresAt: Date | null = null;
  if (plan === "pro") {
    if (activeLease && activeLease.deviceId === device.id) {
      // Refresh lease on the same device
      leaseExpiresAt = new Date(Date.now() + LEASE_DURATION_MS);
      await db
        .update(leases)
        .set({
          expiresAt: leaseExpiresAt,
        })
        .where(eq(leases.id, activeLease.id));
    } else {
      leaseExpiresAt = new Date(Date.now() + LEASE_DURATION_MS);
      await db.insert(leases).values({
        userId: userRecord.id,
        deviceId: device.id,
        status: "active",
        issuedAt: now,
        expiresAt: leaseExpiresAt,
      });
    }
  }

  const token = await issueEntitlementToken({
    clerkUserId,
    deviceId,
    plan,
    features: [],
  });

  return Response.json({
    plan,
    lease: {
      status: plan === "pro" ? "active" : "none",
      expiresAt: leaseExpiresAt ? leaseExpiresAt.toISOString() : null,
    },
    token,
  });
}
