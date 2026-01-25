import { desc, eq } from "drizzle-orm";
import { db, devices } from "@/lib/db";
import { getClerkUserIdFromRequest, getOrCreateUserByClerkId } from "@/lib/controlPlane";

export async function GET(req: Request) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userRecord = await getOrCreateUserByClerkId(clerkUserId);
  const list = await db.query.devices.findMany({
    where: eq(devices.userId, userRecord.id),
    orderBy: desc(devices.updatedAt),
  });

  return Response.json({
    devices: list.map((device) => ({
      id: device.id,
      deviceId: device.deviceId,
      deviceLabel: device.deviceLabel,
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
      updatedAt: device.updatedAt?.toISOString() ?? null,
    })),
  });
}
