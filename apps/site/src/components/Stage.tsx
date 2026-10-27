"use client";

import { animate, motion, useInView } from "framer-motion";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export const EASE = [0.2, 0.7, 0.2, 1] as const;

const Shown = createContext(false);

/** True once the surrounding stage has scrolled into view. */
export const useShown = () => useContext(Shown);

/** Text that rises into place the first time it scrolls into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A section's picture. A yellow line runs along its top edge, like the app's
 * progress line, then the picture fades in and anything inside that calls
 * useShown starts moving.
 */
export function Stage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useInView(ref, { once: true, amount: 0.3 });
  return (
    <div ref={ref} className={`stage ${className}`}>
      <motion.span
        className="stage-line"
        aria-hidden
        initial={{ scaleX: 0, opacity: 1 }}
        animate={shown ? { scaleX: 1, opacity: 0 } : undefined}
        transition={{ scaleX: { delay: 0.15, duration: 0.7, ease: EASE }, opacity: { delay: 0.9, duration: 0.5 } }}
      />
      <motion.div
        className="stage-body"
        initial={{ opacity: 0, y: 10 }}
        animate={shown ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: 0.45, duration: 0.6, ease: EASE }}
      >
        <Shown.Provider value={shown}>{children}</Shown.Provider>
      </motion.div>
    </div>
  );
}

/** Counts up to a number once `start` is true. */
export function Count({ to, start, decimals = 0, delay = 0 }: { to: number; start: boolean; decimals?: number; delay?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    const controls = animate(0, to, { duration: 1.1, delay, ease: EASE, onUpdate: setValue });
    return () => controls.stop();
  }, [to, start, delay]);
  return <>{value.toFixed(decimals)}</>;
}
