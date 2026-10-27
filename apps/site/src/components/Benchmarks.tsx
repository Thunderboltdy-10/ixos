"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Count, EASE, Reveal, Stage, useShown } from "./Stage";

const SUITES = [
  {
    name: "RepoQA",
    what: "finding code from a description",
    scores: [
      ["Ixos", 0.6937],
      ["BM25", 0.6066],
      ["ripgrep", 0.4469],
    ],
  },
  {
    name: "SciFact",
    what: "finding papers that answer a claim",
    scores: [
      ["Ixos", 0.695],
      ["BM25", 0.6645],
      ["ripgrep", 0.5361],
    ],
  },
] as const;

export function Benchmarks() {
  return (
    <section className="section benchmarks">
      <div className="section-text section-text--wide">
        <Reveal>
          <h2>How well it ranks.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="lede">
            nDCG@10 on two public datasets: 260 descriptions of code and 300 scientific claims. Higher is better. Every
            query and result is in the repository. <Link href="/docs#results">How these were measured</Link>
          </p>
        </Reveal>
      </div>
      <Stage>
        <Suites />
      </Stage>
    </section>
  );
}

function Suites() {
  const shown = useShown();
  return (
    <div className="suites">
      {SUITES.map((suite, column) => (
        <div key={suite.name} className="suite">
          <p className="suite-name">
            {suite.name} <span>{suite.what}</span>
          </p>
          {suite.scores.map(([label, score], row) => {
            const delay = 0.5 + column * 0.25 + row * 0.12;
            return (
              <div key={label} className={`bar${row === 0 ? " bar--ixos" : ""}`}>
                <span>{label}</span>
                <span className="bar-track" aria-hidden>
                  <motion.span
                    initial={{ width: 0 }}
                    animate={shown ? { width: `${score * 100}%` } : undefined}
                    transition={{ delay, duration: 0.9, ease: EASE }}
                  />
                </span>
                <span className="bar-value">
                  <Count to={score} start={shown} decimals={2} delay={delay} />
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
