import React from "react";
import { useCurrentFrame } from "remotion";
import { BG, BORDER, FG, RADIUS, ACCENT } from "../lib/tokens";
import { fontBody } from "../lib/fonts";
import { fadeIn, typewriter } from "../lib/motion";

/**
 * Terminal / CLI output display for Scene 5.
 */
export const TerminalWindow: React.FC<{
  content: string;
  startFrame?: number;
}> = ({ content, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, startFrame, 15);

  const lines = content.split("\n");
  const commandLine = lines[0]; // Assuming first line is the command
  const outputLines = lines.slice(1);

  // Animate the command typing over 30 frames
  const typedCommand = typewriter(frame, commandLine, startFrame, 1.2);
  const isCommandDone = typedCommand === commandLine;

  return (
    <div
      style={{
        opacity,
        backgroundColor: BG.graphite0,
        borderRadius: RADIUS.lg,
        border: `1px solid ${BORDER.subtle}`,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Command Line */}
      <div
        style={{
          fontFamily: fontBody,
          fontSize: 11,
          lineHeight: 1.7,
          color: ACCENT.success,
          whiteSpace: "pre",
        }}
      >
        {typedCommand}
        {frame % 20 < 10 && !isCommandDone ? "█" : ""}
      </div>

      {/* Output Lines (fade in quickly after command is done) */}
      {isCommandDone && outputLines.map((line, i) => {
        const lineStartFrame = startFrame + (commandLine.length / 1.2) + i * 2;
        const lineOpacity = fadeIn(frame, lineStartFrame, 5);
        const isKey = line.includes('"') && line.includes(":");
        return (
          <div
            key={i}
            style={{
              opacity: lineOpacity,
              fontFamily: fontBody,
              fontSize: 11,
              lineHeight: 1.7,
              color: isKey ? FG.muted : FG.dim,
              whiteSpace: "pre",
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
