import { eq, and, gt } from "drizzle-orm";
import { db, leaseTransfers } from "@/lib/db";
import { getClerkUserIdFromRequest, getOrCreateUserByClerkId } from "@/lib/controlPlane";

/**
 * GET /api/desktop/lease/transfer/status
 * 
 * Returns the pending or active transfer status for the authenticated user.
 * Useful for desktop app to show "Transfer pending approval" UI state.
 */
export async function GET(req: Request) {
  const clerkUserId = await getClerkUserIdFromRequest(req);
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userRecord = await getOrCreateUserByClerkId(clerkUserId);
  const now = new Date();

  // Find active or pending transfers
  const activeTransfer = await db.query.leaseTransfers.findFirst({
    where: and(
      eq(leaseTransfers.userId, userRecord.id),
      gt(leaseTransfers.expiresAt, now)
    ),
    orderBy: (t) => t.requestedAt,
  });

  if (!activeTransfer) {
    return Response.json({
      hasActiveTransfer: false,
      transfer: null,
    });
  }

  return Response.json({
    hasActiveTransfer: true,
    transfer: {
      status: activeTransfer.status, // "pending" | "approved" | "expired" | "cancelled"
      fromDeviceId: activeTransfer.fromDeviceId,
      toDeviceId: activeTransfer.toDeviceId,
      requestedAt: activeTransfer.requestedAt.toISOString(),
      expiresAt: activeTransfer.expiresAt.toISOString(),
      approvedAt: activeTransfer.approvedAt?.toISOString() ?? null,
    },
  });
}
