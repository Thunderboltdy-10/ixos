"use client";

/**
 * SearchResultStack connector — used by /5 (the base vibe).
 * No large overlay. Instead: section-aware ripple origin integration,
 * subtle score bar pulses, and scroll-based glow dots in the result header.
 * The "connector" is invisible but felt — it makes the page feel alive.
 */

import { useEffect, useRef } from "react";
import type { ConnectorProps } from "./types";
import { SECTION_BY_ID } from "../SECTION_MAP";

export function SearchResultStackConnector({
  activeSectionId,
  pulseAt,
}: ConnectorProps) {
  const prevActiveRef = useRef<string | null>(null);

  // When active section changes, emit a ripple from its origin hint
  useEffect(() => {
    if (!activeSectionId || activeSectionId === prevActiveRef.current) return;
    prevActiveRef.current = activeSectionId;

    const section = SECTION_BY_ID[activeSectionId];
    if (!section) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Map hint to coordinates
    const coords = (() => {
      switch (section.ripple_origin_hint) {
        case "search-box": return { x: vw / 2, y: vh * 0.22 };
        case "left-panel": return { x: vw * 0.25, y: vh * 0.5 };
        case "right-panel": return { x: vw * 0.72, y: vh * 0.5 };
        case "top-left": return { x: vw * 0.25, y: vh * 0.28 };
        case "top-right": return { x: vw * 0.75, y: vh * 0.28 };
        case "bottom": return { x: vw / 2, y: vh * 0.78 };
        default: return { x: vw / 2, y: vh / 2 };
      }
    })();

    // Slight delay so the ripple fires when section is fully entered
    const tid = setTimeout(() => {
      pulseAt(coords.x, coords.y, 1.0);
    }, 180);

    return () => clearTimeout(tid);
  }, [activeSectionId, pulseAt]);

  // This connector renders nothing visible — it's purely behavioral
  return null;
}
