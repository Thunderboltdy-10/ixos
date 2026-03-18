import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FileText, FileCode, FileCog } from "lucide-react";
import { BG, BORDER, FG, ACCENT, RADIUS } from "../lib/tokens";
import { fontBody } from "../lib/fonts";
import { SPRING_SMOOTH } from "../lib/motion";
import type { DemoResult } from "../lib/data";

import { HighlighterText } from "./HighlighterText";

const FILE_ICONS: Record<string, React.ReactNode> = {
  md: <FileText size={16} color={ACCENT.teal} />,
  yml: <FileCog size={16} color={ACCENT.amber} />,
  rs: <FileCode size={16} color={ACCENT.violet} />,
};

export const ResultCard: React.FC<{
  result: DemoResult;
  enterFrame: number;
}> = ({ result, enterFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - enterFrame),
    fps,
    config: SPRING_SMOOTH,
  });

  const opacity = progress;
  const translateX = interpolate(progress, [0, 1], [30, 0]);

  const icon = FILE_ICONS[result.extension] ?? (
    <FileText size={16} color={FG.dim} />
  );

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "10px 14px",
        backgroundColor: result.isBestMatch ? BG.graphite2 : "transparent",
        borderRadius: RADIUS.md,
        border: `1px solid ${result.isBestMatch ? BORDER.subtle : "transparent"}`,
      }}
    >
      {/* Header: icon + filename + score */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {icon}
        <span
          style={{
            fontFamily: fontBody,
            fontSize: 15,
            fontWeight: 500,
            color: FG.porcelain,
            flex: 1,
          }}
        >
          {result.filename}
        </span>
        {/* Score badge */}
        <span
          style={{
            fontFamily: fontBody,
            fontSize: 12,
            fontWeight: 600,
            color: ACCENT.teal,
            backgroundColor: `${ACCENT.teal}18`,
            padding: "2px 8px",
            borderRadius: RADIUS.sm,
          }}
        >
          {Math.round(result.score * 100)}%
        </span>
        {result.isBestMatch && (
          <span
            style={{
              fontFamily: fontBody,
              fontSize: 10,
              fontWeight: 600,
              color: ACCENT.tealGlow,
              backgroundColor: `${ACCENT.teal}18`,
              padding: "2px 6px",
              borderRadius: RADIUS.sm,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Best Match
          </span>
        )}
      </div>
      {/* Directory */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontFamily: fontBody,
          fontSize: 12,
          color: FG.dim,
        }}
      >
        <span>{result.directory}</span>
        <span style={{ color: FG.ghost }}>·</span>
        <span>{result.modifiedAt}</span>
      </div>
      {/* Snippet */}
      <div
        style={{
          fontFamily: fontBody,
          fontSize: 13,
          color: FG.muted,
          lineHeight: 1.5,
          overflow: "hidden",
          maxHeight: 40,
        }}
      >
        {result.isBestMatch ? (
          <HighlighterText 
            text={result.snippet} 
            highlightWords={["JWT tokens", "API authentication"]} 
            startFrame={enterFrame + 40} 
            durationInFrames={30}
          />
        ) : (
          result.snippet
        )}
      </div>
    </div>
  );
};
