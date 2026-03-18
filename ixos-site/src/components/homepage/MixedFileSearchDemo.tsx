"use client";

const SIDEBAR_BG = "#0B0E12";
const MAIN_BG = "#0E1218";
const PANEL_BG = "#111620";
const BORDER = "rgba(255,255,255,0.06)";

const FILE_ICONS: Record<string, { color: string; label: string }> = {
  xlsx: { color: "#22C55E", label: "XL" },
  md: { color: "#60A5FA", label: "MD" },
  pdf: { color: "#EF4444", label: "PDF" },
  ts: { color: "#3B82F6", label: "TS" },
  docx: { color: "#818CF8", label: "DX" },
};

function FileIcon({ ext }: { ext: string }) {
  const icon = FILE_ICONS[ext] ?? { color: "#9CA3AF", label: "?" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        fontSize: 7,
        fontWeight: 700,
        letterSpacing: "0.02em",
        color: icon.color,
        background: `${icon.color}18`,
        border: `1px solid ${icon.color}30`,
        flexShrink: 0,
      }}
    >
      {icon.label}
    </span>
  );
}

const HERO_RESULTS = [
  {
    name: "Q3-budget.xlsx",
    ext: "xlsx",
    short: "finance/Q3-budget.xlsx",
    snippet: "Revenue projections Q3 — updated forecast with regional breakdown",
    score: "93.1%",
  },
  {
    name: "project-notes.md",
    ext: "md",
    short: "work/project-notes.md",
    snippet: "Budget allocation notes — quarterly targets and variance analysis",
    score: "89.7%",
  },
  {
    name: "meeting-2025-03.pdf",
    ext: "pdf",
    short: "meetings/meeting-2025-03.pdf",
    snippet: "March planning session — budget review and projection updates",
    score: "85.2%",
  },
  {
    name: "config/auth.ts",
    ext: "ts",
    short: "config/auth.ts",
    snippet: "/// Budget API authentication and rate-limit configuration",
    score: "78.4%",
  },
  {
    name: "research-summary.docx",
    ext: "docx",
    short: "docs/research-summary.docx",
    snippet: "Market research summary with budget impact assessment",
    score: "74.0%",
  },
];

