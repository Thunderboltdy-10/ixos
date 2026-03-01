"use client";

/**
 * MinimalCalibration — /3 connector (Precision Grid edition)
 *
 * Scan-beam-aware variant. Full HUD rail system:
 * - Left/right amber vertical rails with tick marks every 60px
 * - Section progress ticks labeled 01, 02, 03…
 * - Active tick: bright amber with a horizontal beam extending 40px right
 * - Center scan line: moves with scroll-driven scan beam position
 * - Phase-lock pulse on section change
 * - Corner brackets at section boundaries
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectorProps } from "./types";
import { SECTION_MAP, SECTION_BY_ID } from "../SECTION_MAP";

const AMBER = "#F6B94C";
const TEAL = "#14B8A6";
const VIOLET = "#7C3AED";

const TONE_COLOR = {
  cyan: TEAL,
  amber: AMBER,
  violet: VIOLET,
};

interface PhasePulse {
  id: string;
  y: number;
  color: string;
}

const RAIL_TICK_SPACING = 60; // px between ticks

function RailTick({
  side,
  y,
  isActive,
  isSectionTick,
  sectionIndex,
  color,
}: {
  side: "left" | "right";
  y: number;
  isActive: boolean;
  isSectionTick: boolean;
  sectionIndex?: number;
  color: string;
}) {
  const tickWidth = isSectionTick ? (isActive ? 16 : 8) : (isActive ? 10 : 4);
  const opacity = isSectionTick ? (isActive ? 0.7 : 0.25) : (isActive ? 0.4 : 0.12);

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        [side]: 0,
        display: "flex",
        alignItems: "center",
        gap: 0,
        transform: "translateY(-50%)",
      }}
    >
      {/* Section label (left rail only, section ticks only) */}
      {side === "left" && isSectionTick && sectionIndex !== undefined && (
        <span
          style={{
            fontSize: 7,
            fontFamily: "monospace",
            color: isActive ? color : "rgba(246,185,76,0.25)",
            letterSpacing: "0.08em",
            marginRight: 3,
            minWidth: 14,
            textAlign: "right",
            userSelect: "none",
            opacity: isActive ? 0.8 : 0.5,
          }}
        >
          {String(sectionIndex + 1).padStart(2, "0")}
        </span>
      )}

      {/* The tick line */}
      <motion.div
        style={{
          height: 1,
          background: isActive ? color : `${AMBER}60`,
          width: tickWidth,
          transition: "width 0.35s ease, opacity 0.35s ease",
          opacity,
        }}
      />

      {/* Active section: horizontal beam extending inward */}
      {isActive && isSectionTick && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 40, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            height: 1,
            background: `linear-gradient(${side === "left" ? "90deg" : "270deg"}, ${color}80, transparent)`,
            position: "absolute",
            [side === "left" ? "left" : "right"]: "100%",
          }}
        />
      )}
    </div>
  );
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
  const [viewportHeight, setViewportHeight] = useState(800);
  const prevActiveRef = useRef<string | null>(null);
  const pulseCountRef = useRef(0);

  // Track viewport height for tick positioning
  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Fire calibration effects when active section changes
  useEffect(() => {
    if (!activeSectionId || activeSectionId === prevActiveRef.current) return;
    prevActiveRef.current = activeSectionId;

    const section = SECTION_BY_ID[activeSectionId];
    const color =
      section ? TONE_COLOR[section.tone as keyof typeof TONE_COLOR] ?? AMBER : AMBER;

    // 1. Phase-lock pulse
    const pulseId = `pulse-${pulseCountRef.current++}`;
    const yFraction = 0.18;
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

    // 3. Corner brackets
    setBrackets({ top: window.innerHeight * 0.12, color });
    setTimeout(() => setBrackets(null), 1600);

    // 4. Ripple origin
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setTimeout(() => {
      const coords = (() => {
        if (!section) return { x: vw / 2, y: vh / 2 };
        switch (section.ripple_origin_hint) {
          case "search-box":
            return { x: vw / 2, y: vh * 0.22 };
          case "left-panel":
            return { x: vw * 0.25, y: vh * 0.5 };
          case "right-panel":
            return { x: vw * 0.72, y: vh * 0.5 };
          default:
            return { x: vw / 2, y: vh / 2 };
        }
      })();
      pulseAt(coords.x, coords.y, 0.8);
    }, 250);
  }, [activeSectionId, pulseAt]);

  const activeSection = activeSectionId ? SECTION_BY_ID[activeSectionId] : null;
  const activeTone =
    (activeSection?.tone as keyof typeof TONE_COLOR) ?? "amber";
  const activeColor = TONE_COLOR[activeTone] ?? AMBER;

  // Build tick positions for rails
  const railHeight = viewportHeight - 80;
  const tickCount = Math.floor(railHeight / RAIL_TICK_SPACING);

  // Map sections to tick indices
  const sectionTickMap = SECTION_MAP.map((sec, i) => ({
    ...sec,
    tickIdx: Math.round((i / Math.max(SECTION_MAP.length - 1, 1)) * (tickCount - 1)),
    isActive: sec.id === activeSectionId,
    isLocked: (() => {
      const curIdx = SECTION_MAP.findIndex((s) => s.id === activeSectionId);
      return i <= curIdx;
    })(),
  }));
  const sectionTickIdxSet = new Set(sectionTickMap.map((s) => s.tickIdx));

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
      {/* ── Left amber vertical rail ── */}
      <div
        style={{
          position: "absolute",
          left: 28,
          top: 80,
          bottom: 0,
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${AMBER}20 10%, ${AMBER}20 90%, transparent)`,
        }}
      />

      {/* ── Right amber vertical rail ── */}
      <div
        style={{
          position: "absolute",
          right: 28,
          top: 80,
          bottom: 0,
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${AMBER}20 10%, ${AMBER}20 90%, transparent)`,
        }}
      />

      {/* ── Left rail ticks ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 80,
          width: 44,
          height: railHeight,
        }}
      >
        {Array.from({ length: tickCount }).map((_, i) => {
          const y = i * RAIL_TICK_SPACING;
          const sectionEntry = sectionTickMap.find((s) => s.tickIdx === i);
          const isSectionTick = sectionTickIdxSet.has(i);
          const isActive = sectionEntry?.isActive ?? false;
          const sectionIdx = sectionEntry
            ? SECTION_MAP.findIndex((s) => s.id === sectionEntry.id)
            : undefined;

          return (
            <RailTick
              key={i}
              side="left"
              y={y}
              isActive={isActive}
              isSectionTick={isSectionTick}
              sectionIndex={sectionIdx}
              color={isActive ? activeColor : AMBER}
            />
          );
        })}
      </div>

      {/* ── Right rail ticks ── */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 80,
          width: 44,
          height: railHeight,
        }}
      >
        {Array.from({ length: tickCount }).map((_, i) => {
          const y = i * RAIL_TICK_SPACING;
          const sectionEntry = sectionTickMap.find((s) => s.tickIdx === i);
          const isSectionTick = sectionTickIdxSet.has(i);
          const isActive = sectionEntry?.isActive ?? false;

          return (
            <RailTick
              key={i}
              side="right"
              y={y}
              isActive={isActive}
              isSectionTick={isSectionTick}
              color={isActive ? activeColor : AMBER}
            />
          );
        })}
      </div>

      {/* ── Section progress indicators (right rail, labeled) ── */}
      {SECTION_MAP.map((section, i) => {
        const isLocked = (() => {
          const idx = SECTION_MAP.findIndex((s) => s.id === activeSectionId);
          return i <= idx;
        })();
        const color = TONE_COLOR[section.tone as keyof typeof TONE_COLOR] ?? AMBER;
        const topPct = (i / Math.max(SECTION_MAP.length - 1, 1)) * 85 + 8;
        return (
          <motion.div
            key={section.id}
            style={{
              position: "absolute",
              right: 44,
              top: `${topPct}%`,
              width: isLocked ? 14 : 5,
              height: 1,
              background: color,
              transition: "width 0.4s ease",
              opacity: isLocked ? 0.5 : 0.12,
            }}
          />
        );
      })}

      {/* ── Phase-lock pulses ── */}
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
                initial={{ width: 4, height: 4, opacity: 0.7 }}
                animate={{
                  width: 100 + ring * 50,
                  height: 100 + ring * 50,
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

      {/* ── Scroll-driven scan line ── */}
      <AnimatePresence>
        {showScanLine && (
          <motion.div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 1,
              top: scanLineY ?? 100,
              background: `linear-gradient(90deg, transparent, ${activeColor}50, ${activeColor}80, ${activeColor}50, transparent)`,
              boxShadow: `0 0 8px 1px ${activeColor}30`,
            }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* ── Corner brackets at section boundary ── */}
      <AnimatePresence>
        {brackets && (
          <>
            <motion.div
              style={{
                position: "absolute",
                left: 44,
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
            <motion.div
              style={{
                position: "absolute",
                right: 44,
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

      {/* ── Section phase label (bottom-left micro-display) ── */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 48,
          fontSize: "8px",
          fontFamily: "monospace",
          letterSpacing: "0.15em",
          color: activeColor,
          opacity: 0.4,
          textTransform: "uppercase",
        }}
      >
        ▸ {activeSectionId ?? "–"} · PRECISION_GRID
      </div>

      {/* ── Precision crosshair (center viewport, very subtle) ── */}
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
            width: 24,
            height: 1,
            background: `${AMBER}15`,
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
          animate={{ opacity: [0.08, 0.25, 0.08], scaleX: [0.7, 1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          style={{
            width: 1,
            height: 24,
            background: `${AMBER}15`,
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
          animate={{ opacity: [0.08, 0.25, 0.08], scaleY: [0.7, 1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, delay: 0.6 }}
        />
      </div>
    </div>
  );
}
