"use client";

import { QuickSearch } from "@ixos/ui";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMOS, toHit } from "@/lib/demo";
import { MEDIAN, MEMORY_MB, P95, SAMPLES } from "@/lib/latency";
import { Count, EASE, Reveal, Stage, useShown } from "./Stage";

/** Label, width in key units, and the KeyboardEvent code that lights it. */
type Key = [string, number, string];

const ROWS: Key[][] = [
  [["`", 1, "Backquote"], ...digits(), ["-", 1, "Minus"], ["=", 1, "Equal"], ["Backspace", 2, "Backspace"]],
  [["Tab", 1.5, "Tab"], ...letters("QWERTYUIOP"), ["[", 1, "BracketLeft"], ["]", 1, "BracketRight"], ["\\", 1.5, "Backslash"]],
  [["Caps", 1.75, "CapsLock"], ...letters("ASDFGHJKL"), [";", 1, "Semicolon"], ["'", 1, "Quote"], ["Enter", 2.25, "Enter"]],
  [["Shift", 2.25, "ShiftLeft"], ...letters("ZXCVBNM"), [",", 1, "Comma"], [".", 1, "Period"], ["/", 1, "Slash"], ["Shift", 2.75, "ShiftRight"]],
  [
    ["Ctrl", 1.25, "ControlLeft"],
    ["", 1.25, "MetaLeft"],
    ["Alt", 1.25, "AltLeft"],
    ["", 6.25, "Space"],
    ["Alt", 1.25, "AltRight"],
    ["Fn", 1.25, "Fn"],
    ["", 1.25, "ContextMenu"],
    ["Ctrl", 1.25, "ControlRight"],
  ],
];

function digits(): Key[] {
  return "1234567890".split("").map((digit) => [digit, 1, `Digit${digit}`]);
}
function letters(row: string): Key[] {
  return row.split("").map((letter) => [letter, 1, `Key${letter}`]);
}

