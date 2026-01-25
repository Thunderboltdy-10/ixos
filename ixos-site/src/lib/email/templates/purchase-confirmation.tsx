import * as React from "react";

type PurchaseConfirmationEmailProps = {
  planName: string;
  amount: string;
  billingPeriod: string;
  purchaseDate: string;
  receiptUrl?: string | null;
  accountUrl: string;
};

export function PurchaseConfirmationEmail({
  planName,
  amount,
  billingPeriod,
  purchaseDate,
  receiptUrl,
  accountUrl,
}: PurchaseConfirmationEmailProps) {
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

        {/* Success Banner */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "#F472B6",
            textAlign: "center" as const,
          }}
        >
          <div
            style={{
              fontSize: "24px",
              marginBottom: "8px",
            }}
          >
            &#x2713;
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#050507",
              margin: 0,
            }}
          >
            Welcome to Ixos Pro!
          </h1>
        </div>

        {/* Body */}
        <div style={{ padding: "32px 24px" }}>
          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#A1A1A6",
              margin: "0 0 24px 0",
            }}
          >
            Thank you for your purchase! Your Pro subscription is now active and
            ready to use.
          </p>

          {/* Order Details Card */}
          <div
            style={{
              backgroundColor: "#131315",
              borderRadius: "8px",
              border: "1px solid #1F1F23",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                fontSize: "10px",
                fontFamily: "monospace",
                color: "#6B6B70",
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                margin: "0 0 16px 0",
              }}
            >
              Order Summary
            </h3>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#A1A1A6" }}>Plan</span>
              <span
                style={{
                  fontSize: "14px",
                  color: "#F472B6",
                  fontWeight: 600,
                }}
              >
                {planName}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#A1A1A6" }}>Amount</span>
              <span
                style={{
                  fontSize: "14px",
                  color: "#E5E5E7",
                  fontFamily: "monospace",
                }}
              >
                {amount}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#A1A1A6" }}>
                Billing Period
              </span>
              <span style={{ fontSize: "14px", color: "#E5E5E7" }}>
                {billingPeriod}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "12px",
                borderTop: "1px solid #1F1F23",
              }}
            >
              <span style={{ fontSize: "14px", color: "#A1A1A6" }}>
                Purchase Date
              </span>
              <span style={{ fontSize: "14px", color: "#E5E5E7" }}>
                {purchaseDate}
              </span>
            </div>
          </div>

          {/* Pro Features */}
          <div
            style={{
              backgroundColor: "#F472B6",
              backgroundColor: "rgba(244, 114, 182, 0.1)",
              borderRadius: "8px",
              border: "1px solid rgba(244, 114, 182, 0.2)",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#F472B6",
                margin: "0 0 12px 0",
              }}
            >
              Your Pro Features
            </h3>
            <ul
              style={{
                margin: 0,
                padding: "0 0 0 16px",
                fontSize: "13px",
                color: "#A1A1A6",
                lineHeight: "1.8",
              }}
            >
              <li>File watch &amp; instant notifications</li>
              <li>Developer file types (TS, PY, RS, GO)</li>
              <li>Journalist Mode for maximum privacy</li>
              <li>Priority model updates</li>
              <li>Direct support access</li>
            </ul>
          </div>

          <div style={{ textAlign: "center" as const }}>
            <a
              href={accountUrl}
              style={{
                display: "inline-block",
                padding: "12px 24px",
                backgroundColor: "#F472B6",
                color: "#050507",
                textDecoration: "none",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "14px",
                marginRight: receiptUrl ? "12px" : "0",
              }}
            >
              Go to account
            </a>

            {receiptUrl && (
              <a
                href={receiptUrl}
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  backgroundColor: "transparent",
                  color: "#A1A1A6",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: 500,
                  fontSize: "14px",
                  border: "1px solid #1F1F23",
                }}
              >
                View receipt
              </a>
            )}
          </div>
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
            Questions? Reply to this email or visit our{" "}
            <a
              href="https://ixos.app/docs"
              style={{ color: "#14B8A6", textDecoration: "none" }}
            >
              documentation
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
