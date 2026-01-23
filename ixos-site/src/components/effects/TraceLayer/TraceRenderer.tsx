"use client";

import { useMemo } from "react";
import type { TraceRendererProps, PathSegment, Point, AccentColor } from "./types";
import { pathToSvgData } from "@/lib/tracePathfinder";
import { ACCENT_HEX } from "./types";

/**
 * Renders SVG traces with multiple visual layers:
 * - Base trace (subtle, always visible)
 * - Active trace (colored, glowing)
 * - Corner nodes at turn points
 */
export function TraceRenderer({ paths, scrollY, dimensions }: TraceRendererProps) {
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  // Calculate which paths are visible/active based on scroll
  const pathStates = useMemo(() => {
    return paths.map((path) => {
      // Calculate how far into viewing this path we are
      const viewTop = scrollY;
      const viewBottom = scrollY + viewportHeight;

      // Path is visible if any part is in viewport
      const isVisible = path.endY >= viewTop - 200 && path.startY <= viewBottom + 200;

      // Path is active (highlighted) if we've scrolled past its start
      const activationPoint = scrollY + viewportHeight * 0.5;
      const progress = Math.max(0, Math.min(1, (activationPoint - path.startY) / (path.endY - path.startY)));

      return { path, isVisible, progress };
    });
  }, [paths, scrollY, viewportHeight]);

  return (
    <svg
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0"
      preserveAspectRatio="xMidYMin slice"
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      <defs>
        {/* Glow filters for each color */}
        <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#F6B94C" floodOpacity="0.5" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-teal" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#14B8A6" floodOpacity="0.5" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-violet" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#A78BFA" floodOpacity="0.5" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-magenta" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#F472B6" floodOpacity="0.5" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Subtle blur for base traces */}
        <filter id="trace-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
      </defs>

      {/* Render all paths */}
      {pathStates.map(({ path, isVisible, progress }) => (
        <PathGroup
          key={path.id}
          path={path}
          isVisible={isVisible}
          progress={progress}
        />
      ))}
    </svg>
  );
}

interface PathGroupProps {
  path: PathSegment;
  isVisible: boolean;
  progress: number;
}

function PathGroup({ path, isVisible, progress }: PathGroupProps) {
  const pathData = useMemo(
    () => pathToSvgData(path.points, 12),
    [path.points]
  );

  // Get corner points for node rendering (skip first and last)
  const cornerPoints = useMemo(() => {
    if (path.points.length <= 2) return [];
    return path.points.slice(1, -1);
  }, [path.points]);

  const color = ACCENT_HEX[path.color];
  const glowFilter = `url(#glow-${path.color})`;

  // Calculate stroke dash for animated drawing effect
  const pathLength = path.length;
  const drawnLength = pathLength * Math.min(1, progress * 1.2); // Slightly ahead of progress

  if (!isVisible) return null;

  return (
    <g>
      {/* Layer 1: Base trace - always visible, very subtle */}
      <path
        d={pathData}
        stroke="rgba(243, 245, 247, 0.06)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Layer 2: Glow trace - wider, blurred */}
      <path
        d={pathData}
        stroke={color}
        strokeWidth="6"
        strokeOpacity={0.15 + progress * 0.15}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={glowFilter}
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength - drawnLength}
      />

      {/* Layer 3: Main colored trace */}
      <path
        d={pathData}
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity={0.4 + progress * 0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength - drawnLength}
      />

      {/* Layer 4: Bright core trace */}
      <path
        d={pathData}
        stroke="rgba(255, 255, 255, 0.8)"
        strokeWidth="0.5"
        strokeOpacity={progress * 0.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength - drawnLength}
      />

      {/* Corner nodes - small circles at turn points */}
      {cornerPoints.map((point, idx) => {
        // Only show nodes that have been "reached" by the trace
        const nodeProgress = (idx + 1) / (cornerPoints.length + 1);
        const isReached = progress >= nodeProgress;

        return (
          <g key={`node-${idx}`}>
            {/* Node glow */}
            <circle
              cx={point.x}
              cy={point.y}
              r={isReached ? 4 : 2}
              fill={color}
              fillOpacity={isReached ? 0.3 : 0.1}
              filter={isReached ? glowFilter : undefined}
            />
            {/* Node core */}
            <circle
              cx={point.x}
              cy={point.y}
              r={isReached ? 2 : 1}
              fill={isReached ? color : "rgba(243, 245, 247, 0.3)"}
            />
          </g>
        );
      })}
    </g>
  );
}
