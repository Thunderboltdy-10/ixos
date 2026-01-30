import * as React from "react";
import { EmailLayout } from "@/lib/email/templates/layout";

type SupportContactEmailProps = {
  name: string;
  email: string;
  topic: string;
  message: string;
  ip: string;
  userAgent: string;
};

export function SupportContactEmail({
  name,
  email,
  topic,
  message,
  ip,
  userAgent,
}: SupportContactEmailProps) {
  return (
    <EmailLayout
      accent="amber"
      title="New support request"
      subtitle="A user just submitted a support message."
      footer={<>{"Ixos Support Desk"}</>}
    >
      <div
        style={{
          backgroundColor: "#131315",
          borderRadius: "10px",
          border: "1px solid #1F1F23",
          padding: "16px",
          marginBottom: "18px",
        }}
      >
        <div style={{ fontSize: "12px", color: "#A1A1A6", marginBottom: "6px" }}>
          Name
        </div>
        <div style={{ fontSize: "14px", color: "#E5E5E7", marginBottom: "12px" }}>
          {name}
        </div>
        <div style={{ fontSize: "12px", color: "#A1A1A6", marginBottom: "6px" }}>
          Email
        </div>
        <div style={{ fontSize: "14px", color: "#E5E5E7", marginBottom: "12px" }}>
          {email}
        </div>
        <div style={{ fontSize: "12px", color: "#A1A1A6", marginBottom: "6px" }}>
          Topic
        </div>
        <div style={{ fontSize: "14px", color: "#E5E5E7" }}>{topic}</div>
      </div>

      <div
        style={{
          backgroundColor: "#0D0E12",
          borderRadius: "10px",
          border: "1px solid #1F1F23",
          padding: "16px",
          marginBottom: "18px",
          color: "#E5E5E7",
          lineHeight: "1.7",
          whiteSpace: "pre-wrap",
        }}
      >
        {message}
      </div>

      <div style={{ fontSize: "12px", color: "#6B6B70" }}>
        IP: {ip} · User Agent: {userAgent}
      </div>
    </EmailLayout>
  );
}
