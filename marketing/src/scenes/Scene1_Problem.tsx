import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BG, FG, BORDER, RADIUS } from "../lib/tokens";
import { fadeIn, fadeOut } from "../lib/motion";
import { TypewriterText } from "../components/TypewriterText";
import { GenericFileList } from "../components/GenericFileList";
import { NoiseOverlay } from "../components/NoiseOverlay";
import { Search } from "lucide-react";
import { SCENE1_QUERY } from "../lib/data";

/**
 * Scene 1: "The Problem" — Cold Open (5.0s / 150 frames)
 *
 * Dark screen. Generic search bar. Typewriter types a vague query.
 * Below, a wall of unhelpful filenames appears. Muted, frustrating.
 */
export const Scene1_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade out in last 15 frames for transition
  const exitOpacity = fadeOut(frame, durationInFrames - 15, 15);

  return (
    <AbsoluteFill
      style={{ backgroundColor: BG.graphite0, opacity: exitOpacity }}
    >
      <NoiseOverlay />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          gap: 24,
        }}
      >
        {/* Generic search bar — no glow, intentionally dull */}
        <div
          style={{
            width: 480,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 42,
              padding: "0 14px",
              backgroundColor: BG.graphite2,
              borderRadius: RADIUS.md,
              border: `1px solid ${BORDER.subtle}`,
            }}
          >
            <Search size={15} color={FG.ghost} strokeWidth={2} />
            <TypewriterText
              text={SCENE1_QUERY}
              startFrame={20}
              charsPerFrame={0.45}
              fontSize={13}
              color={FG.dim}
            />
          </div>

          {/* Unhelpful file results */}
          <div
            style={{
              opacity: fadeIn(frame, 50, 20),
              borderTop: `1px solid ${BORDER.hairline}`,
              paddingTop: 8,
            }}
          >
            <GenericFileList startFrame={55} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
