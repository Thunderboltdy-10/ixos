/*
 * CONTENT MATRIX - /4 Landing Page (scratch rebuild, _v4 only)
 *
 * | Section ID    | Claim                                                        | Visual Mechanism                                      | Interaction       | Source of Truth |
 * |---------------|--------------------------------------------------------------|-------------------------------------------------------|-------------------|-----------------|
 * | hero          | Ixos converges from lexical to semantic to locked evidence.  | Desktop-like live search cockpit                      | autoplay loop     | src/app/4/_v4/V4Hero.tsx, src/ixos_rank/progressive.rs |
 * | filescan      | Search starts with parallel JIT scan, no required daemon.    | Result node: filesystem sweep                         | autoplay-on-enter | src/app/4/_v4/V4FileScan.tsx, CLAUDE.md |
 * | stats         | Claimed speed and latency values are shown from docs.        | Result node: instrument cluster                       | autoplay-on-enter | src/app/4/_v4/V4Stats.tsx, CLAUDE.md |
 * | progressive   | Stage 3 lock state is deterministic at every scroll offset.  | Result node: pinned stage scrub                       | scroll-scrub      | src/app/4/_v4/V4Progressive.tsx |
 * | pipeline      | Retrieval pipeline is explicit and source-labeled.           | Result node: architecture map                         | autoplay-on-enter | src/app/4/_v4/V4Pipeline.tsx, src/ixos_rank/*.rs |
 * | benchmarks    | Quality and latency cards use canonical benchmark values.    | Result node: benchmark board                          | autoplay-on-enter | src/app/4/_v4/V4Benchmarks.tsx, models/lab/CANONICAL_RESULTS.md |
 * | compute       | Flash/Auto/Pro trade-offs are qualitative and sourced.       | Result node: compute budget map                       | hover/select      | src/app/4/_v4/V4ComputeBudget.tsx |
 * | comparison    | Capability matrix stays qualitative and transparent.         | Result node: capability matrix                        | hover/focus       | src/app/4/_v4/V4Comparison.tsx |
 * | techbento     | Caching, security, and runtime internals are inspectable.    | Result node: systems bento                            | autoplay-on-enter | src/app/4/_v4/V4TechBento.tsx |
 * | cli           | CLI commands are real and align with shipped usage.          | Result node: terminal surface                         | autoplay-on-enter | src/app/4/_v4/V4CLI.tsx, CLAUDE.md |
 * | ask-mode      | Ask mode can run without silently forcing Pro selection.     | Result node: intent and evidence answer path          | autoplay-on-enter | src/app/4/_v4/V4AskMode.tsx, docs/product/DESKTOP_APP.md |
 * | local         | Core search remains local-first with no data egress.         | Result node: local execution map                      | autoplay-on-enter | src/app/4/_v4/V4LocalFirst.tsx, CLAUDE.md |
 * | pro-value     | Today, Workstreams, and Ask form the Pro workflow loop.      | Result node: tri-surface workflow                     | hover/focus       | src/app/4/_v4/V4ProValue.tsx, src/activity_ledger/mod.rs, src/workstreams/mod.rs |
 * | pricing       | Plan differences are shown without unsourced price claims.   | Result node: plan split                               | toggle/hover      | src/app/4/_v4/V4Pricing.tsx, src/app/pricing/page.tsx |
 * | cta           | Download and docs actions are immediate and visible.         | Result node: launch deck                              | hover/focus       | src/app/4/_v4/V4CTA.tsx |
 * | footer        | Fast route access to docs/pricing/privacy remains available. | Utility footer                                        | static            | src/app/4/_v4/V4Footer.tsx |
 */

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { V4AmbientField } from "./_v4/V4AmbientField";
import { V4Loader } from "./_v4/V4Loader";
import { V4Nav } from "./_v4/V4Nav";
import { V4SpatialStage } from "./_v4/V4SpatialStage";
import { V4ResultNode } from "./_v4/V4ResultNode";
import { V4Hero } from "./_v4/V4Hero";
import { V4FileScan } from "./_v4/V4FileScan";
import { V4Stats } from "./_v4/V4Stats";
import { V4Progressive } from "./_v4/V4Progressive";
import { V4Pipeline } from "./_v4/V4Pipeline";
import { V4Benchmarks } from "./_v4/V4Benchmarks";
import { V4ComputeBudget } from "./_v4/V4ComputeBudget";
import { V4Comparison } from "./_v4/V4Comparison";
import { V4TechBento } from "./_v4/V4TechBento";
import { V4CLI } from "./_v4/V4CLI";
import { V4AskMode } from "./_v4/V4AskMode";
import { V4LocalFirst } from "./_v4/V4LocalFirst";
import { V4ProValue } from "./_v4/V4ProValue";
import { V4Pricing } from "./_v4/V4Pricing";
import { V4CTA } from "./_v4/V4CTA";
import { V4Footer } from "./_v4/V4Footer";
import { V4SectionDivider } from "./_v4/V4SectionDivider";

