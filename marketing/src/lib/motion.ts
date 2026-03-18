/**
 * Reusable animation primitives for the Ixos hero film.
 * All driven by useCurrentFrame() — no CSS transitions.
 */
import { Easing, interpolate, spring } from "remotion";

// ── Easing curves (from tokens.css) ─────────────────────────────────────────
export const easeSnap = Easing.bezier(0.2, 0.8, 0.2, 1);
export const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);

export const SPRING_SMOOTH = { damping: 200 } as const;
export const SPRING_SNAPPY = { damping: 20, stiffness: 200 } as const;

// ── Opacity ─────────────────────────────────────────────────────────────────

/** Fade in: opacity 0 → 1 */
export function fadeIn(
  frame: number,
  startFrame: number,
  durationFrames: number,
): number {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
}

/** Fade out: opacity 1 → 0 */
export function fadeOut(
  frame: number,
  startFrame: number,
  durationFrames: number,
): number {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
}

// ── Transform (spring-based) ────────────────────────────────────────────────

/** Slide up: translateY from `distance` → 0. Returns the Y value. */
export function slideUp(
  frame: number,
  fps: number,
  startFrame: number,
  distance: number = 30,
): number {
  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: SPRING_SMOOTH,
  });
  return interpolate(progress, [0, 1], [distance, 0]);
}

/** Slide from right: translateX from `distance` → 0. Returns the X value. */
export function slideRight(
  frame: number,
  fps: number,
  startFrame: number,
  distance: number = 40,
): number {
  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: SPRING_SMOOTH,
  });
  return interpolate(progress, [0, 1], [distance, 0]);
}

/** Scale in: 0.92 → 1. Returns the scale value. */
export function scaleIn(
  frame: number,
  fps: number,
  startFrame: number,
): number {
  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: SPRING_SMOOTH,
  });
  return interpolate(progress, [0, 1], [0.92, 1]);
}

// ── Text ────────────────────────────────────────────────────────────────────

/** Typewriter: returns a substring of `text` based on frame. */
export function typewriter(
  frame: number,
  text: string,
  startFrame: number = 0,
  charsPerFrame: number = 0.5,
): string {
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(text.length, Math.floor(elapsed * charsPerFrame));
  return text.slice(0, charCount);
}

/** Cursor blink: returns opacity 0 or 1. */
export function cursorBlink(frame: number, blinkInterval: number = 16): number {
  return interpolate(
    frame % blinkInterval,
    [0, blinkInterval / 2, blinkInterval],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

// ── Utility ─────────────────────────────────────────────────────────────────

/** Stagger delay: returns the start frame offset for item at `index`. */
export function staggerDelay(index: number, framesPerItem: number = 4): number {
  return index * framesPerItem;
}

/** Progress bar: 0 → 1 with exponential ease out. */
export function progressBar(
  frame: number,
  startFrame: number,
  durationFrames: number,
): number {
  return interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.exp),
    },
  );
}
