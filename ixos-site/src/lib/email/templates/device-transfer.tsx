import * as React from "react";
import { EmailButton, EmailCodeBlock, EmailLayout } from "@/lib/email/templates/layout";

type DeviceTransferEmailProps = {
  approveUrl: string;
  approveCode: string;
  revokeUrl: string;
  newDeviceLabel: string;
  currentDeviceLabel?: string | null;
  requestedAt: string;
};

export function DeviceTransferEmail({
  approveUrl,
  approveCode,
  revokeUrl,
  newDeviceLabel,
  currentDeviceLabel,
  requestedAt,
}: DeviceTransferEmailProps) {
  return (
    <EmailLayout
      accent="magenta"
      title="Device transfer requested"
      subtitle="Approve this transfer to activate Ixos Pro on your new device."
      footer={
        <>
          If this wasn&apos;t you, revoke all devices or contact support at{" "}
          <span style={{ color: "#14B8A6" }}>support@ixos.app</span>.
        </>
      }
    >
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", color: "#A1A1A6", lineHeight: "1.7" }}>
          A request was made to transfer your Ixos Pro lease to:
          <div style={{ marginTop: "10px", fontSize: "16px", color: "#F4F4F5" }}>
            {newDeviceLabel}
          </div>
        </div>
      </div>

      {currentDeviceLabel ? (
        <div style={{ marginBottom: "20px", fontSize: "13px", color: "#A1A1A6" }}>
          Current active device:{" "}
          <span style={{ color: "#E5E5E7", fontWeight: 600 }}>
            {currentDeviceLabel}
          </span>
        </div>
      ) : null}

      <div style={{ marginBottom: "20px", fontSize: "12px", color: "#6B6B70" }}>
        Requested at {requestedAt}
      </div>

      <div style={{ marginBottom: "16px", fontSize: "13px", color: "#A1A1A6" }}>
        Enter this code in the Ixos desktop app for instant activation:
      </div>

      <EmailCodeBlock code={approveCode} accent="magenta" />

      <div style={{ marginTop: "20px", fontSize: "12px", color: "#6B6B70" }}>
        Prefer the browser flow? You can also approve via link:
      </div>

      <div style={{ marginTop: "12px" }}>
        <EmailButton href={approveUrl} label="Approve transfer" accent="magenta" />
      </div>

      <div style={{ marginTop: "18px" }}>
        <EmailButton href={revokeUrl} label="Revoke all devices" secondary />
      </div>
    </EmailLayout>
  );
}