export default function Variant4Page() {
  const [loaded, setLoaded] = useState(false);

  return (
    <main
      data-theme="desktop"
      className="min-h-screen text-white font-mono"
      style={{
        backgroundColor: "#15171B",
        overflowX: "clip",
      }}
    >
      <V4AmbientField />
      <V4Loader onComplete={() => setLoaded(true)} />

      <AnimatePresence>
        {loaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ position: "relative", zIndex: 1 }}
          >
            <V4Nav />

            <V4SpatialStage>
              <V4ResultNode sectionId="hero" rank="01" file="middleware/jwt.ts" tone="cyan" title="live search cockpit">
                <V4Hero />
              </V4ResultNode>

              <V4SectionDivider accent="dim" />

              <V4ResultNode sectionId="filescan" rank="02" file="src/ixos_rank/lexical_engine.rs" tone="amber" title="filesystem sweep">
                <V4FileScan />
              </V4ResultNode>

              <V4SectionDivider accent="amber" />

              <V4ResultNode sectionId="stats" rank="03" file="CLAUDE.md#benchmarks" tone="amber" title="performance cluster">
                <V4Stats />
              </V4ResultNode>

              <V4SectionDivider accent="dim" />

              <V4ResultNode sectionId="progressive" rank="04" file="src/ixos_rank/progressive.rs" tone="violet" title="progressive lock">
                <V4Progressive />
              </V4ResultNode>

              <V4SectionDivider accent="violet" />

              <V4ResultNode sectionId="pipeline" rank="05" file="src/ixos_rank/hybrid_engine.rs" tone="violet" title="pipeline map">
                <V4Pipeline />
              </V4ResultNode>

              <V4SectionDivider accent="dim" />

              <V4ResultNode sectionId="benchmarks" rank="06" file="models/lab/CANONICAL_RESULTS.md" tone="cyan" title="bench board">
                <V4Benchmarks />
              </V4ResultNode>

              <V4SectionDivider accent="cyan" />

              <V4ResultNode sectionId="compute" rank="07" file="src/ixos_rank/hybrid_engine.rs#auto" tone="cyan" title="compute map">
                <V4ComputeBudget />
              </V4ResultNode>

              <V4SectionDivider accent="dim" />

              <V4ResultNode sectionId="comparison" rank="08" file="docs/product/DESKTOP_APP.md" tone="cyan" title="capability matrix">
                <V4Comparison />
              </V4ResultNode>

              <V4SectionDivider accent="cyan" />

              <V4ResultNode sectionId="techbento" rank="09" file="src/storage/validator.rs" tone="cyan" title="system internals">
                <V4TechBento />
              </V4ResultNode>

              <V4SectionDivider accent="dim" />

              <V4ResultNode sectionId="cli" rank="10" file="CLAUDE.md#cli" tone="amber" title="terminal commands">
                <V4CLI />
              </V4ResultNode>

              <V4SectionDivider accent="violet" />

              <V4ResultNode sectionId="ask-mode" rank="11" file="src/ixos_rank/ask_mode/intent_detector.rs" tone="violet" title="ask pathway">
                <V4AskMode />
              </V4ResultNode>

              <V4SectionDivider accent="cyan" />

              <V4ResultNode sectionId="local" rank="12" file="CLAUDE.md#architecture" tone="cyan" title="local privacy">
                <V4LocalFirst />
              </V4ResultNode>

              <V4SectionDivider accent="amber" />

              <V4ResultNode sectionId="pro-value" rank="13" file="src/activity_ledger/mod.rs" tone="amber" title="pro loop">
                <V4ProValue />
              </V4ResultNode>

              <V4SectionDivider accent="violet" />

              <V4ResultNode sectionId="pricing" rank="14" file="src/app/pricing/page.tsx" tone="violet" title="plan split">
                <V4Pricing />
              </V4ResultNode>

              <V4SectionDivider accent="cyan" />

              <V4ResultNode sectionId="cta" rank="15" file="src/lib/downloads.ts" tone="cyan" title="launch deck">
                <V4CTA />
              </V4ResultNode>
            </V4SpatialStage>

            <V4Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
