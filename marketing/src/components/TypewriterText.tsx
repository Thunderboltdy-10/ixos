import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { fontBody } from "../lib/fonts";
import { FG } from "../lib/tokens";

/**
 * Typewriter text with blinking cursor.
 * Frame-driven — no CSS animations.
 */
export const TypewriterText: React.FC<{
  text: string;
  startFrame?: number;
  charsPerFrame?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  fontFamily?: string;
  cursorColor?: string;
  showCursor?: boolean;
}> = ({
  text,
  startFrame = 0,
  charsPerFrame = 0.5,
  fontSize = 24,
  fontWeight = 400,
  color = FG.porcelain,
  fontFamily = fontBody,
  cursorColor,
  showCursor = true,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(text.length, Math.floor(elapsed * charsPerFrame));
  const typedText = text.slice(0, charCount);

  // Cursor blink
  const blinkInterval = 16;
  const cursorOpacity = interpolate(
    frame % blinkInterval,
    [0, blinkInterval / 2, blinkInterval],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <span
      style={{
        fontFamily,
        fontSize,
        fontWeight,
        color,
        letterSpacing: "-0.02em",
        whiteSpace: "pre",
      }}
    >
      {typedText}
      {showCursor && (
        <span style={{ opacity: cursorOpacity, color: cursorColor ?? color }}>
          {"\u258C"}
        </span>
      )}
    </span>
  );
};
