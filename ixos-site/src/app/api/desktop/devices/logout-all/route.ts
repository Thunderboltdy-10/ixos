import { and, eq } from "drizzle-orm";
import { db, leases, trustedDevices } from "@/lib/db";
import { getClerkUserIdFromRequest, getOrCreateUserByClerkId } from "@/lib/controlPlane";

export async function POST(req: Request) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userRecord = await getOrCreateUserByClerkId(clerkUserId);
  const now = new Date();

  await db
    .update(leases)
    .set({ status: "revoked", revokedAt: now })
    .where(and(eq(leases.userId, userRecord.id), eq(leases.status, "active")));

  await db
    .delete(trustedDevices)
    .where(eq(trustedDevices.userId, userRecord.id));

  return Response.json({ ok: true });
}
