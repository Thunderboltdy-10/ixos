"use client";

import { ResultRow, useFlip } from "@ixos/ui";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { DEMOS, toHit } from "@/lib/demo";
import { EASE, Reveal, Stage, useShown } from "./Stage";

const DEMO = DEMOS[0];

export function Ranking() {
  return (
    <section className="section section--split ranking">
      <div className="section-text">
        <Reveal>
          <h2>Keywords and meaning, together.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="lede">
            Keyword search is precise but misses files that use different words. Search by meaning gets the idea but
            can be vague. Ixos scores every file both ways and ranks them by the average.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <dl className="ranking-parts">
            <div>
              <dt>
                <span className="swatch swatch--keyword" />
                Keywords
              </dt>
              <dd>BM25 over the words in each file, so exact names still win.</dd>
            </div>
            <div>
              <dt>
                <span className="swatch swatch--meaning" />
                Meaning
              </dt>
              <dd>A small Model2Vec model on the CPU compares what the query and each passage are about.</dd>
            </div>
          </dl>
        </Reveal>
      </div>
      <Stage>
        <Toggle />
      </Stage>
    </section>
  );
}

/** The same search ranked by keywords alone, then with meaning added. */
function Toggle() {
  const shown = useShown();
  const [both, setBoth] = useState(false);
  const touched = useRef(false);
  const list = useRef<HTMLOListElement>(null);
  const hits = (both ? DEMO.ranked : DEMO.keywords).map(toHit);
  useFlip(list, hits.map((hit) => hit.key).join("\n"));

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => !touched.current && setBoth(true), 1800);
    return () => window.clearTimeout(timer);
  }, [shown]);

  const choose = (value: boolean) => {
    touched.current = true;
    setBoth(value);
  };

  return (
    <div className="panel ranking-panel">
      <div className="ranking-head">
        <span className="ranking-query">{DEMO.query}</span>
        <div className="switch" role="radiogroup" aria-label="Rank by">
          {[
            [false, "Keywords"],
            [true, "Keywords and meaning"],
          ].map(([value, label]) => (
            <button key={String(label)} role="radio" aria-checked={both === value} onClick={() => choose(value as boolean)}>
              {both === value && <motion.span className="switch-on" layoutId="ranking-switch" transition={{ duration: 0.35, ease: EASE }} />}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <ol ref={list} className="ix-rows" aria-label="Results">
        {hits.map((hit, index) => (
          <ResultRow key={hit.key} hit={hit} layout="stacked" selected={hit.file === "typo.rs" && index === 0} />
        ))}
      </ol>
      <p className="panel-note">
        Real results from the Ixos source code. typo.rs is the file that corrects spelling;
        {both ? " meaning moves it to the top." : " by keywords alone it comes fourth."}
      </p>
    </div>
  );
}
