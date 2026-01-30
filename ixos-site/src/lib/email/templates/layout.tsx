import * as React from "react";

type Accent = "amber" | "teal" | "magenta" | "violet";

type AccentStyle = {
  primary: string;
  soft: string;
  border: string;
  glow: string;
};

const ACCENTS: Record<Accent, AccentStyle> = {
  amber: {
    primary: "#F6B94C",
    soft: "rgba(246, 185, 76, 0.15)",
    border: "rgba(246, 185, 76, 0.35)",
    glow: "rgba(246, 185, 76, 0.45)",
  },
  teal: {
    primary: "#14B8A6",
    soft: "rgba(20, 184, 166, 0.15)",
    border: "rgba(20, 184, 166, 0.35)",
    glow: "rgba(20, 184, 166, 0.45)",
  },
  magenta: {
    primary: "#F472B6",
    soft: "rgba(244, 114, 182, 0.15)",
    border: "rgba(244, 114, 182, 0.35)",
    glow: "rgba(244, 114, 182, 0.45)",
  },
  violet: {
    primary: "#A78BFA",
    soft: "rgba(167, 139, 250, 0.15)",
    border: "rgba(167, 139, 250, 0.35)",
    glow: "rgba(167, 139, 250, 0.45)",
  },
};

export function EmailLayout({
  accent = "teal",
  title,
  subtitle,
  children,
  footer,
}: {
  accent?: Accent;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const styles = ACCENTS[accent];

  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        backgroundColor: "#050507",
        color: "#E5E5E7",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto",
          backgroundColor: "#0A0A0B",
          borderRadius: "14px",
          border: "1px solid #1F1F23",
          overflow: "hidden",
          boxShadow: `0 16px 40px rgba(0,0,0,0.45), 0 0 40px ${styles.soft}`,
        }}
      >
        <div
          style={{
            height: "3px",
            backgroundImage: `linear-gradient(90deg, ${styles.primary}, ${styles.glow})`,
          }}
        />
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #1F1F23",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                backgroundColor: styles.primary,
                borderRadius: "8px",
                boxShadow: `0 0 18px ${styles.soft}`,
              }}
            />
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              Ixos
            </div>
          </div>
          <div style={{ marginTop: "18px" }}>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#F4F4F5",
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "14px",
                  color: "#A1A1A6",
                  lineHeight: "1.6",
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ padding: "28px 24px" }}>{children}</div>
        {footer ? (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #1F1F23",
              backgroundColor: "#0A0A0B",
              fontSize: "12px",
              color: "#6B6B70",
              textAlign: "center" as const,
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EmailButton({
  href,
  label,
  accent = "teal",
  secondary = false,
}: {
  href: string;
  label: string;
  accent?: Accent;
  secondary?: boolean;
}) {
  const styles = ACCENTS[accent];
  return (
    <a
      href={href}
      style={
        secondary
          ? {
              display: "inline-block",
              padding: "12px 22px",
              borderRadius: "8px",
              border: "1px solid #1F1F23",
              color: "#A1A1A6",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "13px",
            }
          : {
              display: "inline-block",
              padding: "12px 22px",
              borderRadius: "8px",
              backgroundColor: styles.primary,
              color: "#050507",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "13px",
              boxShadow: `0 0 16px ${styles.soft}`,
            }
      }
    >
      {label}
    </a>
  );
}

export function EmailCodeBlock({
  code,
  accent = "magenta",
}: {
  code: string;
  accent?: Accent;
}) {
  const styles = ACCENTS[accent];
  return (
    <div
      style={{
        borderRadius: "10px",
        border: `1px solid ${styles.border}`,
        backgroundColor: styles.soft,
        padding: "16px",
        textAlign: "center" as const,
        fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "20px",
        letterSpacing: "0.25em",
        color: styles.primary,
      }}
    >
      {code}
    </div>
  );
}

export function EmailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontSize: "10px",
          fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
          color: "#6B6B70",
          textTransform: "uppercase" as const,
          letterSpacing: "0.2em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "14px", marginTop: "6px", color: "#E5E5E7" }}>
        {value}
      </div>
    </div>
  );
}
