import { and, eq } from "drizzle-orm";
import { db, devices, leases } from "@/lib/db";
import { getClerkUserIdFromRequest, getOrCreateUserByClerkId } from "@/lib/controlPlane";

// POST - Revoke active lease for a specific device (log it out)
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

  const device = await db.query.devices.findFirst({
    where: and(
      eq(devices.userId, userRecord.id),
      eq(devices.deviceId, deviceId)
    ),
  });

  if (!device) {
    return new Response("Device not found", { status: 404 });
  }

  await db
    .update(leases)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(leases.deviceId, device.id), eq(leases.status, "active")));

  return Response.json({ ok: true, message: "Device logged out" });
}
