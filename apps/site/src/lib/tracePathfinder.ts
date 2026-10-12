/**
 * Manhattan-style pathfinding for trace routing.
 * Creates visually interesting paths with multiple turns that avoid obstacles.
 */

import type { AvoidZone } from './avoidZones';
import { getExpandedRect, getZonesInRange, pointIntersectsZones } from './avoidZones';

export interface Point {
  x: number;
  y: number;
}

export interface PathResult {
  points: Point[];
  length: number;
}

// Grid resolution for pathfinding
const GRID_SIZE = 20;

/**
 * Find a Manhattan-routed path between two points avoiding obstacles
 * Creates visually interesting paths with multiple turns
 */
export function findPath(
  start: Point,
  end: Point,
  avoidZones: AvoidZone[],
  viewportWidth: number,
  rng: () => number
): PathResult {
  // Get relevant zones for this path (with margin)
  const minY = Math.min(start.y, end.y) - 200;
  const maxY = Math.max(start.y, end.y) + 200;
  const relevantZones = getZonesInRange(avoidZones, minY, maxY);

  // Generate a path with multiple waypoints for visual interest
  const path = generateInterestingPath(start, end, relevantZones, viewportWidth, rng);

  return {
    points: path,
    length: calculatePathLength(path),
  };
}

/**
 * Generate a path with multiple waypoints for visual interest
 */
function generateInterestingPath(
  start: Point,
  end: Point,
  zones: AvoidZone[],
  viewportWidth: number,
  rng: () => number
): Point[] {
  const points: Point[] = [{ ...start }];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const verticalDistance = Math.abs(dy);

  // Determine routing strategy based on distance and random choice
  const routeChoice = rng();

  // Define margin positions
  const leftMargin = 40 + rng() * 40; // 40-80px from left
  const rightMargin = viewportWidth - 40 - rng() * 40; // 40-80px from right
  const centerX = viewportWidth / 2 + (rng() - 0.5) * 200; // Center with variation

  if (verticalDistance < 150) {
    // Short vertical distance - simple L-shape
    const midX = start.x + dx * (0.3 + rng() * 0.4);
    points.push({ x: midX, y: start.y });
    points.push({ x: midX, y: end.y });
  } else if (verticalDistance < 400) {
    // Medium distance - add one extra turn for interest
    if (routeChoice < 0.5) {
      // Route via side margin
      const marginX = rng() > 0.5 ? leftMargin : rightMargin;
      const turnY = start.y + dy * (0.4 + rng() * 0.2);

      points.push({ x: start.x, y: turnY }); // Down from start
      points.push({ x: marginX, y: turnY }); // Horizontal to margin
      points.push({ x: marginX, y: end.y }); // Down to end level
    } else {
      // Route with zigzag
      const midY = start.y + dy * 0.5;
      const offsetX = (rng() > 0.5 ? 1 : -1) * (100 + rng() * 150);

      points.push({ x: start.x, y: midY - 50 });
      points.push({ x: start.x + offsetX, y: midY - 50 });
      points.push({ x: start.x + offsetX, y: midY + 50 });
      points.push({ x: end.x, y: midY + 50 });
    }
  } else {
    // Long distance - create interesting multi-segment path
    if (routeChoice < 0.33) {
      // Edge routing with multiple turns
      const marginX = Math.abs(start.x - leftMargin) < Math.abs(start.x - rightMargin)
        ? leftMargin
        : rightMargin;

      // Add intermediate waypoints
      const turn1Y = start.y + 80 + rng() * 100;
      const turn2Y = end.y - 80 - rng() * 100;

      points.push({ x: start.x, y: turn1Y });
      points.push({ x: marginX, y: turn1Y });
      points.push({ x: marginX, y: turn2Y });
      points.push({ x: end.x, y: turn2Y });
    } else if (routeChoice < 0.66) {
      // Center spine routing
      const spineX = centerX;
      const turn1Y = start.y + 60 + rng() * 80;
      const turn2Y = end.y - 60 - rng() * 80;

      points.push({ x: start.x, y: turn1Y });
      points.push({ x: spineX, y: turn1Y });
      points.push({ x: spineX, y: turn2Y });
      points.push({ x: end.x, y: turn2Y });
    } else {
      // Zigzag routing for visual interest
      const numSegments = 2 + Math.floor(rng() * 2); // 2-3 horizontal segments
      const segmentHeight = dy / (numSegments + 1);

      let currentX = start.x;
      let currentY = start.y;

      for (let i = 0; i < numSegments; i++) {
        // Move down
        currentY += segmentHeight;
        points.push({ x: currentX, y: currentY });

        // Move horizontally (alternate directions)
        const direction = i % 2 === 0 ? 1 : -1;
        const offset = direction * (150 + rng() * 200);
        currentX = Math.max(leftMargin, Math.min(rightMargin, start.x + offset));
        points.push({ x: currentX, y: currentY });
      }

      // Final connection to end
      points.push({ x: currentX, y: end.y });
    }
  }

  // Add end point
  points.push({ ...end });

  // Now route around obstacles
  const routedPath = routeAroundObstacles(points, zones, viewportWidth, rng);

  // Snap to grid for clean lines
  return snapToGrid(routedPath);
}

/**
 * Route path segments around obstacles
 */
