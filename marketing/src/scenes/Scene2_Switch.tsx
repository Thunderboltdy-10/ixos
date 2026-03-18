import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BG, ACCENT, FG } from "../lib/tokens";
import { SPRING_SMOOTH, fadeIn } from "../lib/motion";
import { NoiseOverlay } from "../components/NoiseOverlay";
import { AppWindow } from "../components/AppWindow";
import { SearchBar } from "../components/SearchBar";
import { TypewriterText } from "../components/TypewriterText";
import { PipelineBar } from "../components/PipelineBar";
import { IXOS_QUERY } from "../lib/data";

/**
 * Scene 2: "The Switch" — Ixos Appears (6.0s / 192 frames)
 *
 * App window rises from center. Search bar glows teal.
 * Cursor types the query. Pipeline bar lights up.
 */
export const Scene2_Switch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // App window entrance: spring scale-in + slide-up
  const entranceProgress = spring({
    frame,
    fps,
    config: SPRING_SMOOTH,
  });
  const windowScale = interpolate(entranceProgress, [0, 1], [0.92, 1]);
  const windowY = interpolate(entranceProgress, [0, 1], [40, 0]);
  const windowOpacity = entranceProgress;

  // Teal glow ramp-up
  const glowOpacity = fadeIn(frame, 15, 20);

  return (
    <AbsoluteFill style={{ backgroundColor: BG.graphite0 }}>
      <NoiseOverlay />

      {/* Subtle teal radial glow behind window */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 50%, rgba(20, 184, 166, ${0.06 * glowOpacity}), transparent 70%)`,
        }}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            opacity: windowOpacity,
            transform: `scale(${windowScale}) translateY(${windowY}px)`,
          }}
        >
          <AppWindow width={780} height={420}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 20px",
                gap: 14,
              }}
            >
              {/* Search bar with teal glow */}
              <SearchBar
                glowColor={ACCENT.teal}
                showGlow={frame > 15}
                placeholder="Type what you remember..."
              >
                {frame > 25 ? (
                  <TypewriterText
                    text={IXOS_QUERY}
                    startFrame={25}
                    charsPerFrame={0.55}
                    fontSize={14}
                    color={FG.porcelain}
                  />
                ) : (
                  <span style={{ color: FG.dim, fontSize: 14 }}>
                    Type what you remember...
                  </span>
                )}
              </SearchBar>

              {/* Pipeline bar appears after typing starts */}
              <div style={{ opacity: fadeIn(frame, 60, 15) }}>
                <PipelineBar startFrame={65} stageFrames={22} />
              </div>

              {/* Empty results area — results come in Scene 3 */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: fadeIn(frame, 130, 15),
                }}
              >
                <span
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 11,
                    color: FG.ghost,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                  }}
                >
                  {frame > 130 ? "Searching..." : ""}
                </span>
              </div>
            </div>
          </AppWindow>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
