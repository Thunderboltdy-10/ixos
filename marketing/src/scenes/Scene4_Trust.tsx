import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BG, ACCENT, FG } from "../lib/tokens";
import { SPRING_SMOOTH, fadeIn } from "../lib/motion";
import { fontBody } from "../lib/fonts";
import { NoiseOverlay } from "../components/NoiseOverlay";
import { AppWindow } from "../components/AppWindow";
import { SearchBar } from "../components/SearchBar";
import { TrustBlock } from "../components/TrustBlock";
import { TRUST_ITEMS, IXOS_QUERY, DEMO_RESULTS } from "../lib/data";
import { ResultCard } from "../components/ResultCard";

/**
 * Scene 4: "Trust" — Privacy Guarantee (7.0s / 222 frames)
 *
 * App window scales down and drifts left.
 * Three trust blocks appear on the right with staggered springs.
 */
export const Scene4_Trust: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // App window shrinks and moves left
  const shrinkProgress = spring({
    frame,
    fps,
    config: SPRING_SMOOTH,
  });
  const windowScale = interpolate(shrinkProgress, [0, 1], [1, 0.6]);
  const windowX = interpolate(shrinkProgress, [0, 1], [0, -180]);

  // Trust blocks stagger
  const TRUST_START = 30;
  const TRUST_STAGGER = 20;

  return (
    <AbsoluteFill style={{ backgroundColor: BG.graphite0 }}>
      <NoiseOverlay />

      {/* Amber glow for trust section */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 50% at 70% 50%, rgba(246, 185, 76, ${0.04 * fadeIn(frame, 20, 30)}), transparent 70%)`,
        }}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 80,
          padding: "0 80px",
        }}
      >
        {/* Left: Shrunken app window */}
        <div
          style={{
            transform: `scale(${windowScale}) translateX(${windowX}px)`,
            opacity: 0.85,
            flexShrink: 0,
          }}
        >
          <AppWindow width={700} height={420}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "14px 18px",
                gap: 8,
              }}
            >
              <SearchBar glowColor={ACCENT.teal} showGlow>
                <span
                  style={{
                    fontFamily: fontBody,
                    fontSize: 14,
                    color: FG.porcelain,
                  }}
                >
                  {IXOS_QUERY}
                </span>
              </SearchBar>
              {DEMO_RESULTS.slice(0, 2).map((r) => (
                <ResultCard key={r.filename} result={r} enterFrame={0} />
              ))}
            </div>
          </AppWindow>
        </div>

        {/* Right: Trust blocks */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            maxWidth: 340,
          }}
        >
          {TRUST_ITEMS.map((item, i) => (
            <TrustBlock
              key={item.title}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              startFrame={TRUST_START + i * TRUST_STAGGER}
              accentColor={ACCENT.amber}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