function routeAroundObstacles(
  points: Point[],
  zones: AvoidZone[],
  viewportWidth: number,
  rng: () => number
): Point[] {
  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const from = result[result.length - 1];
    const to = points[i];

    // Check if direct segment intersects any zone
    if (segmentIntersectsZones(from, to, zones)) {
      // Find a detour
      const detour = findDetour(from, to, zones, viewportWidth, rng);
      result.push(...detour);
    }

    result.push(to);
  }

  return result;
}

/**
 * Check if a line segment intersects any avoid zone
 */
function segmentIntersectsZones(from: Point, to: Point, zones: AvoidZone[]): boolean {
  const steps = Math.max(Math.ceil(Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) / GRID_SIZE), 1);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;

    if (pointIntersectsZones(x, y, zones)) {
      return true;
    }
  }

  return false;
}

/**
 * Find a detour around obstacles
 */
function findDetour(
  from: Point,
  to: Point,
  zones: AvoidZone[],
  viewportWidth: number,
  rng: () => number
): Point[] {
  // Find the blocking zone(s)
  const blockingZones = zones.filter((zone) => {
    const rect = getExpandedRect(zone);
    // Check if zone is in the path of our segment
    const minX = Math.min(from.x, to.x) - 50;
    const maxX = Math.max(from.x, to.x) + 50;
    const minY = Math.min(from.y, to.y);
    const maxY = Math.max(from.y, to.y);

    return rect.left < maxX && rect.right > minX && rect.top < maxY && rect.bottom > minY;
  });

  if (blockingZones.length === 0) return [];

  // Find a clear path around
  // Try going left or right of the obstacle
  const detour: Point[] = [];

  // Find the combined bounding box of blocking zones
  let minLeft = Infinity;
  let maxRight = -Infinity;

  blockingZones.forEach((zone) => {
    const rect = getExpandedRect(zone);
    minLeft = Math.min(minLeft, rect.left);
    maxRight = Math.max(maxRight, rect.right);
  });

  // Decide which side to go around
  const goLeft = rng() > 0.5 || maxRight > viewportWidth - 100;
  const detourX = goLeft ? Math.max(40, minLeft - 60) : Math.min(viewportWidth - 40, maxRight + 60);

  // Create Manhattan detour
  if (Math.abs(from.y - to.y) > Math.abs(from.x - to.x)) {
    // Primarily vertical movement
    detour.push({ x: detourX, y: from.y });
    detour.push({ x: detourX, y: to.y });
  } else {
    // Primarily horizontal movement
    const midY = (from.y + to.y) / 2;
    detour.push({ x: from.x, y: midY });
    detour.push({ x: detourX, y: midY });
    detour.push({ x: detourX, y: to.y });
  }

  return detour;
}

/**
 * Snap points to grid for clean lines
 */
function snapToGrid(points: Point[]): Point[] {
  return points.map((p, i) => {
    // Don't snap start and end points as much
    if (i === 0 || i === points.length - 1) {
      return { x: Math.round(p.x / 5) * 5, y: Math.round(p.y / 5) * 5 };
    }
    return {
      x: Math.round(p.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(p.y / GRID_SIZE) * GRID_SIZE,
    };
  });
}

/**
 * Calculate total path length
 */
function calculatePathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
  }
  return length;
}

/**
 * Convert path points to SVG path data with rounded corners
 */
export function pathToSvgData(points: Point[], cornerRadius: number = 8): string {
  if (points.length < 2) return '';

  const parts: string[] = [];
  parts.push(`M${points[0].x},${points[0].y}`);

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate directions
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Calculate segment lengths
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    // Skip if segments are too short
    if (len1 < 1 || len2 < 1) {
      parts.push(`L${curr.x},${curr.y}`);
      continue;
    }

    // Calculate corner radius (limited by segment lengths)
    const radius = Math.min(cornerRadius, len1 / 2, len2 / 2);

    if (radius > 2) {
      // Point before corner
      const beforeX = curr.x - (dx1 / len1) * radius;
      const beforeY = curr.y - (dy1 / len1) * radius;

      // Point after corner
      const afterX = curr.x + (dx2 / len2) * radius;
      const afterY = curr.y + (dy2 / len2) * radius;

      parts.push(`L${beforeX},${beforeY}`);
      parts.push(`Q${curr.x},${curr.y} ${afterX},${afterY}`);
    } else {
      parts.push(`L${curr.x},${curr.y}`);
    }
  }

  // Final point
  const last = points[points.length - 1];
  parts.push(`L${last.x},${last.y}`);

  return parts.join(' ');
}

/**
 * Get point at a specific distance along the path
 */
export function getPointAtDistance(points: Point[], distance: number): Point | null {
  if (points.length < 2) return points[0] || null;
  if (distance <= 0) return points[0];

  let traveled = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segmentLength = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);

    if (traveled + segmentLength >= distance) {
      // Interpolate within this segment
      const remaining = distance - traveled;

      // Handle Manhattan routing (move on one axis at a time)
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const hDist = Math.abs(dx);
      const vDist = Math.abs(dy);

      if (remaining <= hDist) {
        // Still in horizontal portion
        const t = hDist > 0 ? remaining / hDist : 0;
        return {
          x: prev.x + dx * t,
          y: prev.y,
        };
      } else {
        // In vertical portion
        const vertRemaining = remaining - hDist;
        const t = vDist > 0 ? vertRemaining / vDist : 0;
        return {
          x: curr.x,
          y: prev.y + dy * t,
        };
      }
    }

    traveled += segmentLength;
  }

  return points[points.length - 1];
}
