import { eq, and } from "drizzle-orm";
import { db, leases, leaseTransfers, trustedDevices } from "@/lib/db";

const LEASE_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

async function handleApprove(token: string | null) {
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const transfer = await db.query.leaseTransfers.findFirst({
    where: eq(leaseTransfers.token, token),
  });
  if (!transfer) {
    return new Response("Transfer request not found", { status: 404 });
  }

  const now = new Date();
  if (transfer.status !== "pending") {
    return new Response("Transfer already processed", { status: 200 });
  }

  if (transfer.expiresAt && transfer.expiresAt.getTime() < now.getTime()) {
    await db
      .update(leaseTransfers)
      .set({ status: "expired" })
      .where(eq(leaseTransfers.id, transfer.id));
    return new Response("Transfer link expired", { status: 410 });
  }

  await db
    .update(leases)
    .set({ status: "revoked", revokedAt: now })
    .where(
      and(eq(leases.userId, transfer.userId), eq(leases.status, "active"))
    );

  await db.insert(leases).values({
    userId: transfer.userId,
    deviceId: transfer.toDeviceId,
    status: "active",
    issuedAt: now,
    expiresAt: new Date(Date.now() + LEASE_DURATION_MS),
  });

  // Mark device as trusted for future instant transfers (no email needed)
  await db.insert(trustedDevices).values({
    userId: transfer.userId,
    deviceId: transfer.toDeviceId,
    trustedAt: now,
  }).onConflictDoNothing();

  await db
    .update(leaseTransfers)
    .set({ status: "approved", approvedAt: now })
    .where(eq(leaseTransfers.id, transfer.id));

  return new Response(
    "Transfer approved. You can reopen Ixos and refresh your entitlement.",
    { status: 200 }
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  return handleApprove(token);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = body?.token ?? null;
  return handleApprove(token);
}

