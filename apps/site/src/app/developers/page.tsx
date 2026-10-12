"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";

const PIPELINE_STAGES = [
  {
    stage: "01",
    title: "Scan",
    desc: "An on-demand ignore-aware walk discovers eligible files. Resident searches reuse unchanged files by size, modified time and identity; changes fall back to hashing.",
    color: "#F6B94C",
    tag: "DISCOVERY",
  },
  {
    stage: "02",
    title: "Lexical",
    desc: "BM25 uses complete extracted source text and path terms. Exact identifiers keep keyword matches; four workers prepare changed sources.",
    color: "#14B8A6",
    tag: "BM25_ENGINE",
  },
  {
    stage: "03",
    title: "Semantic",
    desc: "Static embeddings run locally on CPU through an encoded row loader. Code stores bounded representatives; documents pool full token input. Compact vectors can miss or dilute rare topics.",
    color: "#7C5CFF",
    tag: "EMBED_LOCAL",
  },
  {
    stage: "04",
    title: "Results",
    desc: "Hybrid ranking combines normalized BM25 and semantic cosine. Bounded results include source snippets; scores are rankings, not confidence probabilities.",
    color: "#F6B94C",
    tag: "HYBRID_RANK",
  },
];

const CACHE_FORMAT = `magic IXOS + version   5 bytes
model fingerprint     32 bytes
source fingerprint    32 bytes
dimensions + count     3 bytes
each passage          28 + dimensions bytes
xxhash checksum        8 bytes
Total: 80 + count Ã— (28 + dimensions)
Code: up to 2,352 bytes (eight 256d passages)
Documents: 620 bytes (one 512d passage)`;

export default function DevelopersPage() {
  return (
    <div
      className="relative min-h-screen text-[#f3f5f7] selection:bg-amber-400/30"
      style={{ overflowX: "clip" }}
    >
      <main className="relative z-10">
        {/* Hero */}
        <section className="relative pt-36 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-teal-400/60 mb-6">
                â–¸ For Developers
              </p>
              <h1
                className="text-4xl md:text-6xl font-semibold font-display text-white mb-6"
                style={{ letterSpacing: "-0.03em", lineHeight: 1.08 }}
              >
                Built for engineers who{" "}
                <span className="heading-gradient-teal">read source code.</span>
              </h1>
              <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
                Shared Rust engine. Hybrid retrieval. Compact metadata records.
                CPU models. Here&apos;s how it works under the hood.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pipeline Architecture */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <FadeInView direction="up">
              <div className="text-center mb-14">
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/60 mb-4">
                  â–¸ Pipeline
                </p>
                <h2
                  className="text-3xl md:text-5xl font-semibold font-display text-white"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  The search pipeline.
                </h2>
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Discover files, match keywords, score meaning, select
                  snippets.
                </p>
              </div>
            </FadeInView>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PIPELINE_STAGES.map((item, i) => (
                <FadeInView key={item.stage} direction="up" delay={i * 80}>
                  <div
                    className="p-8 border relative"
                    style={{
                      borderColor: `${item.color}22`,
                      background: `${item.color}04`,
                    }}
                  >
                    <CornerBrackets size={12} color={`${item.color}30`} />
                    <div
                      className="font-mono text-[10px] font-semibold tracking-[0.3em] uppercase mb-4 flex items-center justify-between"
                      style={{ color: item.color }}
                    >
                      <span>Phase {item.stage}</span>
                      <span className="opacity-40">[{item.tag}]</span>
                    </div>
                    <h3
                      className="text-2xl font-bold font-mono mb-3"
                      style={{ color: item.color }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm font-mono leading-relaxed text-white/40">
                      {item.desc}
                    </p>
                  </div>
                </FadeInView>
              ))}
            </div>
          </div>
        </section>

        {/* Cache Format */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <FadeInView direction="up">
              <div className="text-center mb-12">
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/60 mb-4">
                  â–¸ Cache Binary Format
                </p>
                <h2
                  className="text-3xl md:text-4xl font-semibold font-display text-white"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  Compact records, complete dimensions.
                </h2>
              </div>
            </FadeInView>

            <FadeInView direction="up" delay={100}>
              <div className="border border-amber-400/15 bg-[#0A0D0F] overflow-hidden relative">
                <CornerBrackets size={14} color="rgba(246,185,76,0.12)" />
                <div className="px-5 py-3 border-b border-amber-400/8 bg-amber-400/[0.02]">
                  <span className="font-mono text-xs text-amber-400/40 uppercase tracking-widest">
                    ADS / xattr document record
                  </span>
                </div>
                <pre className="p-6 font-mono text-[13px] leading-relaxed text-white/50 overflow-x-auto">
                  {CACHE_FORMAT}
                </pre>
              </div>
            </FadeInView>
          </div>
        </section>

        {/* Links */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <FadeInView direction="up">
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/docs"
                  className="px-8 py-3.5 border border-teal-400/20 text-teal-400/70 text-sm hover:bg-teal-400/5 transition-colors"
                >
                  Read the Docs
                </Link>
                <Link
                  href="/cli"
                  className="px-8 py-3.5 border border-amber-400/20 text-amber-400/70 text-sm hover:bg-amber-400/5 transition-colors"
                >
                  CLI Reference
                </Link>
                <Link
                  href="/download"
                  className="px-8 py-3.5 bg-amber-400 text-[#0A0D0F] font-semibold text-sm hover:bg-amber-300 transition-colors"
                >
                  Download Ixos
                </Link>
              </div>
              <div className="text-center mt-6 text-xs text-white/20 font-mono">
                Â© 2026 Pablo MD · MIT licensed
              </div>
            </FadeInView>
          </div>
        </section>
      </main>
    </div>
  );
}
