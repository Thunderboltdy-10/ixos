"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { DemoSurface } from "@/landing/DemoSurface";

const TEST_QUERIES = [
  "authentication token refresh",
  "rate limiter middleware",
  "How does token expiry work?",
  "database migration scripts",
  "ephemeral mode privacy",
  "cache signing validation",
];

type SearchMode = "flash" | "auto" | "pro";

export default function DemoRoute() {
  const [activeMode, setActiveMode] = useState<SearchMode>("auto");
  const [activeQuery, setActiveQuery] = useState(TEST_QUERIES[0]);
  const [demoKey, setDemoKey] = useState(0);
  const [showPanel, setShowPanel] = useState(true);
  const [streamLog, setStreamLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setStreamLog((prev) => [...prev.slice(-60), `${new Date().toISOString().slice(11, 23)} ${msg}`]);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [streamLog]);

  const restart = useCallback((q?: string, m?: SearchMode) => {
    const nextQ = q ?? activeQuery;
    const nextM = m ?? activeMode;
    setActiveQuery(nextQ);
    setActiveMode(nextM);
    setStreamLog([]);
    addLog(`--- Restart: query="${nextQ}" mode=${nextM} ---`);
    setDemoKey((k) => k + 1);
  }, [activeQuery, activeMode, addLog]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050507",
        color: "#f3f5f7",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        fontFamily: "var(--font-mono, monospace)",
      }}
    >
      {/* Control bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 20px",
          borderBottom: "1px solid rgba(243,245,247,0.08)",
          background: "rgba(14,17,23,0.95)",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: 13, letterSpacing: "-0.01em", color: "#f6b94c" }}>
          DEMO HARNESS
        </strong>

        {/* Mode toggles */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["flash", "auto", "pro"] as const).map((m) => (
            <button
              key={m}
              onClick={() => restart(undefined, m)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: `1px solid ${activeMode === m ? "rgba(20,184,166,0.5)" : "rgba(243,245,247,0.12)"}`,
                background: activeMode === m ? "rgba(20,184,166,0.15)" : "transparent",
                color: activeMode === m ? "#5eead4" : "rgba(243,245,247,0.6)",
                fontSize: 11,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Query presets */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TEST_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => restart(q)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${activeQuery === q ? "rgba(246,185,76,0.4)" : "rgba(243,245,247,0.1)"}`,
                background: activeQuery === q ? "rgba(246,185,76,0.12)" : "transparent",
                color: activeQuery === q ? "#f6b94c" : "rgba(243,245,247,0.5)",
                fontSize: 10,
                cursor: "pointer",
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {q}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowPanel((p) => !p)}
          style={{
            marginLeft: "auto",
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid rgba(243,245,247,0.12)",
            background: "transparent",
            color: "rgba(243,245,247,0.5)",
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          {showPanel ? "Hide" : "Show"} Log
        </button>
      </header>

      {/* Main content */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showPanel ? "minmax(0, 1fr) 340px" : "1fr",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Demo surface */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            overflow: "auto",
          }}
        >
          <div style={{ width: "100%", maxWidth: 1060, minHeight: 640 }}>
            <DemoSurface
              key={demoKey}
              autoRun={true}
              initialView="search"
              initialMode={activeMode}
              initialQuery={activeQuery}
              presets={TEST_QUERIES.slice(0, 4)}
            />
          </div>
        </div>

        {/* Stream log panel */}
        {showPanel && (
          <aside
            style={{
              borderLeft: "1px solid rgba(243,245,247,0.08)",
              background: "rgba(8,11,15,0.95)",
              display: "grid",
              gridTemplateRows: "auto auto minmax(0, 1fr)",
              fontSize: 10,
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid rgba(243,245,247,0.06)",
                color: "rgba(243,245,247,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontSize: 9,
              }}
            >
              Acceptance Checklist
            </div>
            <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(243,245,247,0.06)" }}>
              <CheckItem label="First result appears in 200-800ms" />
              <CheckItem label="Results stream incrementally (120-300ms each)" />
              <CheckItem label="Stage progression: scan → lexical → semantic → refine → locked" />
              <CheckItem label="Evidence bars reflect computed values" />
              <CheckItem label="Changing query changes scores" />
              <CheckItem label="Mode toggle changes score weights" />
              <CheckItem label="No unthemed (white) inputs" />
              <CheckItem label="Score breakdown visible in evidence panel" />
              <CheckItem label="Snippet + path:line visible" />
              <CheckItem label="Rationale (why-matched) visible" />
            </div>
            <div
              ref={logRef}
              style={{
                padding: "8px 14px",
                overflow: "auto",
                fontFamily: "monospace",
                lineHeight: 1.6,
              }}
            >
              <div style={{ color: "rgba(243,245,247,0.3)", marginBottom: 6 }}>
                Stream Event Log
              </div>
              {streamLog.length === 0 && (
                <div style={{ color: "rgba(243,245,247,0.25)" }}>
                  Switch queries or modes to see events...
                </div>
              )}
              {streamLog.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    color: line.includes("---")
                      ? "#f6b94c"
                      : line.includes("result")
                        ? "#5eead4"
                        : "rgba(243,245,247,0.45)",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function CheckItem({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        padding: "3px 0",
        fontSize: 10,
        color: "rgba(243,245,247,0.55)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          border: "1px solid rgba(20,184,166,0.4)",
          background: "rgba(20,184,166,0.08)",
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  );
}
