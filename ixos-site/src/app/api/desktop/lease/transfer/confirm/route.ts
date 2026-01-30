import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, devices, leases, leaseTransfers, trustedDevices } from "@/lib/db";
import {
  getActivePlanForUser,
  getClerkUserIdFromRequest,
  getOrCreateUserByClerkId,
  issueEntitlementToken,
} from "@/lib/controlPlane";
import { normalizeTransferCode } from "@/lib/transferCode";

const LEASE_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

const bodySchema = z.object({
  deviceId: z.string().min(8),
  code: z.string().min(4),
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

  const { deviceId, code } = parsed.data;
  const userRecord = await getOrCreateUserByClerkId(clerkUserId);
  const plan = await getActivePlanForUser(userRecord.id);

  if (plan !== "pro") {
    return new Response("Pro subscription required", { status: 403 });
  }

  const device = await db.query.devices.findFirst({
    where: and(eq(devices.userId, userRecord.id), eq(devices.deviceId, deviceId)),
  });
  if (!device) {
    return new Response("Device not registered", { status: 404 });
  }

  const token = normalizeTransferCode(code);
  const transfer = await db.query.leaseTransfers.findFirst({
    where: and(
      eq(leaseTransfers.userId, userRecord.id),
      eq(leaseTransfers.token, token)
    ),
  });

  if (!transfer) {
    return new Response("Transfer request not found", { status: 404 });
  }

  if (transfer.status !== "pending") {
    // If approved and matching this device, try to return current active lease
    if (transfer.status === "approved" && transfer.toDeviceId === device.id) {
      const activeLease = await db.query.leases.findFirst({
        where: and(
          eq(leases.userId, userRecord.id),
          eq(leases.deviceId, device.id),
          eq(leases.status, "active")
        ),
      });

      if (activeLease) {
        const tokenJwt = await issueEntitlementToken({
          clerkUserId,
          deviceId,
          plan,
          features: [],
        });
        return Response.json({
          plan,
          lease: {
            status: "active",
            expiresAt: activeLease.expiresAt.toISOString(),
          },
          token: tokenJwt,
        });
      }
    }

    return Response.json({ message: "Transfer already processed" }, { status: 200 });
  }

  if (transfer.expiresAt && transfer.expiresAt.getTime() < Date.now()) {
    await db
      .update(leaseTransfers)
      .set({ status: "expired" })
      .where(eq(leaseTransfers.id, transfer.id));
    return new Response("Transfer code expired", { status: 410 });
  }

  if (transfer.toDeviceId !== device.id) {
    return new Response("Transfer code not valid for this device", { status: 403 });
  }

  const now = new Date();

  await db
    .update(leases)
    .set({ status: "revoked", revokedAt: now })
    .where(and(eq(leases.userId, userRecord.id), eq(leases.status, "active")));

  const newExpiresAt = new Date(Date.now() + LEASE_DURATION_MS);
  await db.insert(leases).values({
    userId: userRecord.id,
    deviceId: device.id,
    status: "active",
    issuedAt: now,
    expiresAt: newExpiresAt,
  });

  await db
    .insert(trustedDevices)
    .values({
      userId: userRecord.id,
      deviceId: device.id,
      trustedAt: now,
    })
    .onConflictDoNothing();

  await db
    .update(leaseTransfers)
    .set({ status: "approved", approvedAt: now })
    .where(eq(leaseTransfers.id, transfer.id));

  const tokenJwt = await issueEntitlementToken({
    clerkUserId,
    deviceId,
    plan,
    features: [],
  });

  return Response.json({
    plan,
    lease: {
      status: "active",
      expiresAt: newExpiresAt.toISOString(),
    },
    token: tokenJwt,
  });
}
