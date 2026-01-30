import { z } from "zod";
import { and, desc, eq, gt } from "drizzle-orm";
import crypto from "crypto";
import { db, devices, leases, leaseTransfers, trustedDevices } from "@/lib/db";
import {
  getActivePlanForUser,
  getClerkUserIdFromRequest,
  getOrCreateUserByClerkId,
} from "@/lib/controlPlane";
import { sendEmail } from "@/lib/email/gmail";
import React from "react";
import { DeviceTransferEmail } from "@/lib/email/templates/device-transfer";

const LEASE_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const bodySchema = z.object({
  deviceId: z.string().min(8),
  transferToken: z.string().optional(),
});

const TRANSFER_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const TRANSFER_SPAM_PREVENTION_MS = 1000 * 60 * 2; // 2 minutes - prevents rapid-fire requests
// Removed: 12-hour cooldown and 5/month limit per user request for better multi-device support

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

  // Check if device is trusted (previously approved via email)
  const isTrusted = await db.query.trustedDevices.findFirst({
    where: and(
      eq(trustedDevices.userId, userRecord.id),
      eq(trustedDevices.deviceId, targetDevice.id)
    ),
  });

  if (isTrusted) {
    // Trusted device: skip email, directly switch lease
    // Revoke existing lease
    if (activeLease) {
      await db
        .update(leases)
        .set({ status: "revoked", revokedAt: now })
        .where(eq(leases.id, activeLease.id));
    }

    // Create new lease on trusted device
    await db.insert(leases).values({
      userId: userRecord.id,
      deviceId: targetDevice.id,
      status: "active",
      issuedAt: now,
      expiresAt: new Date(Date.now() + LEASE_DURATION_MS),
    });

    return Response.json({
      ok: true,
      instant: true,
      message: "Switched to trusted device instantly",
    });
  }

  // Check for spam: prevent multiple transfer requests within 2 minutes
  const lastPendingTransfer = await db.query.leaseTransfers.findFirst({
    where: and(
      eq(leaseTransfers.userId, userRecord.id),
      eq(leaseTransfers.status, "pending")
    ),
    orderBy: desc(leaseTransfers.requestedAt),
  });

  if (
    lastPendingTransfer?.requestedAt &&
    now.getTime() - lastPendingTransfer.requestedAt.getTime() < TRANSFER_SPAM_PREVENTION_MS
  ) {
    return Response.json(
      { error: "Please wait a moment before requesting another transfer" },
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

  if (userRecord.email) {
    let currentDeviceLabel: string | null = null;
    if (activeLease?.deviceId) {
      const activeDevice = await db.query.devices.findFirst({
        where: eq(devices.id, activeLease.deviceId),
      });
      currentDeviceLabel = activeDevice?.deviceLabel ?? null;
    }

    const { renderToStaticMarkup } = await import("react-dom/server");
    const htmlContent = renderToStaticMarkup(
      React.createElement(DeviceTransferEmail, {
        approveUrl,
        revokeUrl,
        newDeviceLabel: targetDevice.deviceLabel,
        currentDeviceLabel,
        requestedAt: now.toISOString(),
      })
    );

    await sendEmail({
      to: userRecord.email,
      subject: "Approve Ixos device transfer",
      html: htmlContent,
    });
  }

  return Response.json({ ok: true, expiresAt: expiresAt.toISOString() });
}
