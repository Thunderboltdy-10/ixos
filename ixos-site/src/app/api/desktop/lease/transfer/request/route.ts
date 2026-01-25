import { z } from "zod";
import { and, desc, eq, gt } from "drizzle-orm";
import crypto from "crypto";
import { db, devices, leases, leaseTransfers } from "@/lib/db";
import {
  getActivePlanForUser,
  getClerkUserIdFromRequest,
  getOrCreateUserByClerkId,
} from "@/lib/controlPlane";
import { getResend, getResendFromAddress } from "@/lib/email/resend";
import React from "react";
import { DeviceTransferEmail } from "@/lib/email/templates/device-transfer";

const bodySchema = z.object({
  deviceId: z.string().min(8),
  transferToken: z.string().optional(),
});

const TRANSFER_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const TRANSFER_COOLDOWN_MS = 1000 * 60 * 60 * 12;
const TRANSFER_MONTHLY_LIMIT = 5;

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

  const { deviceId, transferToken } = parsed.data;
  const userRecord = await getOrCreateUserByClerkId(clerkUserId);
  const plan = await getActivePlanForUser(userRecord.id);
  if (plan !== "pro") {
    return new Response("Pro subscription required", { status: 403 });
  }

  const targetDevice = await db.query.devices.findFirst({
    where: and(eq(devices.userId, userRecord.id), eq(devices.deviceId, deviceId)),
  });
  if (!targetDevice) {
    return new Response("Device not registered", { status: 404 });
  }

  const now = new Date();
  const activeLease = await db.query.leases.findFirst({
    where: and(
      eq(leases.userId, userRecord.id),
      eq(leases.status, "active"),
      gt(leases.expiresAt, now)
    ),
  });

  if (activeLease && activeLease.deviceId === targetDevice.id) {
    return Response.json({
      ok: true,
      message: "Device already active",
    });
  }

  const lastApproved = await db.query.leaseTransfers.findFirst({
    where: and(
      eq(leaseTransfers.userId, userRecord.id),
      eq(leaseTransfers.status, "approved")
    ),
    orderBy: desc(leaseTransfers.approvedAt),
  });

  if (
    lastApproved?.approvedAt &&
    now.getTime() - lastApproved.approvedAt.getTime() < TRANSFER_COOLDOWN_MS
  ) {
    return Response.json(
      { error: "Transfer cooldown active" },
      { status: 429 }
    );
  }

  const monthAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
  const approvedTransfers = await db.query.leaseTransfers.findMany({
    where: and(
      eq(leaseTransfers.userId, userRecord.id),
      eq(leaseTransfers.status, "approved"),
      gt(leaseTransfers.approvedAt, monthAgo)
    ),
  });
  if (approvedTransfers.length >= TRANSFER_MONTHLY_LIMIT) {
    return Response.json(
      { error: "Transfer limit exceeded" },
      { status: 429 }
    );
  }

  const token = transferToken ?? crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TRANSFER_TOKEN_TTL_MS);

  await db.insert(leaseTransfers).values({
    userId: userRecord.id,
    fromDeviceId: activeLease?.deviceId ?? null,
    toDeviceId: targetDevice.id,
    token,
    status: "pending",
    requestedAt: now,
    expiresAt,
  });

  const baseUrl =
    process.env.IXOS_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const approveUrl = `${baseUrl}/api/desktop/lease/transfer/approve?token=${token}`;
  const revokeUrl =
    process.env.IXOS_SUPPORT_REVOKE_URL ||
    "mailto:support@ixos.app?subject=Revoke%20Ixos%20devices";

  const resend = getResend();
  if (resend) {
    let currentDeviceLabel: string | null = null;
    if (activeLease?.deviceId) {
      const activeDevice = await db.query.devices.findFirst({
        where: eq(devices.id, activeLease.deviceId),
      });
      currentDeviceLabel = activeDevice?.deviceLabel ?? null;
    }

    const email = React.createElement(DeviceTransferEmail, {
      approveUrl,
      revokeUrl,
      newDeviceLabel: targetDevice.deviceLabel,
      currentDeviceLabel,
      requestedAt: now.toISOString(),
    });

    await resend.emails.send({
      from: getResendFromAddress(),
      to: userRecord.email,
      subject: "Approve Ixos device transfer",
      react: email,
    });
  }

  return Response.json({ ok: true, expiresAt: expiresAt.toISOString() });
}
