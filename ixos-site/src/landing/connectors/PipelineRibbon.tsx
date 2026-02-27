"use client";

/**
 * PipelineRibbonFlyover — /2 connector ("the wow one")
 *
 * A ribbon path links sections like a pipeline. Sections are "stations"
 * on the ribbon running down the RIGHT edge of the viewport.
 *
 * 6 micro-animations:
 * 1. Ribbon flows continuously (SVG animated stroke-dashoffset)
 * 2. Station markers pulse with a "lock-in" effect on scroll activation
 * 3. Active station emits a 3-ring expanding burst (lock-in burst)
 * 4. Ribbon flow speed varies with section tone (cyan=fast, amber=medium, violet=slow)
 * 5. Active segment highlight — segment above active station briefly brightens
 * 6. Mode indicator breathing — top label pulses at ribbon speed
 *
 * 3 user-triggered interactions:
 * 1. Hover station: highlights + shows section title label to the left
 * 2. Click station: snaps to section + fires station lock-in burst + ripple
 * 3. Ribbon speed visually changes when active tone changes
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectorProps } from "./types";
import { SECTION_MAP, SECTION_BY_ID } from "../SECTION_MAP";

// ─── Constants ────────────────────────────────────────────────────────────────

const TONE_COLOR: Record<string, string> = {
  cyan: "#2DD4BF",
  amber: "#F59E0B",
  violet: "#7C3AED",
};

// Animation duration for ribbon flow (seconds) — lower = faster
const TONE_DURATION: Record<string, number> = {
  cyan: 3,    // fast — Flash-like
  amber: 5,   // medium
  violet: 8,  // slow — Pro-like depth
};

const RIBBON_X = 30; // x position within the 60px container
const RIBBON_WIDTH = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSectionScrollY(sectionId: string): number {
  if (typeof document === "undefined") return 0;
  const el = document.querySelector(`[data-section-id="${sectionId}"]`) as HTMLElement | null;
  if (!el) return 0;
  return Math.max(0, el.offsetTop - 80);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StationBurst {
  stationId: string;
  key: number; // incremented each time — forces remount of burst
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PipelineRibbonFlyover({
  sections,
  activeSectionId,
  pulseAt,
}: ConnectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [activeBurst, setActiveBurst] = useState<StationBurst | null>(null);
  const [windowHeight, setWindowHeight] = useState(600);
  const burstCountRef = useRef<Record<string, number>>({});
  const prevActiveRef = useRef<string | null>(null);

  // Track window height for station positioning
  useEffect(() => {
    const onResize = () => setWindowHeight(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Track visited sections and trigger burst on section activation
  useEffect(() => {
    if (!activeSectionId || activeSectionId === prevActiveRef.current) return;
    prevActiveRef.current = activeSectionId;

    // Mark as visited
    setVisitedIds((prev) => new Set([...prev, activeSectionId]));

    // Increment burst counter for this station
    burstCountRef.current[activeSectionId] =
      (burstCountRef.current[activeSectionId] ?? 0) + 1;

    setActiveBurst({
      stationId: activeSectionId,
      key: burstCountRef.current[activeSectionId],
    });
  }, [activeSectionId]);

  // Derive active tone from active section
  const activeSection = activeSectionId ? SECTION_BY_ID[activeSectionId] : null;
  const activeTone = (activeSection?.tone as "cyan" | "amber" | "violet") ?? "cyan";
  const activeColor = TONE_COLOR[activeTone];
  const ribbonDuration = TONE_DURATION[activeTone];

  // Station Y positions — evenly spaced vertically within viewport
  const stationY = useCallback(
    (index: number): number => {
      const total = SECTION_MAP.length;
      return 80 + (index / Math.max(total - 1, 1)) * (windowHeight - 160);
    },
    [windowHeight]
  );

  // Handle station click
  const handleStationClick = useCallback(
    (sectionId: string, tone: string) => {
      // Scroll to section
      const scrollTarget = getSectionScrollY(sectionId);
      window.scrollTo({ top: scrollTarget, behavior: "smooth" });

      // Fire ripple burst
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setTimeout(() => {
        pulseAt(vw * 0.6, vh * 0.5, 1.4);
      }, 350);
    },
    [pulseAt]
  );

  // Active segment index
  const activeIndex = activeSectionId
    ? SECTION_MAP.findIndex((s) => s.id === activeSectionId)
    : -1;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: RIBBON_WIDTH,
        height: "100vh",
        pointerEvents: "none",
        zIndex: 20,
        overflow: "visible",
      }}
    >
      {/* ── SVG ribbon layer ── */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: RIBBON_WIDTH,
          height: "100%",
          overflow: "visible",
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Flowing gradient — cyan top → violet mid → amber bottom */}
          <linearGradient id="prfg-flow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.7" />
            <stop offset="40%" stopColor="#7C3AED" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.4" />
          </linearGradient>
          {/* Active tone gradient */}
          <linearGradient id="prfg-active" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={activeColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={activeColor} stopOpacity="0.2" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="prf-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Static spine — always visible dim line */}
        <line
          x1={RIBBON_X}
          y1={0}
          x2={RIBBON_X}
          y2={windowHeight}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1}
        />

        {/* Animated flowing dashes */}
        <motion.line
          x1={RIBBON_X}
          y1={0}
          x2={RIBBON_X}
          y2={windowHeight}
          stroke="url(#prfg-flow)"
          strokeWidth={1.5}
          strokeDasharray="8 6"
          filter="url(#prf-glow)"
          style={{ opacity: 0.65 }}
          animate={{ strokeDashoffset: [0, -280] }}
          transition={{
            duration: ribbonDuration,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Active segment highlight — segment above the active station brightens */}
        {activeIndex >= 0 && (
          <motion.line
            x1={RIBBON_X}
            y1={stationY(Math.max(0, activeIndex - 1))}
            x2={RIBBON_X}
            y2={stationY(activeIndex)}
            stroke={activeColor}
            strokeWidth={2.5}
            filter="url(#prf-glow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.35] }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            key={`seg-${activeSectionId}`}
          />
        )}

        {/* Station markers — diamond shape per section */}
        {SECTION_MAP.map((section, index) => {
          const y = stationY(index);
          const isActive = section.id === activeSectionId;
          const isVisited = visitedIds.has(section.id);
          const isHovered = hoveredId === section.id;
          const color = TONE_COLOR[section.tone] ?? "#2DD4BF";
          const size = isActive ? 12 : isHovered ? 10 : 8;
          const halfSize = size / 2;

          return (
            <g key={section.id}>
              {/* Lock-in burst rings — 3 expanding concentric circles */}
              {activeBurst?.stationId === section.id && (
                <>
                  {[0, 1, 2].map((ring) => (
                    <motion.circle
                      key={`burst-${activeBurst.key}-${ring}`}
                      cx={RIBBON_X}
                      cy={y}
                      fill="none"
                      stroke={color}
                      strokeWidth={1}
                      initial={{ r: 8, opacity: 0.85 }}
                      animate={{ r: 28 + ring * 10, opacity: 0 }}
                      transition={{
                        duration: 0.55 + ring * 0.12,
                        ease: "easeOut",
                        delay: ring * 0.08,
                      }}
                    />
                  ))}
                </>
              )}

              {/* Diamond station marker */}
              <motion.rect
                x={RIBBON_X - halfSize}
                y={y - halfSize}
                width={size}
                height={size}
                rx={1}
                fill={
                  isActive
                    ? color
                    : isVisited
                    ? `${color}70`
                    : "transparent"
                }
                stroke={color}
                strokeOpacity={isActive ? 1 : isVisited ? 0.6 : 0.28}
                strokeWidth={1}
                filter={isActive ? "url(#prf-glow)" : undefined}
                style={{
                  transformOrigin: `${RIBBON_X}px ${y}px`,
                  transform: "rotate(45deg)",
                  cursor: "pointer",
                  pointerEvents: "all",
                }}
                animate={{
                  width: size,
                  height: size,
                  x: RIBBON_X - halfSize,
                  y: y - halfSize,
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => handleStationClick(section.id, section.tone)}
                onMouseEnter={() => setHoveredId(section.id)}
                onMouseLeave={() => setHoveredId(null)}
              />

              {/* Hover label — appears to the left of the ribbon */}
              <AnimatePresence>
                {isHovered && (
                  <motion.foreignObject
                    x={RIBBON_X - 10 - 140}
                    y={y - 13}
                    width={140}
                    height={26}
                    style={{ pointerEvents: "none", overflow: "visible" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        height: "100%",
                        paddingRight: 8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 9,
                          letterSpacing: "0.08em",
                          color: color,
                          background: "rgba(12,14,16,0.92)",
                          padding: "2px 6px",
                          borderRadius: 3,
                          border: `1px solid ${color}35`,
                          whiteSpace: "nowrap",
                          textTransform: "uppercase",
                        }}
                      >
                        {section.rank} {section.title}
                      </span>
                    </div>
                  </motion.foreignObject>
                )}
              </AnimatePresence>
            </g>
          );
        })}
      </svg>

      {/* Active tone label at top */}
      <motion.div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 7,
          fontFamily: "monospace",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: activeColor,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
        }}
        animate={{ opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: ribbonDuration / 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {activeTone}
      </motion.div>
    </div>
  );
}
