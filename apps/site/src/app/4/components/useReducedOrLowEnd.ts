"use client";

import { useEffect, useState } from "react";

export function useReducedOrLowEnd(): boolean {
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowCores = (navigator.hardwareConcurrency ?? 4) <= 2;
    const lowMemory =
      ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4) <= 2;
    setIsLowEnd(prefersReduced || lowCores || lowMemory);
  }, []);

  return isLowEnd;
}
