"use client";

import { useMemo } from "react";
import type { SignalPacketProps } from "./types";
import { ACCENT_HEX } from "./types";

/**
 * Signal packet - a glowing dot that travels along the trace paths
 * following the user's scroll position
 */
export function SignalPacket({ paths, scrollProgress, totalLength }: SignalPacketProps) {
  const packetState = useMemo(() => {
    if (paths.length === 0 || totalLength === 0) {
      return null;
    }

    // Calculate target distance along combined path
    const targetDistance = scrollProgress * totalLength;

    // Find which path segment we're on
    let accumulatedLength = 0;
    let currentPath = paths[0];
    let distanceInCurrentPath = targetDistance;

    for (const path of paths) {
      if (accumulatedLength + path.length >= targetDistance) {
        currentPath = path;
        distanceInCurrentPath = targetDistance - accumulatedLength;
        break;
      }
      accumulatedLength += path.length;
    }

    // Get position along current path using linear interpolation
    const position = getPointAtPathDistance(currentPath.points, distanceInCurrentPath);

    if (!position) return null;

    return {
      x: position.x,
      y: position.y,
      color: currentPath.color,
    };
  }, [paths, scrollProgress, totalLength]);

  // Don't render if no position or at very start
  if (!packetState || scrollProgress < 0.01) {
    return null;
  }

  const color = ACCENT_HEX[packetState.color];

  return (
    <>
      {/* Large outer glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: packetState.x - 16,
          top: packetState.y - 16,
          width: 32,
          height: 32,
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
          transform: "translate3d(0, 0, 0)",
        }}
      />

      {/* Medium glow ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: packetState.x - 8,
          top: packetState.y - 8,
          width: 16,
          height: 16,
          background: color,
          opacity: 0.4,
          filter: "blur(4px)",
          transform: "translate3d(0, 0, 0)",
        }}
      />

      {/* Main packet body */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: packetState.x - 5,
          top: packetState.y - 5,
          width: 10,
          height: 10,
          background: color,
          boxShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
          transform: "translate3d(0, 0, 0)",
        }}
      />

      {/* Bright white core */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: packetState.x - 2,
          top: packetState.y - 2,
          width: 4,
          height: 4,
          background: "white",
          opacity: 0.95,
          transform: "translate3d(0, 0, 0)",
        }}
      />
    </>
  );
}

/**
 * Get point at a specific distance along a path
 * Properly handles Manhattan routing (separate horizontal and vertical segments)
 */
function getPointAtPathDistance(
  points: Array<{ x: number; y: number }>,
  distance: number
): { x: number; y: number } | null {
  if (points.length < 2) return points[0] || null;
  if (distance <= 0) return points[0];

  let traveled = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // Calculate segment length (Manhattan distance for grid-aligned paths)
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const segmentLength = Math.abs(dx) + Math.abs(dy);

    if (traveled + segmentLength >= distance) {
      // We're within this segment
      const remaining = distance - traveled;

      // For Manhattan paths, we move horizontally first, then vertically
      const hDist = Math.abs(dx);

      if (remaining <= hDist) {
        // Still in horizontal portion
        return {
          x: prev.x + Math.sign(dx) * remaining,
          y: prev.y,
        };
      } else {
        // In vertical portion
        const vertRemaining = remaining - hDist;
        return {
          x: curr.x,
          y: prev.y + Math.sign(dy) * vertRemaining,
        };
      }
    }

    traveled += segmentLength;
  }

  // If we've gone past the end, return the last point
  return points[points.length - 1];
}
