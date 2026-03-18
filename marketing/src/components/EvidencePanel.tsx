import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Brain, ShieldCheck, Clock3, Activity } from "lucide-react";
import { FG, BG, BORDER, RADIUS } from "../lib/tokens";
import { fontBody } from "../lib/fonts";
import { fadeIn, slideUp } from "../lib/motion";
import { SCORE_SIGNALS } from "../lib/data";
import { ScoreBar } from "./ScoreBar";

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
  brain: <Brain size={14} color="#14B8A6" />,
  shield: <ShieldCheck size={14} color="#10B981" />,
  clock: <Clock3 size={14} color="#F6B94C" />,
  activity: <Activity size={14} color="#7C5CFF" />,
};

/**
 * "Why this matched" evidence panel — matching the desktop app.
 */
export const EvidencePanel: React.FC<{
  startFrame?: number;
}> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = fadeIn(frame, startFrame, 15);
  const y = slideUp(frame, fps, startFrame, 20);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "10px 14px",
        backgroundColor: BG.graphite2,
        borderRadius: RADIUS.md,
        border: `1px solid ${BORDER.hairline}`,
      }}
    >
      {/* Label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: fontBody,
            fontSize: 10,
            fontWeight: 600,
            color: FG.dim,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
          }}
        >
          Why this matched
        </span>
      </div>

      {/* Score breakdown bar */}
      <ScoreBar
        signals={SCORE_SIGNALS}
        startFrame={startFrame + 8}
        durationFrames={18}
      />

      {/* Signal detail rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {SCORE_SIGNALS.slice(0, 3).map((signal, i) => {
          const rowOpacity = fadeIn(frame, startFrame + 12 + i * 4, 10);
          return (
            <div
              key={signal.label}
              style={{
                opacity: rowOpacity,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {SIGNAL_ICONS[signal.icon]}
              <span
                style={{
                  fontFamily: fontBody,
                  fontSize: 11,
                  color: FG.muted,
                  flex: 1,
                }}
              >
                {signal.label}
              </span>
              <span
                style={{
                  fontFamily: fontBody,
                  fontSize: 11,
                  fontWeight: 600,
                  color: signal.color,
                }}
              >
                {signal.percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
