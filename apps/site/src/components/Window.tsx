"use client";

import {
  CACHE_CHOICES,
  GearIcon,
  Kbd,
  Loading,
  Picker,
  PreviewPane,
  PROFILE_CHOICES,
  QueryBar,
  ResultRow,
  TitleBar,
  queryTerms,
  useFlip,
} from "@ixos/ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DEMOS, sourceLines, toHit } from "@/lib/demo";
import { EASE, Reveal, Stage, useShown, useActiveDemo } from "./Stage";

const DEMO = DEMOS[1];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function Window() {
  return (
    <section className="section window-section">
      <div className="section-text section-text--wide">
        <Reveal>
          <h2>A window for longer searches.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="lede">
            The quick search covers most lookups. When you want to look around, the main window keeps the full list on
            the left and the file on the right, scrolled to the passage. Pick a folder, switch between code and
            documents, and open the file where it lives.
          </p>
        </Reveal>
      </div>
      <Stage className="window-stage">
        <Desktop />
      </Stage>
    </section>
  );
}

type Step = "starting" | "empty" | "keywords" | "ranked";

/** The main window, starting up and then running a search. Rows can be clicked. */
function Desktop() {
  const shown = useShown();
  const visible = useActiveDemo();
  const finished = useRef(false);
  const still = useReducedMotion();
  const [stage, setStage] = useState<Step>("starting");
  const [typed, setTyped] = useState("");
  const [active, setActive] = useState(0);
  const [profile, setProfile] = useState<"auto" | "code" | "documents">("auto");
  const [cache, setCache] = useState(true);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!shown || !visible || still || finished.current) return;
    let live = true;
    (async () => {
      await sleep(1500);
      if (!live) return;
      setStage("empty");
      await sleep(700);
      for (let end = 1; end <= DEMO.query.length && live; end++) {
        setTyped(DEMO.query.slice(0, end));
        await sleep(30 + Math.random() * 40);
      }
      await sleep(150);
      if (live) setStage("keywords");
      await sleep(900);
      if (live) { setStage("ranked"); finished.current = true; }
    })();
    return () => {
      live = false;
    };
  }, [shown, visible, still]);

  // With reduced motion, the finished search is shown and stays still.
  const step = still ? "ranked" : stage;
  const query = still ? DEMO.query : typed;
  const files = step === "ranked" ? DEMO.ranked : step === "keywords" ? DEMO.keywords : [];
  const hits = files.map(toHit);
  useFlip(list, hits.map((hit) => hit.key).join("\n"));
  const selected = step === "ranked" ? DEMO.ranked[active] : undefined;
  const progress = step === "keywords" ? 0.45 : step === "ranked" ? 1 : null;

  return (
    <div className="window">
      <TitleBar
        actions={
          <button className="ix-window-button" aria-label="Settings">
            <GearIcon size={15} />
          </button>
        }
      >
        <span className="ix-titlebar-name">
          <Image src="/assets/logo.png" alt="" width={18} height={18} />
          Ixos
        </span>
      </TitleBar>
      <AnimatePresence mode="wait" initial={false}>
        {step === "starting" ? (
          <motion.div key="starting" className="window-body" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            {shown && <Loading logo="/assets/logo.png" />}
          </motion.div>
        ) : (
          <motion.main
            key="search"
            className="ix-search window-body"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <QueryBar
              progress={step === "ranked" ? null : progress}
              input={
                <span className="ix-query-input">
                  {query}
                  {step !== "ranked" && <span className="ix-caret" />}
                </span>
              }
              pickers={
                <>
                  <Picker title="Search in" label="ixos" value="ixos" choices={[{ value: "ixos", label: "ixos", detail: "~/ixos/crates" }]} onChange={() => {}} />
                  <span className="ix-picker-rule" />
                  <Picker
                    title="Search for"
                    label={profile === "documents" ? "Documents" : "Code"}
                    hint={profile === "auto" ? "auto" : undefined}
                    value={profile}
                    choices={PROFILE_CHOICES}
                    onChange={setProfile}
                  />
                  <span className="ix-picker-rule" />
                  <Picker title="Remember files" label={cache ? "Saved" : "Fresh"} value={cache} choices={CACHE_CHOICES} onChange={setCache} />
                </>
              }
            />
            <p className="ix-status" role="status">
              {step === "empty"
                ? "48 files ready to search."
                : step === "keywords"
                  ? "6 files by keywords. Adding meaning…"
                  : "6 files ranked by keywords and meaning."}
            </p>
            <div className="ix-split">
              {hits.length ? (
                <ol ref={list} className="ix-rows ix-results" role="listbox" aria-label="Results">
                  {hits.map((hit, index) => (
                    <ResultRow
                      key={hit.key}
                      hit={hit}
                      layout="stacked"
                      selected={step === "ranked" && index === active}
                      onSelect={() => setActive(index)}
                    />
                  ))}
                </ol>
              ) : (
                <div className="ix-results ix-results--empty" />
              )}
              {selected ? (
                <PreviewPane
                  name={toHit(selected).file}
                  folder={toHit(selected).dir}
                  lines={sourceLines(selected)}
                  from={selected.start}
                  to={selected.end}
                  terms={queryTerms(query)}
                  actions={
                    <>
                      <button className="ix-button ix-button--primary">
                        Open <Kbd>Enter</Kbd>
                      </button>
                      <button className="ix-button">
                        Show in folder <Kbd>Ctrl</Kbd>
                        <Kbd>Enter</Kbd>
                      </button>
                    </>
                  }
                />
              ) : (
                <section className="ix-preview ix-preview--empty" aria-label="Preview">
                  <p>The best passage from each file shows here.</p>
                </section>
              )}
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
