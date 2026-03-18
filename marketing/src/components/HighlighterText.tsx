import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, FG } from "../lib/tokens";

export const HighlighterText: React.FC<{
  text: string;
  highlightWords: string[];
  startFrame: number;
  durationInFrames?: number;
}> = ({ text, highlightWords, startFrame, durationInFrames = 20 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const highlightProgress = spring({
    fps,
    frame: Math.max(0, frame - startFrame),
    config: { damping: 200 },
    durationInFrames,
  });
  const scaleX = Math.max(0, Math.min(1, highlightProgress));

  // A very simple way to highlight exactly the matching words:
  // For simplicity, we just split by the first match.
  let preText = text;
  let matchText = "";
  let postText = "";

  for (const word of highlightWords) {
    const idx = text.toLowerCase().indexOf(word.toLowerCase());
    if (idx >= 0) {
      preText = text.slice(0, idx);
      matchText = text.slice(idx, idx + word.length);
      postText = text.slice(idx + word.length);
      break;
    }
  }

  if (!matchText) {
    return <span>{text}</span>;
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span>{preText}</span>
      <span style={{ position: "relative", display: "inline-block" }}>
        <span
          style={{
            position: "absolute",
            left: "-2px",
            right: "-2px",
            top: "10%",
            bottom: "10%",
            transform: `scaleX(${scaleX})`,
            transformOrigin: "left center",
            backgroundColor: ACCENT.teal + "40", // 25% opacity teal
            borderRadius: "2px",
            zIndex: 0,
          }}
        />
        <span style={{ position: "relative", zIndex: 1, color: FG.porcelain }}>{matchText}</span>
      </span>
      <span>{postText}</span>
    </span>
  );
};