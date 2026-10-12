"use client";
import { useEffect, useState } from "react";

export function useReducedOrLowEnd(): boolean {
  const [lowEnd, setLowEnd] = useState(false);
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Detect low-end: hardware concurrency <= 2 or memory <= 2GB
    const nav = navigator as Navigator & { deviceMemory?: number };
    const isLowEnd =
      prefersReduced ||
      navigator.hardwareConcurrency <= 2 ||
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);
    setLowEnd(isLowEnd);
  }, []);
  return lowEnd;
}
