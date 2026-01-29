import { and, eq } from "drizzle-orm";
import { db, devices, trustedDevices, leases } from "@/lib/db";
import { getClerkUserIdFromRequest, getOrCreateUserByClerkId } from "@/lib/controlPlane";

// DELETE - Unregister a device completely (removes from devices, trusted, and revokes any active lease)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { deviceId } = await params;
  const userRecord = await getOrCreateUserByClerkId(clerkUserId);

  // Find the device by its deviceId (the UUID from the desktop app)
  const device = await db.query.devices.findFirst({
    where: and(
      eq(devices.userId, userRecord.id),
      eq(devices.deviceId, deviceId)
    ),
  });

  if (!device) {
    return new Response("Device not found", { status: 404 });
  }

  // Revoke any active lease on this device
  await db
    .update(leases)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(
      and(
        eq(leases.deviceId, device.id),
        eq(leases.status, "active")
      )
    );

  // Remove from trusted devices
  await db
    .delete(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userRecord.id),
        eq(trustedDevices.deviceId, device.id)
      )
    );

  // Delete the device itself
  await db
    .delete(devices)
    .where(eq(devices.id, device.id));

  return Response.json({
    ok: true,
    message: "Device unregistered successfully",
  });
}
