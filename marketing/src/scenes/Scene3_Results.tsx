import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BG, ACCENT, FG } from "../lib/tokens";
import { fadeIn, staggerDelay } from "../lib/motion";
import { fontDisplay, fontBody } from "../lib/fonts";
import { NoiseOverlay } from "../components/NoiseOverlay";
import { AppWindow } from "../components/AppWindow";
import { SearchBar } from "../components/SearchBar";
import { ResultCard } from "../components/ResultCard";
import { EvidencePanel } from "../components/EvidencePanel";
import { PipelineBar } from "../components/PipelineBar";
import { IXOS_QUERY, DEMO_RESULTS } from "../lib/data";

/**
 * Scene 3: "Results Lock" — The Core Demo (10.0s / 312 frames)
 *
 * Results stream in. Top result highlighted. Evidence panel expands.
 * Display text: "It finds what you mean."
 */
export const Scene3_Results: React.FC = () => {
  const frame = useCurrentFrame();

  // Results start appearing at frame 20, staggered by 12 frames
  const RESULTS_START = 20;
  const RESULT_STAGGER = 12;

  // Evidence panel appears after results
  const EVIDENCE_START = RESULTS_START + DEMO_RESULTS.length * RESULT_STAGGER + 30;

  // Display text appears after evidence
  const TEXT_START = EVIDENCE_START + 40;

  return (
    <AbsoluteFill style={{ backgroundColor: BG.graphite0 }}>
      <NoiseOverlay />

      {/* Subtle teal glow */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 40% 50%, rgba(20, 184, 166, 0.05), transparent 70%)",
        }}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          padding: "0 80px",
        }}
      >
        {/* Left: App window with results */}
        <div style={{ flexShrink: 0 }}>
          <AppWindow width={700} height={460}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "14px 18px",
                gap: 10,
              }}
            >
              {/* Search bar — query already typed */}
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

              {/* Pipeline — all stages lit */}
              <PipelineBar startFrame={0} stageFrames={1} />

              {/* Result cards streaming in */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {DEMO_RESULTS.map((result, i) => (
                  <ResultCard
                    key={result.filename}
                    result={result}
                    enterFrame={RESULTS_START + staggerDelay(i, RESULT_STAGGER)}
                  />
                ))}
              </div>

              {/* Evidence panel — expands under best match */}
              <div style={{ opacity: fadeIn(frame, EVIDENCE_START - 5, 10) }}>
                <EvidencePanel startFrame={EVIDENCE_START} />
              </div>
            </div>
          </AppWindow>
        </div>

        {/* Right: Display text */}
        <div
          style={{
            opacity: fadeIn(frame, TEXT_START, 20),
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 360,
          }}
        >
          <span
            style={{
              fontFamily: fontDisplay,
              fontSize: 42,
              fontWeight: 600,
              color: FG.porcelain,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            It finds what
            <br />
            you mean.
          </span>
          <span
            style={{
              fontFamily: fontBody,
              fontSize: 14,
              color: FG.muted,
              lineHeight: 1.6,
            }}
          >
            Not filenames. Not keywords.
            <br />
            The actual document you were thinking of.
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
