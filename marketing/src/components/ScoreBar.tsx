import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { BG, FG } from "../lib/tokens";
import { fontBody } from "../lib/fonts";
import type { ScoreSignal } from "../lib/data";

/**
 * Segmented horizontal score breakdown bar.
 * Matching the desktop app's ScoreBreakdown component.
 */
export const ScoreBar: React.FC<{
  signals: ScoreSignal[];
  startFrame?: number;
  durationFrames?: number;
}> = ({ signals, startFrame = 0, durationFrames = 18 }) => {
  const frame = useCurrentFrame();
  const fillProgress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.exp),
    },
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Bar */}
      <div
        style={{
          display: "flex",
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: BG.graphite3,
        }}
      >
        {signals.map((signal) => (
          <div
            key={signal.label}
            style={{
              width: `${signal.percentage * fillProgress}%`,
              backgroundColor: signal.color,
              transition: "none",
            }}
          />
        ))}
      </div>
      {/* Labels */}
      <div style={{ display: "flex", gap: 12 }}>
        {signals.map((signal) => (
          <div
            key={signal.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              opacity: fillProgress,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: signal.color,
              }}
            />
            <span
              style={{
                fontFamily: fontBody,
                fontSize: 9,
                fontWeight: 500,
                color: FG.dim,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {signal.label}
            </span>
            <span
              style={{
                fontFamily: fontBody,
                fontSize: 9,
                color: FG.ghost,
              }}
            >
              {signal.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
