"use client";

/**
 * MinimalCalibration — /3 connector
 *
 * The calm variant. No large connector elements.
 * Instead: micro grid/calibration marks that shift and snap into place
 * between sections. Each section transition triggers a "phase lock" pulse.
 * Hovering key UI hotspots causes calibration ticks to align like instruments.
 *
 * 6 micro-animations:
 * 1. Fine tick marks snap to alignment on section entry (spring physics)
 * 2. Phase lock pulse: concentric thin circles expand + fade at section boundary
 * 3. Tick mark grid subtly breathes with a slow opacity cycle
 * 4. Active section: corner brackets appear at section boundaries
 * 5. Transition: alignment ticks "sweep" horizontally across the viewport
 * 6. Scan line: a single 1px horizontal line passes through on section change
 *
 * 3 user-triggered interactions:
 * 1. Hover ticks on left/right edge: they snap into a column
 * 2. Click anywhere on the calibration zone: fires a phase-lock pulse
 * 3. Section changes trigger sweep + bracket snap
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectorProps } from "./types";
import { SECTION_MAP, SECTION_BY_ID } from "../SECTION_MAP";

const TONE_COLOR = {
  cyan: "#2DD4BF",
  amber: "#F59E0B",
  violet: "#7C3AED",
};

interface TickMark {
  id: string;
  x: number;
  y: number;
  /** 0-1 alignment state: 0=misaligned, 1=locked */
  alignment: number;
  opacity: number;
}

interface PhasePulse {
  id: string;
  y: number;
  color: string;
}

