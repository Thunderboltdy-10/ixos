/**
 * Type definitions for the TraceLayer system.
 */

export type AccentColor = 'amber' | 'teal' | 'violet' | 'magenta';

export interface Point {
  x: number;
  y: number;
}

export interface Anchor {
  id: string;
  position: Point;
  color: AccentColor;
  element: HTMLElement;
  sectionIndex: number;
}

export interface PathSegment {
  id: string;
  points: Point[];
  color: AccentColor;
  startAnchor: string;
  endAnchor: string;
  length: number;
  startY: number;
  endY: number;
}

export interface Junction {
  id: string;
  position: Point;
  color: AccentColor;
  anchorId: string;
}

export interface TraceSystemState {
  paths: PathSegment[];
  junctions: Junction[];
  anchors: Anchor[];
  totalLength: number;
  isReady: boolean;
}

export interface TraceRendererProps {
  paths: PathSegment[];
  scrollY: number;
  dimensions: { width: number; height: number };
}

export interface JunctionPadProps {
  junction: Junction;
  isActive: boolean;
}

export interface SignalPacketProps {
  paths: PathSegment[];
  scrollProgress: number;
  totalLength: number;
}

export interface TraceLayerProps {
  className?: string;
}

// Color mapping to CSS variables
export const ACCENT_COLORS: Record<AccentColor, string> = {
  amber: 'var(--color-accent-amber)',
  teal: 'var(--color-accent-teal)',
  violet: 'var(--color-accent-violet)',
  magenta: 'var(--color-accent-magenta)',
};

// Raw hex colors for SVG
export const ACCENT_HEX: Record<AccentColor, string> = {
  amber: '#F6B94C',
  teal: '#14B8A6',
  violet: '#A78BFA',
  magenta: '#F472B6',
};

export const ACCENT_GLOW_COLORS: Record<AccentColor, string> = {
  amber: 'var(--color-accent-amber-glow)',
  teal: 'var(--color-accent-teal-glow)',
  violet: 'var(--color-accent-violet-glow)',
  magenta: 'var(--color-accent-magenta-glow)',
};

// Section to color mapping (default colors per section)
export const SECTION_COLORS: Record<string, AccentColor> = {
  'section-hero': 'amber',
  'section-how': 'teal',
  'section-meeting': 'violet',
  'section-benchmarks': 'violet',
  'section-pricing': 'magenta',
  'section-trust': 'amber',
  'section-faq': 'amber',
};
