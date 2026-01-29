import { and, eq, gt } from "drizzle-orm";
import { db, devices, leases } from "@/lib/db";
import {
  getActivePlanForUser,
  getClerkUserIdFromRequest,
  getOrCreateUserByClerkId,
} from "@/lib/controlPlane";

export async function GET(req: Request) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId");
  if (!deviceId) {
    return new Response("Missing deviceId", { status: 400 });
  }

  const userRecord = await getOrCreateUserByClerkId(clerkUserId);
  const plan = await getActivePlanForUser(userRecord.id);

  const device = await db.query.devices.findFirst({
    where: and(eq(devices.userId, userRecord.id), eq(devices.deviceId, deviceId)),
  });

  if (device) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    // Only update lastSeenAt if it's older than 1 hour or null
    if (!device.lastSeenAt || device.lastSeenAt < oneHourAgo) {
      await db
        .update(devices)
        .set({ lastSeenAt: new Date(), updatedAt: new Date() })
        .where(eq(devices.id, device.id));
    }
  }

  const now = new Date();
  const activeLease = await db.query.leases.findFirst({
    where: and(
      eq(leases.userId, userRecord.id),
      eq(leases.status, "active"),
      gt(leases.expiresAt, now)
    ),
  });

  const isActiveOnDevice =
    !!activeLease && device && activeLease.deviceId === device.id;

  return Response.json({
    plan,
    features: [],
    lease: {
      status: isActiveOnDevice ? "active" : "none",
      expiresAt: isActiveOnDevice ? activeLease?.expiresAt?.toISOString() : null,
      activeDeviceId: !isActiveOnDevice ? activeLease?.deviceId ?? null : null,
    },
    ui: {
      showUpgrade: plan !== "pro",
    },
  });
}
