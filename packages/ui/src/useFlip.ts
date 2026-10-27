"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Slides children marked with data-flip from their previous position when the
 * order changes, so a re-ranked list moves instead of jumping. New children fade in.
 */
export function useFlip(container: RefObject<HTMLElement | null>, order: string) {
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const origin = root.getBoundingClientRect().top;
    const next = new Map<string, number>();
    root.querySelectorAll<HTMLElement>("[data-flip]").forEach((element, index) => {
      const key = element.dataset.flip!;
      const top = element.getBoundingClientRect().top - origin;
      const before = positions.current.get(key);
      next.set(key, top);
      if (still) return;
      if (before === undefined) {
        element.animate(
          [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 260, delay: index * 35, easing: "ease-out", fill: "backwards" },
        );
      } else if (Math.abs(before - top) > 1) {
        element.animate(
          [{ transform: `translateY(${before - top}px)` }, { transform: "none" }],
          { duration: 560, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
        );
      }
    });
    positions.current = next;
  }, [container, order]);
}