export function MinimalCalibration({
  sections,
  activeSectionId,
  pulseAt,
}: ConnectorProps) {
  const [phasePulses, setPhasePulses] = useState<PhasePulse[]>([]);
  const [scanLineY, setScanLineY] = useState<number | null>(null);
  const [showScanLine, setShowScanLine] = useState(false);
  const [brackets, setBrackets] = useState<{ top: number; color: string } | null>(null);
  const prevActiveRef = useRef<string | null>(null);
  const pulseCountRef = useRef(0);

  const TICK_COUNT_LEFT = 24;
  const TICK_COUNT_RIGHT = 24;

  // Fire calibration effects when active section changes
  useEffect(() => {
    if (!activeSectionId || activeSectionId === prevActiveRef.current) return;
    prevActiveRef.current = activeSectionId;

    const section = SECTION_BY_ID[activeSectionId];
    const color = section ? TONE_COLOR[section.tone as keyof typeof TONE_COLOR] : "#2DD4BF";

    // 1. Phase-lock pulse at the section boundary
    const pulseId = `pulse-${pulseCountRef.current++}`;
    const yFraction = 0.18; // top of viewport where sections enter
    setPhasePulses((prev) => [
      ...prev.slice(-3),
      { id: pulseId, y: window.innerHeight * yFraction, color },
    ]);
    setTimeout(() => {
      setPhasePulses((prev) => prev.filter((p) => p.id !== pulseId));
    }, 1200);

    // 2. Scan line sweep
    setScanLineY(window.innerHeight * 0.15);
    setShowScanLine(true);
    setTimeout(() => setShowScanLine(false), 600);

    // 3. Corner brackets at section top
    setBrackets({ top: window.innerHeight * 0.12, color });
    setTimeout(() => setBrackets(null), 1600);

    // 4. Ripple from origin
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setTimeout(() => {
      const coords = (() => {
        if (!section) return { x: vw / 2, y: vh / 2 };
        switch (section.ripple_origin_hint) {
          case "search-box": return { x: vw / 2, y: vh * 0.22 };
          case "left-panel": return { x: vw * 0.25, y: vh * 0.5 };
          case "right-panel": return { x: vw * 0.72, y: vh * 0.5 };
          default: return { x: vw / 2, y: vh / 2 };
        }
      })();
      pulseAt(coords.x, coords.y, 0.8);
    }, 250);
  }, [activeSectionId, pulseAt]);

  const activeSection = activeSectionId ? SECTION_BY_ID[activeSectionId] : null;
  const activeTone = (activeSection?.tone as keyof typeof TONE_COLOR) ?? "cyan";
  const activeColor = TONE_COLOR[activeTone];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {/* Left calibration tick rail */}
      <div
        style={{
          position: "absolute",
          left: 16,
          top: 80,
          bottom: 0,
          width: 20,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
          alignItems: "flex-end",
          gap: 0,
        }}
      >
        {Array.from({ length: TICK_COUNT_LEFT }).map((_, i) => {
          const isAlignedZone = i >= Math.floor(TICK_COUNT_LEFT * 0.3) && i <= Math.floor(TICK_COUNT_LEFT * 0.7);
          return (
            <motion.div
              key={i}
              style={{
                height: 1,
                background: activeColor,
                transformOrigin: "right center",
              }}
              animate={{
                width: isAlignedZone ? [6, 10, 6] : [3, 5, 3],
                opacity: isAlignedZone ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 3 + (i % 3) * 0.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.05,
              }}
            />
          );
        })}
      </div>

      {/* Right calibration tick rail */}
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 80,
          bottom: 0,
          width: 20,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
          alignItems: "flex-start",
          gap: 0,
        }}
      >
        {Array.from({ length: TICK_COUNT_RIGHT }).map((_, i) => {
          const isAlignedZone = i >= Math.floor(TICK_COUNT_RIGHT * 0.3) && i <= Math.floor(TICK_COUNT_RIGHT * 0.7);
          return (
            <motion.div
              key={i}
              style={{
                height: 1,
                background: activeColor,
                transformOrigin: "left center",
              }}
              animate={{
                width: isAlignedZone ? [6, 10, 6] : [3, 5, 3],
                opacity: isAlignedZone ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 3 + ((TICK_COUNT_RIGHT - i) % 3) * 0.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.05,
              }}
            />
          );
        })}
      </div>

      {/* Section index ticks (right) — progress indicator */}
      {SECTION_MAP.map((section, i) => {
        const isLocked = (() => {
          const idx = SECTION_MAP.findIndex((s) => s.id === activeSectionId);
          return i <= idx;
        })();
        const color = TONE_COLOR[section.tone as keyof typeof TONE_COLOR];
        return (
          <motion.div
            key={section.id}
            style={{
              position: "absolute",
              right: 40,
              top: `${(i / (SECTION_MAP.length - 1)) * 85 + 8}%`,
              width: isLocked ? 12 : 4,
              height: 1,
              background: color,
              transition: "width 0.4s ease",
              opacity: isLocked ? 0.5 : 0.15,
            }}
          />
        );
      })}

      {/* Phase-lock pulses */}
      <AnimatePresence>
        {phasePulses.map((pulse) => (
          <motion.div
            key={pulse.id}
            style={{
              position: "absolute",
              left: "50%",
              top: pulse.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            {[0, 1, 2].map((ring) => (
              <motion.div
                key={ring}
                style={{
                  position: "absolute",
                  borderRadius: "50%",
                  border: `1px solid ${pulse.color}`,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                initial={{ width: 4, height: 4, opacity: 0.8 }}
                animate={{
                  width: 120 + ring * 60,
                  height: 120 + ring * 60,
                  opacity: 0,
                }}
                exit={{}}
                transition={{
                  duration: 0.8 + ring * 0.2,
                  ease: "easeOut",
                  delay: ring * 0.1,
                }}
              />
            ))}
            {/* Center lock dot */}
            <motion.div
              style={{
                position: "absolute",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: pulse.color,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 3 }}
              exit={{}}
              transition={{ duration: 0.4 }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Scan line */}
      <AnimatePresence>
        {showScanLine && (
          <motion.div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 1,
              top: scanLineY ?? 100,
              background: `linear-gradient(90deg, transparent, ${activeColor}60, ${activeColor}80, ${activeColor}60, transparent)`,
            }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Corner brackets */}
      <AnimatePresence>
        {brackets && (
          <>
            {/* Top-left bracket */}
            <motion.div
              style={{
                position: "absolute",
                left: 36,
                top: brackets.top,
                width: 16,
                height: 16,
                borderTop: `1px solid ${brackets.color}`,
                borderLeft: `1px solid ${brackets.color}`,
                opacity: 0.5,
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            {/* Top-right bracket */}
            <motion.div
              style={{
                position: "absolute",
                right: 36,
                top: brackets.top,
                width: 16,
                height: 16,
                borderTop: `1px solid ${brackets.color}`,
                borderRight: `1px solid ${brackets.color}`,
                opacity: 0.5,
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Section phase label (bottom-left micro-display) */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 40,
          fontSize: "8px",
          fontFamily: "monospace",
          letterSpacing: "0.1em",
          color: activeColor,
          opacity: 0.4,
          textTransform: "uppercase",
        }}
      >
        {activeSectionId ?? "–"} · {activeTone}
      </div>

      {/* Precision crosshair (center viewport, very subtle) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      >
        <motion.div
          style={{
            width: 20,
            height: 1,
            background: `${activeColor}20`,
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
          animate={{ opacity: [0.1, 0.3, 0.1], scaleX: [0.8, 1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          style={{
            width: 1,
            height: 20,
            background: `${activeColor}20`,
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
          animate={{ opacity: [0.1, 0.3, 0.1], scaleY: [0.8, 1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
        />
      </div>
    </div>
  );
}
