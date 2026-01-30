import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import crypto from "crypto";
import { db, devices, leases, leaseTransfers, trustedDevices } from "@/lib/db";
import {
  getActivePlanForUser,
  getClerkUserIdFromRequest,
  getOrCreateUserByClerkId,
  issueEntitlementToken,
} from "@/lib/controlPlane";
import { sendEmail } from "@/lib/email/gmail";
import React from "react";
import { DeviceTransferEmail } from "@/lib/email/templates/device-transfer";

const bodySchema = z.object({
  deviceId: z.string().min(8),
});

const LEASE_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const TRANSFER_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

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

  const { deviceId } = parsed.data;
  const userRecord = await getOrCreateUserByClerkId(clerkUserId);
  const plan = await getActivePlanForUser(userRecord.id);

  const device = await db.query.devices.findFirst({
    where: and(eq(devices.userId, userRecord.id), eq(devices.deviceId, deviceId)),
  });
  if (!device) {
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

  // Trusted device auto-switch (skip email approval)
  if (plan === "pro" && activeLease && activeLease.deviceId !== device.id) {
    const trustedDevice = await db.query.trustedDevices.findFirst({
      where: and(
        eq(trustedDevices.userId, userRecord.id),
        eq(trustedDevices.deviceId, device.id)
      ),
    });

    if (trustedDevice) {
      await db
        .update(leases)
        .set({ status: "revoked", revokedAt: now })
        .where(eq(leases.id, activeLease.id));

      const newExpiresAt = new Date(Date.now() + LEASE_DURATION_MS);
      await db.insert(leases).values({
        userId: userRecord.id,
        deviceId: device.id,
        status: "active",
        issuedAt: now,
        expiresAt: newExpiresAt,
      });

      const token = await issueEntitlementToken({
        clerkUserId,
        deviceId,
        plan,
        features: [],
      });

      return Response.json({
        plan,
        lease: {
          status: "active",
          expiresAt: newExpiresAt.toISOString(),
        },
        token,
        autoTransferred: true,
      });
    }
  }

  // SMART MULTI-DEVICE DETECTION & TRANSFER FLOW
  if (plan === "pro" && activeLease && activeLease.deviceId !== device.id) {
    // Conflict: same user logging in from a different device
    console.log(
      `[Lease] Device conflict detected: User ${clerkUserId} attempting login from device ${device.id} while ${activeLease.deviceId} has active lease`
    );

    // Check if there's already a pending transfer for this user
    const existingPendingTransfer = await db.query.leaseTransfers.findFirst({
      where: and(
        eq(leaseTransfers.userId, userRecord.id),
        eq(leaseTransfers.status, "pending"),
        gt(leaseTransfers.expiresAt, now)
      ),
    });

    if (!existingPendingTransfer) {
      // Auto-trigger transfer request
      console.log(
        `[Lease] Auto-triggering device transfer for user ${clerkUserId}`
      );

      const token = crypto.randomUUID();
      const transferExpiresAt = new Date(Date.now() + TRANSFER_TOKEN_TTL_MS);

      await db.insert(leaseTransfers).values({
        userId: userRecord.id,
        fromDeviceId: activeLease.deviceId,
        toDeviceId: device.id,
        token,
        status: "pending",
        requestedAt: now,
        expiresAt: transferExpiresAt,
      });

      // Send transfer approval email
      const baseUrl =
        process.env.IXOS_SITE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "http://localhost:3000";
      const approveUrl = `${baseUrl}/api/desktop/lease/transfer/approve?token=${token}`;
      const revokeUrl =
        process.env.IXOS_SUPPORT_REVOKE_URL ||
        "mailto:support@ixos.app?subject=Revoke%20Ixos%20devices";

      if (userRecord.email) {
        const oldDevice = await db.query.devices.findFirst({
          where: eq(devices.id, activeLease.deviceId),
        });

        const { renderToStaticMarkup } = await import("react-dom/server");
        const htmlContent = renderToStaticMarkup(
          React.createElement(DeviceTransferEmail, {
            approveUrl,
            revokeUrl,
            newDeviceLabel: device.deviceLabel,
            currentDeviceLabel: oldDevice?.deviceLabel ?? null,
            requestedAt: now.toISOString(),
          })
        );

        await sendEmail({
          to: userRecord.email,
          subject: "Approve Ixos device transfer",
          html: htmlContent,
        });
      }

      return Response.json(
        {
          conflict: true,
          activeDeviceId: activeLease.deviceId,
          transferPending: true,
          transferToken: token,
          transferExpiresAt: transferExpiresAt.toISOString(),
          message:
            "Device conflict detected. Check your email to approve the transfer to this device.",
        },
        { status: 409 }
      );
    } else {
      // Transfer already pending
      return Response.json(
        {
          conflict: true,
          activeDeviceId: activeLease.deviceId,
          transferPending: true,
          transferExpiresAt: existingPendingTransfer.expiresAt.toISOString(),
          message:
            "A transfer is already pending approval. Check your email to complete the transfer.",
        },
        { status: 409 }
      );
    }
  }

  // No conflict or free plan: proceed normally
  let leaseExpiresAt: Date | null = null;
  if (plan === "pro") {
    leaseExpiresAt = new Date(Date.now() + LEASE_DURATION_MS);
    if (activeLease && activeLease.deviceId === device.id) {
      // Refresh existing lease
      await db
        .update(leases)
        .set({ expiresAt: leaseExpiresAt })
        .where(eq(leases.id, activeLease.id));
    } else {
      // Create new lease (no existing lease or free plan user upgrading)
      await db.insert(leases).values({
        userId: userRecord.id,
        deviceId: device.id,
        status: "active",
        issuedAt: now,
        expiresAt: leaseExpiresAt,
      });
    }
  }

  const token = await issueEntitlementToken({
    clerkUserId,
    deviceId,
    plan,
    features: [],
  });

  return Response.json({
    plan,
    lease: {
      status: plan === "pro" ? "active" : "none",
      expiresAt: leaseExpiresAt ? leaseExpiresAt.toISOString() : null,
    },
    token,
  });
}
