"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderV4 } from "./components/LoaderV4";
import { NavV4 } from "./components/NavV4";
import { HeroV4 } from "./components/HeroV4";
import { StatsV4 } from "./components/StatsV4";
import { ProgressiveScrollV4 } from "./components/ProgressiveScrollV4";
import { PipelineV4 } from "./components/PipelineV4";
import { TriadLensV4 } from "./components/TriadLensV4";
import { ComparisonV4 } from "./components/ComparisonV4";
import { AskModeV4 } from "./components/AskModeV4";
import { LocalFirstV4 } from "./components/LocalFirstV4";
import { ProValueV4 } from "./components/ProValueV4";
import { PricingV4 } from "./components/PricingV4";
import { FileScanV4 } from "./components/FileScanV4";
import { CTAFinalV4 } from "./components/CTAFinalV4";
import { FooterV4 } from "./components/FooterV4";

export default function Variant4Page() {
  const [loaded, setLoaded] = useState(false);

  return (
    <main
      className="min-h-screen text-white font-mono"
      style={{
        backgroundColor: "#0C0E10",
        // overflow-x: clip (NOT hidden) — clip doesn't create a new BFC so position:sticky children still work
        overflowX: "clip",
      }}
    >
      {/* Cinematic loader */}
      <LoaderV4 onComplete={() => setLoaded(true)} />

      {/* Page content — fades in after loader */}
      <AnimatePresence>
        {loaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <NavV4 />
            <HeroV4 />
            <FileScanV4 />
            <StatsV4 />
            <ProgressiveScrollV4 />
            <PipelineV4 />
            <TriadLensV4 />
            <ComparisonV4 />
            <AskModeV4 />
            <LocalFirstV4 />
            <ProValueV4 />
            <PricingV4 />
            <CTAFinalV4 />
            <FooterV4 />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
