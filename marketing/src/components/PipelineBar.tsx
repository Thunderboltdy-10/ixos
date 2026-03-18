import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { ACCENT, FG, BG, BORDER, RADIUS } from "../lib/tokens";
import { fontBody } from "../lib/fonts";
import { PIPELINE_STAGES } from "../lib/data";

/**
 * Scan > Embed > Rank pipeline status bar.
 * Each stage lights up teal in sequence.
 */
export const PipelineBar: React.FC<{
  startFrame?: number;
  stageFrames?: number;
}> = ({ startFrame = 0, stageFrames = 20 }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 12px",
        backgroundColor: BG.graphite2,
        borderRadius: RADIUS.md,
        border: `1px solid ${BORDER.hairline}`,
      }}
    >
      {PIPELINE_STAGES.map((stage, i) => {
        const stageStart = startFrame + i * stageFrames;
        const active = frame >= stageStart;
        const progress = interpolate(
          frame,
          [stageStart, stageStart + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <React.Fragment key={stage}>
            {i > 0 && (
              <span
                style={{
                  fontFamily: fontBody,
                  fontSize: 10,
                  color: FG.ghost,
                  margin: "0 2px",
                }}
              >
                {"\u203A"}
              </span>
            )}
            <span
              style={{
                fontFamily: fontBody,
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: active ? ACCENT.teal : FG.ghost,
                opacity: active ? progress : 0.3,
              }}
            >
              {stage}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
