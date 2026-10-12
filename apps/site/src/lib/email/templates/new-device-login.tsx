import * as React from "react";
import { EmailButton, EmailLayout } from "@/lib/email/templates/layout";

type NewDeviceLoginEmailProps = {
  deviceLabel: string;
  loginTime: string;
  ipAddress?: string | null;
  accountUrl: string;
};

export function NewDeviceLoginEmail({
  deviceLabel,
  loginTime,
  ipAddress,
  accountUrl,
}: NewDeviceLoginEmailProps) {
  return (
    <EmailLayout
      accent="teal"
      title="New device sign-in"
      subtitle="We noticed a new sign-in to your Ixos account. If this was you, no action is needed."
      footer={
        <>This is an automated security notification from Ixos.</>
      }
    >
      <div
        style={{
          backgroundColor: "#131315",
          borderRadius: "10px",
          border: "1px solid #1F1F23",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              fontSize: "10px",
              fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
              color: "#6B6B70",
              textTransform: "uppercase" as const,
              letterSpacing: "0.2em",
            }}
          >
            Device
          </div>
          <div style={{ fontSize: "14px", color: "#E5E5E7", marginTop: "6px" }}>
            {deviceLabel}
          </div>
        </div>

        <div style={{ marginBottom: ipAddress ? "12px" : "0" }}>
          <div
            style={{
              fontSize: "10px",
              fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
              color: "#6B6B70",
              textTransform: "uppercase" as const,
              letterSpacing: "0.2em",
            }}
          >
            Time
          </div>
          <div style={{ fontSize: "14px", color: "#E5E5E7", marginTop: "6px" }}>
            {loginTime}
          </div>
        </div>

        {ipAddress && (
          <div>
            <div
              style={{
                fontSize: "10px",
                fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "#6B6B70",
                textTransform: "uppercase" as const,
                letterSpacing: "0.2em",
              }}
            >
              IP Address
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#E5E5E7",
                fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
                marginTop: "6px",
              }}
            >
              {ipAddress}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: "13px", color: "#A1A1A6", marginBottom: "20px" }}>
        If this wasn&apos;t you, please secure your account immediately by changing your password.
      </div>

      <EmailButton href={accountUrl} label="Review devices" accent="teal" />
    </EmailLayout>
  );
}
