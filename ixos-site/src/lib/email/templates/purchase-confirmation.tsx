import * as React from "react";
import { EmailButton, EmailLayout } from "@/lib/email/templates/layout";

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
    <EmailLayout
      accent="magenta"
      title="Welcome to Ixos Pro!"
      subtitle="Your Pro subscription is now active and ready to use."
      footer={
        <>
          Questions? Reply to this email or visit our{" "}
          <a href="https://ixos.app/docs" style={{ color: "#14B8A6", textDecoration: "none" }}>
            documentation
          </a>
          .
        </>
      }
    >
      <div
        style={{
          backgroundColor: "#131315",
          borderRadius: "10px",
          border: "1px solid #1F1F23",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
            color: "#6B6B70",
            textTransform: "uppercase" as const,
            letterSpacing: "0.2em",
            marginBottom: "16px",
          }}
        >
          Order Summary
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px", color: "#A1A1A6" }}>Plan</span>
          <span style={{ fontSize: "14px", color: "#F472B6", fontWeight: 600 }}>
            {planName}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px", color: "#A1A1A6" }}>Amount</span>
          <span style={{ fontSize: "14px", color: "#E5E5E7", fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {amount}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px", color: "#A1A1A6" }}>Billing Period</span>
          <span style={{ fontSize: "14px", color: "#E5E5E7" }}>{billingPeriod}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #1F1F23" }}>
          <span style={{ fontSize: "14px", color: "#A1A1A6" }}>Purchase Date</span>
          <span style={{ fontSize: "14px", color: "#E5E5E7" }}>{purchaseDate}</span>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "rgba(244, 114, 182, 0.08)",
          borderRadius: "10px",
          border: "1px solid rgba(244, 114, 182, 0.2)",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#F472B6", marginBottom: "12px" }}>
          Your Pro Features
        </div>
        <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "13px", color: "#A1A1A6", lineHeight: "1.8" }}>
          <li>File watch &amp; instant notifications</li>
          <li>Developer file types (TS, PY, RS, GO)</li>
          <li>Deep Search Mode for maximum coverage</li>
          <li>Priority model updates</li>
          <li>Direct support access</li>
        </ul>
      </div>

      <div style={{ textAlign: "center" as const }}>
        <EmailButton href={accountUrl} label="Go to account" accent="magenta" />
        {receiptUrl && (
          <span style={{ marginLeft: "12px" }}>
            <EmailButton href={receiptUrl} label="View receipt" secondary />
          </span>
        )}
      </div>
    </EmailLayout>
  );
}
