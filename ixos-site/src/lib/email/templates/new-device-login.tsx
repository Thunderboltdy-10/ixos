import * as React from "react";

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
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "#050507",
        color: "#E5E5E7",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          backgroundColor: "#0A0A0B",
          borderRadius: "12px",
          border: "1px solid #1F1F23",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #1F1F23",
            textAlign: "center" as const,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "#F59E0B",
                borderRadius: "6px",
              }}
            />
            <span
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#E5E5E7",
              }}
            >
              Ixos
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "32px 24px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#E5E5E7",
              margin: "0 0 16px 0",
            }}
          >
            New device sign-in
          </h2>

          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#A1A1A6",
              margin: "0 0 24px 0",
            }}
          >
            We noticed a new sign-in to your Ixos account. If this was you, no
            action is needed.
          </p>

          {/* Device Info Card */}
          <div
            style={{
              backgroundColor: "#131315",
              borderRadius: "8px",
              border: "1px solid #1F1F23",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "monospace",
                  color: "#6B6B70",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                Device
              </span>
              <div
                style={{
                  fontSize: "14px",
                  color: "#E5E5E7",
                  fontWeight: 500,
                  marginTop: "4px",
                }}
              >
                {deviceLabel}
              </div>
            </div>

            <div style={{ marginBottom: ipAddress ? "12px" : "0" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "monospace",
                  color: "#6B6B70",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                Time
              </span>
              <div
                style={{
                  fontSize: "14px",
                  color: "#E5E5E7",
                  marginTop: "4px",
                }}
              >
                {loginTime}
              </div>
            </div>

            {ipAddress && (
              <div>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "monospace",
                    color: "#6B6B70",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.1em",
                  }}
                >
                  IP Address
                </span>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#E5E5E7",
                    fontFamily: "monospace",
                    marginTop: "4px",
                  }}
                >
                  {ipAddress}
                </div>
              </div>
            )}
          </div>

          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#A1A1A6",
              margin: "0 0 24px 0",
            }}
          >
            If this wasn&apos;t you, please secure your account immediately by
            changing your password.
          </p>

          <a
            href={accountUrl}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#14B8A6",
              color: "#050507",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Review devices
          </a>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #1F1F23",
            backgroundColor: "#0A0A0B",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "#6B6B70",
              margin: 0,
              textAlign: "center" as const,
            }}
          >
            This is an automated security notification from Ixos.
          </p>
        </div>
      </div>
    </div>
  );
}
