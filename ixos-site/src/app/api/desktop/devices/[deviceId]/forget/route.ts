import { and, eq } from "drizzle-orm";
import { db, devices, trustedDevices } from "@/lib/db";
import { getClerkUserIdFromRequest, getOrCreateUserByClerkId } from "@/lib/controlPlane";

// POST - Remove a device from trusted list (it will require email approval next time)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { deviceId } = await params;
  const userRecord = await getOrCreateUserByClerkId(clerkUserId);

  // Find the device by its deviceId (the UUID from the desktop app, not our internal ID)
  const device = await db.query.devices.findFirst({
    where: and(
      eq(devices.userId, userRecord.id),
      eq(devices.deviceId, deviceId)
    ),
  });

  if (!device) {
    return new Response("Device not found", { status: 404 });
  }

  // Remove from trusted devices
  const result = await db
    .delete(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userRecord.id),
        eq(trustedDevices.deviceId, device.id)
      )
    );

  return Response.json({
    ok: true,
    message: "Device forgotten. Email approval will be required for next transfer.",
  });
}
