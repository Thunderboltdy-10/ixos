import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { BG, ACCENT, FG } from "../lib/tokens";
import { fontDisplay, fontBody } from "../lib/fonts";
import { fadeIn, fadeOut, slideUp, slideRight, scaleIn, staggerDelay } from "../lib/motion";
import { PremiumBackground } from "../components/PremiumBackground";
import { AppWindow } from "../components/AppWindow";
import { SearchBar } from "../components/SearchBar";
import { TypewriterText } from "../components/TypewriterText";
import { PipelineBar } from "../components/PipelineBar";
import { ResultCard } from "../components/ResultCard";
import { EvidencePanel } from "../components/EvidencePanel";
import { TrustBlock } from "../components/TrustBlock";
import { QualitySwitcher } from "../components/QualitySwitcher";
import { TerminalWindow } from "../components/TerminalWindow";
import { FileExplorer } from "../components/FileExplorer";
import {
  IXOS_QUERY,
  DEMO_RESULTS,
  TRUST_ITEMS,
  TAGLINE,
  CTA,
  CLI_OUTPUT,
} from "../lib/data";

const SPRING_SMOOTH = { damping: 200 } as const;

export const HeroFilm: React.FC = () => {
  const actualFrame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const INTRO_DURATION = 140;
  const frame = Math.max(0, actualFrame - INTRO_DURATION);
  const introOpacity = fadeIn(actualFrame, 10, 20) * fadeOut(actualFrame, INTRO_DURATION - 20, 20);

  // --- CAMERA / SCENE CHOREOGRAPHY ---

  // 1. The Problem (0 - 120)
  const problemOpacity = fadeOut(frame, 100, 20);
  const searchBarWiggle =
    interpolate(frame, [60, 65, 70, 75, 80], [0, 5, -5, 5, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // 2. The Switch & Results Lock (120 - 550)
  // App window bursts in at 120
  const appEntrance = spring({
    frame: Math.max(0, frame - 120),
    fps,
    config: SPRING_SMOOTH,
  });
  
  // App window scales down and moves left at 550 (Trust chapter)
  const trustShift = spring({
    frame: Math.max(0, frame - 550),
    fps,
    config: SPRING_SMOOTH,
  });

  // App window moves back center for Modes at 750
  const modesShift = spring({
    frame: Math.max(0, frame - 750),
    fps,
    config: SPRING_SMOOTH,
  });
  
  // App window flies out / fades out at 950
  const appExit = spring({
    frame: Math.max(0, frame - 950),
    fps,
    config: SPRING_SMOOTH,
  });

  const appScale = interpolate(appEntrance, [0, 1], [0.8, 1.15]) * 
                   interpolate(trustShift, [0, 1], [1, 0.75]) *
                   interpolate(modesShift, [0, 1], [1, 1.4]) *
                   interpolate(appExit, [0, 1], [1, 1.6]) +
                   (Math.sin(frame / 60) * 0.015); // Subtle breathing

  const appX = interpolate(trustShift, [0, 1], [0, -350]) +
               interpolate(modesShift, [0, 1], [0, 150]) +
               (Math.cos(frame / 80) * 8);
               
  const appY = interpolate(appEntrance, [0, 1], [80, 0]) +
               interpolate(appExit, [0, 1], [0, -100]) +
               (Math.sin(frame / 50) * 12);

  const appOpacity = interpolate(appEntrance, [0, 1], [0, 1]) * 
                     interpolate(appExit, [0, 1], [1, 0]);

  // --- INTERNAL TIMINGS ---
  const IXOS_TYPE_START = 150;
  const RESULTS_START = 220;
  const RESULT_STAGGER = 8;
  const EVIDENCE_START = RESULTS_START + DEMO_RESULTS.length * RESULT_STAGGER + 20;
  const TEXT_START = EVIDENCE_START + 30;

  return (
    <AbsoluteFill style={{ backgroundColor: BG.graphite0 }}>
      <PremiumBackground />

      {/* --- SCENE 0: INTRO --- */}
      {actualFrame < INTRO_DURATION && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: introOpacity }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            <span style={{ fontFamily: fontDisplay, fontSize: 64, fontWeight: 700, color: FG.porcelain, letterSpacing: "-0.03em" }}>
              <TypewriterText text="You remember what a file meant." startFrame={10} charsPerFrame={1.5} />
            </span>
            <span style={{ fontFamily: fontBody, fontSize: 32, color: ACCENT.teal, opacity: fadeIn(actualFrame, 60, 20) }}>
              Not what it was named.
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* --- SCENE 1: THE PROBLEM --- */}
      {actualFrame >= INTRO_DURATION && frame < 120 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: problemOpacity,
            transform: `translateX(${searchBarWiggle}px)`,
          }}
        >
          <FileExplorer startFrame={0} />
        </AbsoluteFill>
      )}

      {/* --- CONTINUOUS APP WINDOW (SCENE 2, 3, 4, 5) --- */}
      {frame >= 120 && frame < 1000 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              opacity: appOpacity,
              transform: `scale(${appScale}) translateX(${appX}px) translateY(${appY}px)`,
            }}
          >
            <AppWindow width={860} height={540}>
              <div style={{ display: "flex", flexDirection: "column", padding: "16px 20px", gap: 14 }}>
                
                <SearchBar glowColor={ACCENT.teal} showGlow={frame > 140}>
                  {frame > IXOS_TYPE_START ? (
                    <TypewriterText text={IXOS_QUERY} startFrame={IXOS_TYPE_START} charsPerFrame={0.8} fontSize={18} color={FG.porcelain} />
                  ) : (
                    <span style={{ color: FG.dim, fontSize: 18 }}>Type what you remember...</span>
                  )}
                </SearchBar>

                <div style={{ opacity: fadeIn(frame, 180, 10) }}>
                  <PipelineBar startFrame={180} stageFrames={15} />
                </div>

                {frame < RESULTS_START && frame >= 180 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: fadeIn(frame, 200, 10) }}>
                    <span style={{ fontFamily: fontBody, fontSize: 11, color: FG.ghost, letterSpacing: "0.2em", textTransform: "uppercase" }}>Searching...</span>
                  </div>
                )}

                {frame >= RESULTS_START && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {DEMO_RESULTS.map((result, i) => (
                      <ResultCard key={result.filename} result={result} enterFrame={RESULTS_START + staggerDelay(i, RESULT_STAGGER)} />
                    ))}
                  </div>
                )}

                {frame >= EVIDENCE_START && (
                  <div style={{ opacity: fadeIn(frame, EVIDENCE_START - 5, 10) }}>
                    <EvidencePanel startFrame={EVIDENCE_START} />
                  </div>
                )}
              </div>
            </AppWindow>
          </div>
        </AbsoluteFill>
      )}

      {/* --- "It finds what you mean." TEXT (SCENE 3) --- */}
      {frame >= TEXT_START && frame < 550 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "15%", opacity: fadeIn(frame, TEXT_START, 20) * fadeOut(frame, 530, 20) }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
            <span style={{ fontFamily: fontDisplay, fontSize: 46, fontWeight: 600, color: FG.porcelain, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              It finds what<br />you mean.
            </span>
            <span style={{ fontFamily: fontBody, fontSize: 15, color: FG.muted, lineHeight: 1.6 }}>
              Not filenames. Not keywords.<br />The actual document you were thinking of.
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* --- TRUST BLOCKS (SCENE 4) --- */}
      {frame >= 550 && frame < 750 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "15%", opacity: fadeOut(frame, 730, 20) }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {TRUST_ITEMS.map((item, i) => (
              <div
                key={item.title}
                style={{
                  opacity: fadeIn(frame, 570 + staggerDelay(i, 10), 20),
                  transform: `translateX(${slideRight(frame, fps, 570 + staggerDelay(i, 10), 30)}px)`,
                }}
              >
                <TrustBlock {...item} startFrame={570 + staggerDelay(i, 10)} />
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* --- MODES / TERMINAL (SCENE 5) --- */}
      {frame >= 750 && frame < 950 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "15%", opacity: fadeOut(frame, 930, 20) }}>
           <div style={{ 
              position: "absolute",
              right: "20%",
              top: "30%",
              opacity: fadeIn(frame, 780, 15),
              transform: `scale(${scaleIn(frame, fps, 780)}) translateY(${slideUp(frame, fps, 780, 40)}px)`
            }}>
             <QualitySwitcher startFrame={780} />
           </div>

           <div style={{ 
              position: "absolute",
              right: "10%",
              bottom: "15%",
              opacity: fadeIn(frame, 800, 15),
              transform: `scale(${scaleIn(frame, fps, 800)}) translateX(${slideRight(frame, fps, 800, -50)}px)`,
              zIndex: 10
            }}>
             <TerminalWindow content={CLI_OUTPUT} startFrame={800} />
           </div>
        </AbsoluteFill>
      )}

      {/* --- CLOSE / LOGO (SCENE 6) --- */}
      {frame >= 950 && (
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: fadeIn(frame, 980, 20) }}>
          <div style={{ 
            opacity: fadeIn(frame, 980, 15), 
            transform: `scale(${scaleIn(frame, fps, 980)})` 
          }}>
            <img src="/assets/logo-v3.png" alt="Ixos" style={{ width: 180, height: "auto", objectFit: "contain" }} />
          </div>

          <div style={{ marginTop: 40, opacity: fadeIn(frame, 1020, 20) }}>
            <span style={{ fontFamily: fontBody, fontSize: 24, color: FG.porcelain, letterSpacing: "-0.01em" }}>
              <TypewriterText text={TAGLINE} startFrame={1020} charsPerFrame={0.8} />
            </span>
          </div>

          <div style={{ marginTop: 60, opacity: fadeIn(frame, 1070, 20) }}>
            <span style={{ 
              fontFamily: fontDisplay, 
              fontSize: 16, 
              color: FG.muted, 
              borderBottom: `1px solid ${ACCENT.teal}80`, 
              paddingBottom: 4 
            }}>
              {CTA}
            </span>
          </div>
        </AbsoluteFill>
      )}

    </AbsoluteFill>
  );
};
