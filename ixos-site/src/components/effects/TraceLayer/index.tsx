"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTraceSystem } from "@/hooks/useTraceSystem";
import { TraceRenderer } from "./TraceRenderer";
import { JunctionPad } from "./JunctionPad";
import { SignalPacket } from "./SignalPacket";
import type { TraceLayerProps } from "./types";

// TypeScript augmentation for global trace points (for particles)
declare global {
  interface Window {
    __ixosTracePoints: { x: number; y: number }[];
  }
}

export function TraceLayer({ className }: TraceLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 4000 });
  const [scrollY, setScrollY] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // Get trace system state
  const { paths, junctions, totalLength, isReady } = useTraceSystem({
    enabled: !isReducedMotion,
  });

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Update dimensions
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: Math.max(document.documentElement.scrollHeight, 4000),
      });
    };

    updateDimensions();

    // Debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Scroll tracking with RAF throttling
  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number;
    let lastScrollY = window.scrollY;

    const updateScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY !== lastScrollY) {
        lastScrollY = currentScrollY;
        setScrollY(currentScrollY);
      }
      rafId = requestAnimationFrame(updateScroll);
    };

    rafId = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Sync container position with scroll
  // This makes the traces appear fixed to the content (not the viewport)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Transform the container to counteract scroll so traces stay in document position
    container.style.transform = `translate3d(0, -${scrollY}px, 0)`;
  }, [scrollY]);

  // Expose trace points to global scope for particles
  useEffect(() => {
    if (!isReady || paths.length === 0) return;

    const points: { x: number; y: number }[] = [];

    paths.forEach((path) => {
      // Sample every 50px along the path
      for (let i = 0; i < path.points.length - 1; i++) {
        const p1 = path.points[i];
        const p2 = path.points[i + 1];
        const segmentLength = Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
        );
        const samples = Math.ceil(segmentLength / 50);

        for (let j = 0; j <= samples; j++) {
          const t = j / samples;
          points.push({
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t,
          });
        }
      }
    });

    window.__ixosTracePoints = points;
  }, [isReady, paths]);

  // Calculate which junctions are active based on scroll
  const getJunctionActiveState = useCallback(
    (junctionY: number): boolean => {
      const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
      const activationPoint = scrollY + viewportHeight * 0.6;
      return junctionY <= activationPoint;
    },
    [scrollY]
  );

  // Calculate scroll progress for signal packet
  const scrollProgress = typeof window !== "undefined"
    ? scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    : 0;

  if (isReducedMotion) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 pointer-events-none z-0 overflow-visible",
        className
      )}
      aria-hidden="true"
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      {isReady && paths.length > 0 && (
        <>
          {/* SVG Trace Renderer */}
          <TraceRenderer
            paths={paths}
            scrollY={scrollY}
            dimensions={dimensions}
          />

          {/* Junction Pads - rendered in document coordinates */}
          {junctions.map((junction) => (
            <JunctionPad
              key={junction.id}
              junction={junction}
              isActive={getJunctionActiveState(junction.position.y)}
            />
          ))}

          {/* Signal Packet */}
          <SignalPacket
            paths={paths}
            scrollProgress={scrollProgress}
            totalLength={totalLength}
          />
        </>
      )}
    </div>
  );
}

// Re-export types for convenience
export type { TraceLayerProps } from "./types";
