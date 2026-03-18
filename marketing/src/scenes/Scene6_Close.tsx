import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { BG, ACCENT, FG } from "../lib/tokens";
import { fadeIn } from "../lib/motion";
import { fontDisplay, fontBody } from "../lib/fonts";
import { NoiseOverlay } from "../components/NoiseOverlay";
import { LogoReveal } from "../components/LogoReveal";
import { TypewriterText } from "../components/TypewriterText";
import { TAGLINE } from "../lib/data";

/**
 * Scene 6: "Close" — Logo + CTA (5.0s / 162 frames)
 *
 * Logo spring entrance. Tagline typewriter. CTA with teal underline.
 */
export const Scene6_Close: React.FC = () => {
  const frame = useCurrentFrame();
  const TAGLINE_START = 30;
  const CTA_START = TAGLINE_START + TAGLINE.length * 2 + 24; // after typing + pause

  return (
    <AbsoluteFill style={{ backgroundColor: BG.graphite0 }}>
      <NoiseOverlay />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {/* Logo */}
        <LogoReveal startFrame={5} size={56} />

        {/* Tagline */}
        <div style={{ marginTop: 8 }}>
          <TypewriterText
            text={TAGLINE}
            startFrame={TAGLINE_START}
            charsPerFrame={0.45}
            fontSize={32}
            fontWeight={600}
            fontFamily={fontDisplay}
            color={FG.porcelain}
            cursorColor={ACCENT.teal}
          />
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: fadeIn(frame, CTA_START, 18),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            marginTop: 12,
          }}
        >
          <span
            style={{
              fontFamily: fontBody,
              fontSize: 14,
              color: FG.muted,
            }}
          >
            Download free at{" "}
            <span style={{ color: ACCENT.teal, fontWeight: 500 }}>
              ixos.dev
            </span>
          </span>
          {/* Teal underline animation */}
          <div
            style={{
              width: interpolateUnderline(frame, CTA_START + 8),
              height: 1.5,
              backgroundColor: ACCENT.teal,
              borderRadius: 1,
              opacity: 0.6,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Underline sweep: width 0% → 100% */
function interpolateUnderline(frame: number, startFrame: number): string {
  const progress = interpolate(frame, [startFrame, startFrame + 20], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  return `${progress}%`;
}