const SHORTCUT = ["ControlLeft", "Space"];
const RESULTS = DEMOS[0].ranked.slice(0, 3).map(toHit);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function Speed() {
  return (
    <section className="band">
      <div className="section section--split speed">
        <Stage className="speed-stage">
          <Shortcut />
        </Stage>
        <div className="speed-text">
          <Reveal>
            <p className="speed-number">
              <SpeedNumber /> ms
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2>From Ctrl + Space to results.</h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="lede">
              That&apos;s the median for a search in a folder Ixos has already seen, over 260 searches on a Ryzen 7
              5800X. The first search in a new folder takes a few seconds while Ixos reads each file once.
            </p>
          </Reveal>
          <Reveal delay={0.24} className="stats">
            <div>
              <b>{P95} ms</b>
              <span>95th percentile</span>
            </div>
            <div>
              <b>{MEMORY_MB} MB</b>
              <span>memory</span>
            </div>
            <div>
              <b>No GPU</b>
              <span>CPU only</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function SpeedNumber() {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useInView(ref, { once: true });
  return (
    <span ref={ref}>
      <Count to={MEDIAN} start={shown} delay={0.2} />
    </span>
  );
}

/**
 * The keyboard presses Ctrl + Space and the overlay appears after a wait drawn
 * from the measured searches. Pressing the shortcut on the page runs it too.
 */
function Shortcut() {
  const shown = useShown();
  const root = useRef<HTMLDivElement>(null);
  const visible = useInView(root, { amount: 0.4 });
  const still = useReducedMotion();
  const [down, setDown] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [wait, setWait] = useState<number | null>(null);
  const busy = useRef(false);

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    setOpen(false);
    setDown(["ControlLeft"]);
    await sleep(140);
    setDown(SHORTCUT);
    await sleep(sample);
    setWait(sample);
    setOpen(true);
    await sleep(220);
    setDown([]);
    busy.current = false;
  }, []);

  // Plays on its own while in view, with a pause long enough to read.
  useEffect(() => {
    if (!shown || !visible || still) return;
    let live = true;
    (async () => {
      await sleep(900);
      while (live) {
        await run();
        await sleep(2600);
        setOpen(false);
        await sleep(1600);
      }
    })();
    return () => {
      live = false;
    };
  }, [shown, visible, still, run]);

  useEffect(() => {
    if (!visible) return;
    const press = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === "Space") {
        event.preventDefault();
        run();
      } else if (!busy.current) {
        setDown([event.code]);
      }
    };
    const release = () => !busy.current && setDown([]);
    window.addEventListener("keydown", press);
    window.addEventListener("keyup", release);
    return () => {
      window.removeEventListener("keydown", press);
      window.removeEventListener("keyup", release);
    };
  }, [visible, run]);

  return (
    <div ref={root} className="shortcut">
      <div className="shortcut-screen">
        <AnimatePresence>
          {open && (
            <motion.div
              className="shortcut-overlay"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.16, ease: EASE }}
            >
              <QuickSearch
                logo="/assets/logo.png"
                query={<span className="ix-qs-query">{DEMOS[0].query}</span>}
                progress={null}
                hits={RESULTS}
                active={0}
                status={wait !== null ? `${wait.toFixed(1)} ms` : ""}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="keyboard" aria-hidden>
        {ROWS.map((row, index) => (
          <div key={index} className="keyboard-row">
            {row.map(([label, units, code]) => (
              <span
                key={code}
                className={`key${SHORTCUT.includes(code) ? " key--shortcut" : ""}${down.includes(code) ? " is-down" : ""}`}
                style={{ flexGrow: units }}
              >
                {label}
              </span>
            ))}
          </div>
        ))}
      </div>
      <Histogram highlight={wait} />
      <p className="shortcut-note">
        {wait !== null ? (
          <>
            That press waited <b>{wait.toFixed(1)} ms</b>, drawn from the 260 measured searches.
          </>
        ) : (
          "Each press waits as long as one of the 260 measured searches."
        )}{" "}
        <span className="shortcut-try">Press Ctrl + Space to try it.</span>
      </p>
    </div>
  );
}

const LOW = 8;
const HIGH = 100;
const BIN = 2;
const BINS = Array.from({ length: (HIGH - LOW) / BIN }, (_, index) => {
  const from = LOW + index * BIN;
  return { from, count: SAMPLES.filter((ms) => ms >= from && ms < from + BIN).length };
});
const TALLEST = Math.max(...BINS.map((bin) => bin.count));
const at = (ms: number) => `${((ms - LOW) / (HIGH - LOW)) * 100}%`;

/** All 260 searches in 2 ms bins, with the median and 95th percentile marked. */
function Histogram({ highlight }: { highlight: number | null }) {
  const shown = useShown();
  return (
    <div className="histogram" role="img" aria-label={`Search times from 10 to 99 ms, median ${MEDIAN} ms, 95th percentile ${P95} ms`}>
      <div className="histogram-bars">
        {BINS.map((bin, index) => (
          <motion.span
            key={bin.from}
            className={highlight !== null && highlight >= bin.from && highlight < bin.from + BIN ? "is-on" : ""}
            style={{ height: `${(bin.count / TALLEST) * 100}%` }}
            initial={{ scaleY: 0 }}
            animate={shown ? { scaleY: 1 } : undefined}
            transition={{ delay: 0.6 + index * 0.015, duration: 0.5, ease: EASE }}
          />
        ))}
        <span className="histogram-mark" style={{ left: at(26.9) }}>
          median
        </span>
        <span className="histogram-mark" style={{ left: at(55.7) }}>
          95th
        </span>
      </div>
      <div className="histogram-axis">
        {[10, 25, 50, 75, 100].map((ms) => (
          <span key={ms} style={{ left: at(ms) }}>
            {ms} ms
          </span>
        ))}
      </div>
    </div>
  );
}
