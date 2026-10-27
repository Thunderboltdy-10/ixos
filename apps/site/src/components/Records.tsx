"use client";

import { motion } from "framer-motion";
import { EASE, Reveal, Stage, useShown } from "./Stage";

const SIZES = [
  { name: "A 154-page PDF", file: "11.6 MB", record: "620 B", share: 0.005, note: "The record is 0.005% of the file." },
  { name: "engine.rs", file: "56 KB", record: "2.3 KB at most", share: 4.1, note: "Long files keep up to eight passages, still 4% of the file." },
  { name: "typo.rs", file: "3.4 KB", record: "648 B", share: 18.8, note: "Small files get small records too." },
];

export function Records() {
  return (
    <section className="section section--split records">
      <div className="section-text">
        <Reveal>
          <h2>The index lives on the file.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="lede">
            Ixos saves a small record in each file&apos;s metadata, so there&apos;s no database to manage and nothing
            leaves your computer. Change a file and only that file is read again.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="aside">
            Where a drive can&apos;t hold metadata, Ixos keeps the record in its own cache instead. Removing records is safe;
            Ixos rebuilds them on the next search.
          </p>
        </Reveal>
      </div>
      <Stage>
        <Sizes />
      </Stage>
    </section>
  );
}

/** Each record against the file it describes. The grey bar is the file. */
function Sizes() {
  const shown = useShown();
  return (
    <div className="sizes">
      {SIZES.map((size, index) => (
        <div key={size.name} className="size">
          <div className="size-head">
            <span className="size-name">{size.name}</span>
            <span>
              {size.file} file · <span className="size-record">{size.record} record</span>
            </span>
          </div>
          <div className="size-bar" aria-hidden>
            <motion.span
              className="size-file"
              initial={{ scaleX: 0 }}
              animate={shown ? { scaleX: 1 } : undefined}
              transition={{ delay: 0.5 + index * 0.18, duration: 0.7, ease: EASE }}
            />
            <motion.span
              className="size-fill"
              initial={{ width: 0 }}
              animate={shown ? { width: `${size.share}%` } : undefined}
              transition={{ delay: 1.1 + index * 0.18, duration: 0.8, ease: EASE }}
            />
          </div>
          <span className="size-note">{size.note}</span>
        </div>
      ))}
    </div>
  );
}