export function MixedFileSearchDemo() {
  return (
    <div
      className="w-full h-full font-mono flex overflow-hidden"
      style={{ background: MAIN_BG, color: "#E6EDF3", fontSize: 12 }}
    >
      {/* Left Sidebar */}
      <div
        className="hidden md:flex"
        style={{
          width: 188,
          flexShrink: 0,
          background: SIDEBAR_BG,
          borderRight: `1px solid ${BORDER}`,
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Logo + New */}
        <div
          style={{
            padding: "11px 14px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                background: "#14B8A6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 900,
                color: "#0A0D0F",
              }}
            >
              ✕
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F3F5F7" }}>
              Ixos
            </span>
          </div>
          <div
            style={{
              padding: "3px 8px",
              fontSize: 10,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${BORDER}`,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            + New
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: "6px 0" }}>
          {[
            { label: "Search", icon: "⌕", active: true, pro: false },
            { label: "Today", icon: "◷", active: false, pro: true },
            { label: "Workstreams", icon: "⋮", active: false, pro: true },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "7px 14px",
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: item.active
                  ? "rgba(20,184,166,0.09)"
                  : "transparent",
                borderLeft: item.active
                  ? "2px solid #14B8A6"
                  : "2px solid transparent",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: item.active ? "#14B8A6" : "rgba(255,255,255,0.35)",
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: item.active ? "#14B8A6" : "rgba(255,255,255,0.45)",
                }}
              >
                {item.label}
              </span>
              {item.pro && (
                <span
                  style={{
                    fontSize: 7,
                    padding: "1px 5px",
                    background: "rgba(246,185,76,0.15)",
                    color: "#F6B94C",
                    border: "1px solid rgba(246,185,76,0.25)",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  PRO
                </span>
              )}
            </div>
          ))}
        </div>

        {/* History */}
        <div
          style={{
            borderTop: `1px solid ${BORDER}`,
            padding: "10px 0",
            flex: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0 14px 8px",
              display: "flex",
              gap: 12,
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.65)",
                borderBottom: "1px solid rgba(255,255,255,0.3)",
                paddingBottom: 2,
              }}
            >
              Recent
            </span>
            <span>Starred</span>
          </div>
          {[
            { q: "quarterly budget projections", n: 5, t: "2m" },
            { q: "team meeting notes", n: 12, t: "3h" },
          ].map((item, i) => (
            <div
              key={item.q}
              style={{
                padding: "7px 14px",
                borderBottom: `1px solid ${BORDER}`,
                background:
                  i === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: 2,
                }}
              >
                {item.q}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>
                {item.n} results · {item.t}
              </div>
            </div>
          ))}
        </div>

        {/* User */}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#7C5CFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              P
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.7)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Pablo Martinez Dovale
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "#F6B94C",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                PRO
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Search + Results */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          borderRight: `1px solid ${BORDER}`,
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            padding: "9px 16px",
            borderBottom: `1px solid ${BORDER}`,
            fontSize: 11,
            color: "rgba(255,255,255,0.28)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>Ixos</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Search</span>
        </div>

        {/* Search input */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              border: "1px solid rgba(20,184,166,0.35)",
              background: "rgba(20,184,166,0.03)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                style={{ opacity: 0.45, flexShrink: 0 }}
              >
                <circle
                  cx="5.5"
                  cy="5.5"
                  r="4.5"
                  stroke="#14B8A6"
                  strokeWidth="1.2"
                />
                <path
                  d="M9 9l2.5 2.5"
                  stroke="#14B8A6"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.88)",
                  flex: 1,
                }}
              >
                quarterly budget projections
              </span>
            </div>
            <div
              style={{
                padding: "6px 14px 9px",
                borderTop: `1px solid rgba(255,255,255,0.04)`,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
                style={{ opacity: 0.3, flexShrink: 0 }}
              >
                <path
                  d="M1 3.5h9v5a1 1 0 01-1 1H2a1 1 0 01-1-1v-5z"
                  stroke="#F3F5F7"
                  strokeWidth="0.9"
                />
                <path
                  d="M1 3.5V3a1 1 0 011-1h2l1 1.5H1z"
                  stroke="#F3F5F7"
                  strokeWidth="0.9"
                />
              </svg>
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.32)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                ~/Documents
              </span>
            </div>
          </div>
        </div>

        {/* Results status bar */}
        <div
          style={{
            padding: "6px 16px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            <span style={{ color: "rgba(20,184,166,0.75)" }}>lexical</span>
            <span style={{ color: "rgba(255,255,255,0.18)" }}>→</span>
            <span style={{ color: "rgba(246,185,76,0.75)" }}>semantic</span>
            <span style={{ color: "rgba(255,255,255,0.18)" }}>→</span>
            <span>lock</span>
            <span
              style={{
                marginLeft: 8,
                color: "rgba(255,255,255,0.2)",
              }}
            >
              ·
            </span>
            <span style={{ marginLeft: 4 }}>5 matches</span>
            <span
              style={{
                color: "rgba(255,255,255,0.18)",
                margin: "0 4px",
              }}
            >
              |
            </span>
            <span>local-first</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                color: "rgba(246,185,76,0.7)",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              ✦ FLASH
            </span>
            <span style={{ color: "rgba(20,184,166,0.6)" }}>⊕ LOCAL</span>
          </div>
        </div>

        {/* Results list */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {HERO_RESULTS.map((r, i) => (
            <div
              key={r.name}
              style={{
                padding: "8px 16px",
                borderBottom: `1px solid rgba(255,255,255,0.025)`,
                background:
                  i === 0 ? "rgba(20,184,166,0.05)" : "transparent",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.22)",
                  flexShrink: 0,
                  paddingTop: 2,
                  width: 18,
                  textAlign: "right" as const,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <FileIcon ext={r.ext} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color:
                      i === 0
                        ? "rgba(255,255,255,0.92)"
                        : "rgba(255,255,255,0.75)",
                    fontWeight: i === 0 ? 600 : 400,
                    marginBottom: 2,
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.28)",
                    marginBottom: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.short}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.22)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.snippet}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color:
                    i === 0 ? "#14B8A6" : "rgba(255,255,255,0.32)",
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                {r.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: About Match panel */}
      <div
        className="hidden lg:flex"
        style={{
          width: 260,
          flexShrink: 0,
          background: PANEL_BG,
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: "9px 14px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <span style={{ color: "#14B8A6" }}>✦</span>
            <span style={{ fontWeight: 600 }}>About Match</span>
          </div>
          <span
            style={{
              fontSize: 8,
              padding: "2px 6px",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.1em",
            }}
          >
            ⊕ LOCKED
          </span>
        </div>

        {/* File info */}
        <div
          style={{
            padding: "12px 14px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <FileIcon ext="xlsx" />
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Q3-budget.xlsx
            </div>
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            ~/Documents/finance/Q3-budget.xlsx
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              padding: "2px 7px",
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.2)",
              color: "#14B8A6",
            }}
          >
            Sheet 1
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              lineHeight: 1.5,
            }}
          >
            Rank stabilized by relevance, recency, and integrity-safe
            retrieval.
          </div>
        </div>

        {/* Score analysis */}
        <div style={{ padding: "12px 14px", flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
              marginBottom: 10,
            }}
          >
            Score Analysis
          </div>
          {[
            {
              label: "Semantic Similarity",
              value: 0.34,
              color: "#14B8A6",
              display: "34.0%",
            },
            {
              label: "Quality Boost",
              value: 0.69,
              color: "#7C5CFF",
              display: "+69.1%",
            },
          ].map((bar) => (
            <div key={bar.label} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.45)",
                  marginBottom: 4,
                }}
              >
                <span>{bar.label}</span>
                <span style={{ color: bar.color }}>{bar.display}</span>
              </div>
              <div
                style={{
                  height: 3,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${bar.value * 100}%`,
                    background: bar.color,
                  }}
                />
              </div>
            </div>
          ))}
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${BORDER}`,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.4)" }}>
              Final Match Score
            </span>
            <span style={{ color: "#14B8A6", fontWeight: 700 }}>93.1%</span>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {["Open File", "Reveal in Folder"].map((label, i) => (
            <div
              key={label}
              style={{
                padding: "7px 10px",
                background:
                  i === 0
                    ? "rgba(20,184,166,0.12)"
                    : "rgba(255,255,255,0.04)",
                border: `1px solid ${i === 0 ? "rgba(20,184,166,0.25)" : BORDER}`,
                color:
                  i === 0 ? "#14B8A6" : "rgba(255,255,255,0.5)",
                fontSize: 10,
                textAlign: "center" as const,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
