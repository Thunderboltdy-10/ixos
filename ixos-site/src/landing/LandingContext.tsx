"use client";

/**
 * LandingContext — shared state for the landing page connector system.
 * Tracks which sections are in view, dispatches ripple pulses,
 * and provides a registry for sections to announce their DOM positions.
 */

import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { LandingSection } from "./SECTION_MAP";
import { getRippleCoords } from "./SECTION_MAP";

export interface SectionEntry {
  id: string;
  inView: boolean;
  element: HTMLElement | null;
  /** Bounding rect center — updated on scroll */
  centerY: number;
}

export interface LandingContextValue {
  /** All registered sections, in order */
  sections: SectionEntry[];
  /** Currently active (most-in-view) section ID */
  activeSectionId: string | null;
  /** Register a section DOM element */
  registerSection: (id: string, el: HTMLElement | null) => void;
  /** Mark a section as in-view or not */
  setSectionInView: (id: string, inView: boolean) => void;
  /** Dispatch a ripple from the given screen coordinates */
  pulseAt: (x: number, y: number, intensity?: number) => void;
  /** Pulse from a section's ripple_origin_hint */
  pulseForSection: (section: LandingSection) => void;
  /** Sequential reveal — highest index shown */
  maxRevealedIndex: number;
  /** Trigger next reveal */
  revealNextSection: () => void;
}

const LandingCtx = createContext<LandingContextValue | null>(null);

export function useLandingContext(): LandingContextValue {
  const ctx = useContext(LandingCtx);
  if (!ctx) throw new Error("useLandingContext must be used inside LandingProvider");
  return ctx;
}

export function LandingProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<SectionEntry[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [maxRevealedIndex, setMaxRevealedIndex] = useState(0); // Start with Hero revealed
  const sectionMapRef = useRef<Map<string, SectionEntry>>(new Map());

  const registerSection = useCallback((id: string, el: HTMLElement | null) => {
    const existing = sectionMapRef.current.get(id);
    if (existing && existing.element === el) return;

    const rect = el?.getBoundingClientRect();
    const entry: SectionEntry = {
      id,
      inView: existing?.inView ?? false,
      element: el,
      centerY: rect ? rect.top + rect.height / 2 + window.scrollY : 0,
    };
    sectionMapRef.current.set(id, entry);
    setSections(Array.from(sectionMapRef.current.values()));
  }, []);

  const setSectionInView = useCallback((id: string, inView: boolean) => {
    const existing = sectionMapRef.current.get(id);
    if (!existing || existing.inView === inView) return;

    const updated = { ...existing, inView };
    sectionMapRef.current.set(id, updated);
    setSections(Array.from(sectionMapRef.current.values()));

    // Set active to the last section that entered view
    if (inView) setActiveSectionId(id);
  }, []);

  const pulseAt = useCallback((x: number, y: number, intensity = 1) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("v4:pulse", {
        detail: { x, y, intensity },
      })
    );
  }, []);

  const pulseForSection = useCallback(
    (section: LandingSection) => {
      if (typeof window === "undefined") return;
      const { x, y } = getRippleCoords(
        section.ripple_origin_hint,
        window.innerWidth,
        window.innerHeight
      );
      pulseAt(x, y, 1.2);
    },
    [pulseAt]
  );

  // Update centerY values on scroll
  useEffect(() => {
    const onScroll = () => {
      sectionMapRef.current.forEach((entry, id) => {
        if (entry.element) {
          const rect = entry.element.getBoundingClientRect();
          entry.centerY = rect.top + rect.height / 2 + window.scrollY;
        }
        sectionMapRef.current.set(id, entry);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const revealNextSection = useCallback(() => {
    setMaxRevealedIndex((prev) => prev + 1);
  }, []);

  return (
    <LandingCtx.Provider
      value={{
        sections,
        activeSectionId,
        registerSection,
        setSectionInView,
        pulseAt,
        pulseForSection,
        maxRevealedIndex,
        revealNextSection,
      }}
    >
      {children}
    </LandingCtx.Provider>
  );
}
