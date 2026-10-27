"use client";

import { QuickSearch, queryTerms, type Passage } from "@ixos/ui";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { DEMOS, sourceLines, toHit, type RankedFile } from "@/lib/demo";
import { EASE, useActive } from "./Stage";

type Step = "empty" | "keywords" | "ranked";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The quick search overlay, typing each demo query and ranking it the way the app does. */
export function HeroSearch() {
  const root = useRef<HTMLDivElement>(null);
  const visible = useActive(root);
  const [demo, setDemo] = useState(0);
  const [typed, setTyped] = useState("");
  const [stage, setStage] = useState<Step>("empty");
  const [progress, setProgress] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState(false);
  const held = useRef(false);
  const still = useReducedMotion();

  useEffect(() => {
    if (still || !visible) return;
    let live = true;
    // Waits stretch while the pointer is over the panel, so it can be read.
    const wait = async (ms: number) => {
      await sleep(ms);
      while (live && held.current) await sleep(150);
      if (!live) throw new Error("stopped");
    };
    (async () => {
      await wait(1100);
      for (let round = 0; ; round++) {
        const index = round % DEMOS.length;
        const text = DEMOS[index].query;
        setDemo(index);
        setTyped(""); setStage("empty"); setOpened(false); setActive(0); setProgress(null);
        for (let end = 1; end <= text.length; end++) {
          setTyped(text.slice(0, end));
          await wait(34 + Math.random() * 46);
        }
        setProgress(0.35);
        await wait(180);
        setStage("keywords");
        await wait(1000);
        setProgress(1);
        setStage("ranked");
        await wait(700);
        setProgress(null);
        setOpened(true);
        for (const next of [1, 2, 0]) {
          await wait(2000);
          setActive(next);
        }
        await wait(2200);
        setOpened(false);
        await wait(500);
        setTyped("");
        setStage("empty");
        await wait(900);
      }
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [still, visible]);

  // With reduced motion, the finished search is shown and stays still.
  const query = still ? DEMOS[0].query : typed;
  const step = still ? "ranked" : stage;
  const open = still || opened;
  const current = DEMOS[demo];
  const files = step === "ranked" ? current.ranked : step === "keywords" ? current.keywords : [];
  const selected = step === "ranked" ? current.ranked[active] : undefined;

  return (
    <motion.div
      ref={root}
      data-active={visible}
      className="hero-search"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
      onPointerEnter={() => (held.current = true)}
      onPointerLeave={() => (held.current = false)}
    >
      <QuickSearch
        logo="/assets/logo.png"
        query={
          <span className="ix-qs-query">
            {query}
            <span className="ix-caret" />
            {!query && <span className="hero-placeholder">Search your files</span>}
          </span>
        }
        scope={<span className="ix-qs-scope">ixos</span>}
        progress={progress}
        hits={files.map(toHit)}
        active={active}
        onActive={(index) => {
          setActive(index);
          if (step === "ranked") setOpened(true);
        }}
        passage={open && selected ? passageOf(selected, query) : null}
        status={step === "keywords" ? "Adding meaning…" : ""}
      />
    </motion.div>
  );
}

/** The matched lines with one line either side, as the overlay shows them. */
function passageOf(file: RankedFile, query: string): Passage {
  const lines = sourceLines(file).filter((line) => line.n >= file.start - 1 && line.n <= file.end + 1);
  return {
    title: toHit(file).file,
    detail: `Lines ${file.start}–${file.end}`,
    lines,
    from: file.start,
    to: file.end,
    terms: queryTerms(query),
  };
}
