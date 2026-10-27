"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** Honors the reduced motion setting for every animation on the site. */
export function Motion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
