import * as React from "react";

type DeviceTransferEmailProps = {
  approveUrl: string;
  revokeUrl: string;
  newDeviceLabel: string;
  currentDeviceLabel?: string | null;
  requestedAt: string;
};

export function DeviceTransferEmail({
  approveUrl,
  revokeUrl,
  newDeviceLabel,
  currentDeviceLabel,
  requestedAt,
}: DeviceTransferEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111827" }}>
      <h2 style={{ marginBottom: "12px" }}>Approve Ixos device transfer</h2>
      <p style={{ marginBottom: "16px" }}>
        A request was made to transfer your Ixos Pro lease to:
        <strong> {newDeviceLabel}</strong>
      </p>
      {currentDeviceLabel ? (
        <p style={{ marginBottom: "16px" }}>
          Current active device: <strong>{currentDeviceLabel}</strong>
        </p>
      ) : null}
      <p style={{ marginBottom: "24px" }}>Requested at: {requestedAt}</p>
      <a
        href={approveUrl}
        style={{
          display: "inline-block",
          padding: "12px 20px",
          backgroundColor: "#F472B6",
          color: "#050507",
          textDecoration: "none",
          borderRadius: "6px",
          fontWeight: 700,
        }}
      >
        Approve transfer
      </a>
      <p style={{ marginTop: "20px", fontSize: "14px", color: "#6B7280" }}>
        If this wasn&apos;t you, revoke all devices:
        <a href={revokeUrl} style={{ marginLeft: "6px" }}>
          Revoke devices
        </a>
      </p>
    </div>
  );
}

