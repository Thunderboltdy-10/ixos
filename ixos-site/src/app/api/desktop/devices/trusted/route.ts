import { desc, eq } from "drizzle-orm";
import { db, devices, trustedDevices } from "@/lib/db";
import { getClerkUserIdFromRequest, getOrCreateUserByClerkId } from "@/lib/controlPlane";

export async function GET(req: Request) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userRecord = await getOrCreateUserByClerkId(clerkUserId);

  // Get all trusted devices with their details
  const trustedList = await db.query.trustedDevices.findMany({
    where: eq(trustedDevices.userId, userRecord.id),
    orderBy: desc(trustedDevices.trustedAt),
  });

  // Fetch device details for each trusted device
  const trustedWithDetails = await Promise.all(
    trustedList.map(async (trusted) => {
      const device = await db.query.devices.findFirst({
        where: eq(devices.id, trusted.deviceId),
      });
      return {
        id: trusted.id,
        deviceId: device?.deviceId ?? null,
        deviceLabel: device?.deviceLabel ?? "Unknown Device",
        trustedAt: trusted.trustedAt.toISOString(),
        lastSeenAt: device?.lastSeenAt?.toISOString() ?? null,
      };
    })
  );

  return Response.json({
    trustedDevices: trustedWithDetails,
  });
}

// DELETE - Remove all trusted devices (forget all)
export async function DELETE(req: Request) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userRecord = await getOrCreateUserByClerkId(clerkUserId);

  // Delete all trusted devices for this user
  await db
    .delete(trustedDevices)
    .where(eq(trustedDevices.userId, userRecord.id));

  return Response.json({ ok: true, message: "All devices forgotten" });
}
