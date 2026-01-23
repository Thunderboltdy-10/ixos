"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createSeededRandom, getPageLoadSeed } from "@/lib/seededRandom";
import { collectAvoidZones } from "@/lib/avoidZones";
import { findPath } from "@/lib/tracePathfinder";
import type {
  Anchor,
  PathSegment,
  Junction,
  TraceSystemState,
  AccentColor,
  Point,
} from "@/components/effects/TraceLayer/types";
import { SECTION_COLORS } from "@/components/effects/TraceLayer/types";

interface UseTraceSystemOptions {
  enabled?: boolean;
}

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function useTraceSystem(options: UseTraceSystemOptions = {}): TraceSystemState {
  const { enabled = true } = options;

  const [state, setState] = useState<TraceSystemState>({
    paths: [],
    junctions: [],
    anchors: [],
    totalLength: 0,
    isReady: false,
  });

  // Store seed at component mount time - this ensures it's fresh per page load
  const seedRef = useRef<number | null>(null);
  const rngRef = useRef<(() => number) | null>(null);

  // Initialize seed on mount
  useEffect(() => {
    if (seedRef.current === null) {
      seedRef.current = getPageLoadSeed();
    }
  }, []);

  // Discover anchors from DOM
  const discoverAnchors = useCallback((): Anchor[] => {
    if (typeof window === "undefined") return [];

    const elements = document.querySelectorAll("[data-trace-anchor]");
    const anchors: Anchor[] = [];
    const scrollY = window.scrollY;

    elements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const id = htmlEl.dataset.traceAnchor || `anchor-${index}`;
      const color = (htmlEl.dataset.traceColor as AccentColor) || inferColorFromSection(htmlEl);

      anchors.push({
        id,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top + scrollY + rect.height / 2,
        },
        color,
        element: htmlEl,
        sectionIndex: index,
      });
    });

    // Sort by vertical position
    return anchors.sort((a, b) => a.position.y - b.position.y);
  }, []);

  // Infer color from parent section
  const inferColorFromSection = (element: HTMLElement): AccentColor => {
    const section = element.closest("section");
    if (!section) return "teal";

    for (const [className, color] of Object.entries(SECTION_COLORS)) {
      if (section.classList.contains(className)) {
        return color;
      }
    }

    return "teal";
  };

  // Generate paths between anchors
  const generatePaths = useCallback(
    (anchors: Anchor[], rng: () => number): PathSegment[] => {
      if (anchors.length < 2) return [];
      if (typeof window === "undefined") return [];

      const viewportWidth = window.innerWidth;
      const avoidZones = collectAvoidZones();
      const paths: PathSegment[] = [];

      for (let i = 0; i < anchors.length - 1; i++) {
        const startAnchor = anchors[i];
        const endAnchor = anchors[i + 1];

        const start = startAnchor.position;
        const end = endAnchor.position;

        // Generate path with routing
        const pathResult = findPath(start, end, avoidZones, viewportWidth, rng);

        // Determine color (use end anchor's color for transition effect)
        const color = endAnchor.color;

        paths.push({
          id: `path-${startAnchor.id}-${endAnchor.id}`,
          points: pathResult.points,
          color,
          startAnchor: startAnchor.id,
          endAnchor: endAnchor.id,
          length: pathResult.length,
          startY: Math.min(...pathResult.points.map((p) => p.y)),
          endY: Math.max(...pathResult.points.map((p) => p.y)),
        });
      }

      return paths;
    },
    []
  );

  // Generate junctions at anchor points
  const generateJunctions = useCallback((anchors: Anchor[]): Junction[] => {
    return anchors.map((anchor) => ({
      id: `junction-${anchor.id}`,
      position: anchor.position,
      color: anchor.color,
      anchorId: anchor.id,
    }));
  }, []);

  // Calculate system
  const calculateSystem = useCallback(() => {
    if (typeof window === "undefined" || !enabled) return;

    // Initialize RNG with the page load seed
    if (!rngRef.current && seedRef.current !== null) {
      rngRef.current = createSeededRandom(seedRef.current);
    }

    if (!rngRef.current) return;

    const rng = rngRef.current;
    const anchors = discoverAnchors();

    if (anchors.length < 2) {
      setState({
        paths: [],
        junctions: [],
        anchors: [],
        totalLength: 0,
        isReady: true,
      });
      return;
    }

    const paths = generatePaths(anchors, rng);
    const junctions = generateJunctions(anchors);
    const totalLength = paths.reduce((sum, p) => sum + p.length, 0);

    setState({
      paths,
      junctions,
      anchors,
      totalLength,
      isReady: true,
    });
  }, [enabled, discoverAnchors, generatePaths, generateJunctions]);

  // Debounced recalculation for resize
  const debouncedCalculate = useCallback(
    debounce(() => {
      // Reset RNG with a new seed on resize
      seedRef.current = getPageLoadSeed();
      rngRef.current = createSeededRandom(seedRef.current);
      calculateSystem();
    }, 300),
    [calculateSystem]
  );

  // Initial calculation - wait for DOM to be fully ready
  useEffect(() => {
    if (!enabled) return;

    // Wait longer for DOM and scroll position to settle
    const timer = setTimeout(() => {
      calculateSystem();
    }, 500);

    return () => clearTimeout(timer);
  }, [enabled, calculateSystem]);

  // Recalculate on resize
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("resize", debouncedCalculate);
    return () => window.removeEventListener("resize", debouncedCalculate);
  }, [enabled, debouncedCalculate]);

  return state;
}
