"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, type ReactNode } from "react";

/** Honors the reduced motion setting for every animation on the site. */
export function Motion({ children }: { children: ReactNode }) {
  useEffect(() => {
    const preventSpaceScroll = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof Element && event.target.closest("input, textarea, select, button, a, [contenteditable]"))) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", preventSpaceScroll);
    return () => window.removeEventListener("keydown", preventSpaceScroll);
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
