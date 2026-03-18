import React from "react";
import { useCurrentFrame } from "remotion";
import { BG, BORDER, FG, RADIUS } from "../lib/tokens";
import { fontBody } from "../lib/fonts";
import { QUALITY_MODES } from "../lib/data";

/**
 * Flash / Auto / Pro quality toggle display.
 * Cycles through modes over frames.
 */
export const QualitySwitcher: React.FC<{
  startFrame?: number;
  framesPerMode?: number;
}> = ({ startFrame = 0, framesPerMode = 15 }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const activeIndex = Math.min(
    QUALITY_MODES.length - 1,
    Math.floor(elapsed / framesPerMode),
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        backgroundColor: BG.graphite2,
        borderRadius: RADIUS.md,
        border: `1px solid ${BORDER.hairline}`,
      }}
    >
      {QUALITY_MODES.map((mode, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={mode.label}
            style={{
              padding: "5px 14px",
              borderRadius: RADIUS.sm + 2,
              backgroundColor: isActive ? BG.graphite3 : "transparent",
              border: isActive
                ? `1px solid ${mode.color}40`
                : "1px solid transparent",
              fontFamily: fontBody,
              fontSize: 11,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? mode.color : FG.dim,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {mode.label}
          </div>
        );
      })}
    </div>
  );
};
