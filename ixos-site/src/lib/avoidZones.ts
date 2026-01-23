/**
 * Avoid zone detection for trace routing.
 * Identifies DOM elements that traces should route around.
 * Uses getBoundingClientRect() for accurate positioning.
 */

export interface AvoidZone {
  x: number;
  y: number;
  width: number;
  height: number;
  padding: number;
}

export interface ExpandedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Padding by element type
const PADDING = {
  heading: 60,     // h1-h6 need more space
  paragraph: 40,   // p tags
  text: 32,        // spans, labels
  interactive: 40, // buttons, links
  card: 24,        // card containers
} as const;

/**
 * Collect all avoid zones from the DOM
 * Uses document-relative coordinates (adds scrollY to viewport-relative rects)
 */
export function collectAvoidZones(): AvoidZone[] {
  if (typeof window === 'undefined' || typeof document === 'undefined') return [];

  const zones: AvoidZone[] = [];
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  // Get the app root to scope our queries
  const appRoot = document.getElementById('app-root') || document.body;

  // Collect headings (largest padding)
  const headings = appRoot.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((el) => addZone(el as HTMLElement, PADDING.heading, zones, scrollX, scrollY));

  // Collect paragraphs
  const paragraphs = appRoot.querySelectorAll('p');
  paragraphs.forEach((el) => addZone(el as HTMLElement, PADDING.paragraph, zones, scrollX, scrollY));

  // Collect interactive elements
  const interactive = appRoot.querySelectorAll('button, a, input, select, textarea, [role="button"]');
  interactive.forEach((el) => addZone(el as HTMLElement, PADDING.interactive, zones, scrollX, scrollY));

  // Collect text spans that have visible content
  const spans = appRoot.querySelectorAll('span, label');
  spans.forEach((el) => {
    const htmlEl = el as HTMLElement;
    // Only add if it has direct text content
    if (htmlEl.textContent && htmlEl.textContent.trim().length > 0) {
      addZone(htmlEl, PADDING.text, zones, scrollX, scrollY);
    }
  });

  // Collect card-like containers
  const cards = appRoot.querySelectorAll('[class*="card"], [class*="panel"], [class*="Card"], [class*="Panel"]');
  cards.forEach((el) => addZone(el as HTMLElement, PADDING.card, zones, scrollX, scrollY));

  // Collect elements explicitly marked to avoid
  const marked = appRoot.querySelectorAll('[data-trace-avoid]');
  marked.forEach((el) => {
    const padding = parseInt((el as HTMLElement).dataset.traceAvoidPadding || '40', 10);
    addZone(el as HTMLElement, padding, zones, scrollX, scrollY);
  });

  return zones;
}

function addZone(
  el: HTMLElement,
  padding: number,
  zones: AvoidZone[],
  scrollX: number,
  scrollY: number
): void {
  // Skip elements that are trace anchors (we want to connect TO them)
  if (el.hasAttribute('data-trace-anchor')) return;

  // Skip elements marked to ignore
  if (el.hasAttribute('data-trace-ignore')) return;

  // Skip hidden elements
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

  const rect = el.getBoundingClientRect();

  // Skip tiny elements
  if (rect.width < 10 || rect.height < 10) return;

  // Convert viewport-relative to document-relative coordinates
  zones.push({
    x: rect.left + scrollX,
    y: rect.top + scrollY,
    width: rect.width,
    height: rect.height,
    padding,
  });
}

/**
 * Get the expanded bounding box for an avoid zone (includes padding)
 */
export function getExpandedRect(zone: AvoidZone): ExpandedRect {
  return {
    left: zone.x - zone.padding,
    top: zone.y - zone.padding,
    right: zone.x + zone.width + zone.padding,
    bottom: zone.y + zone.height + zone.padding,
  };
}

/**
 * Check if a point intersects any avoid zone
 */
export function pointIntersectsZones(
  x: number,
  y: number,
  zones: AvoidZone[]
): boolean {
  return zones.some((zone) => {
    const rect = getExpandedRect(zone);
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
}

/**
 * Check if a line segment intersects any avoid zone
 */
export function lineIntersectsZones(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  zones: AvoidZone[]
): boolean {
  // Sample points along the line
  const distance = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  const steps = Math.max(Math.ceil(distance / 10), 1);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (pointIntersectsZones(x, y, zones)) {
      return true;
    }
  }
  return false;
}

/**
 * Get zones within a vertical range (for performance optimization)
 */
export function getZonesInRange(
  zones: AvoidZone[],
  minY: number,
  maxY: number
): AvoidZone[] {
  return zones.filter((zone) => {
    const rect = getExpandedRect(zone);
    return rect.bottom >= minY && rect.top <= maxY;
  });
}

/**
 * Merge overlapping zones for performance (optional)
 */
export function mergeOverlappingZones(zones: AvoidZone[]): AvoidZone[] {
  // For now, just return as-is - merging can reduce accuracy
  return zones;
}
