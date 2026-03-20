"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useDecodeEffect } from "@/hooks/useDecodeEffect";
import { DemoSurface } from "@/components/DemoSurface";

function DecodedHeading({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { ref, display } = useDecodeEffect(text, 0);
  return (
    <h1
      ref={ref as React.Ref<HTMLHeadingElement>}
      className={className}
      style={{ letterSpacing: "-0.03em", lineHeight: 1.08 }}
    >
      {display}
    </h1>
  );
}

export function HeroSection() {
  return (
    <section
      id="hero"
      className="section-hero relative min-h-screen flex flex-col items-center justify-center pt-36 pb-16 px-6 z-10"
    >
      {/* Subtle amber radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: "60vw",
          height: "40vh",
          background:
            "radial-gradient(ellipse, rgba(246,185,76,0.04) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="relative z-10 text-center mb-12 max-w-4xl mx-auto"
      >
        <DecodedHeading
          text="Find anything on your device — instantly and privately."
          className="text-4xl sm:text-5xl md:text-7xl font-semibold font-display text-white mb-6"
        />
        <p className="text-base md:text-lg max-w-2xl mx-auto font-sans text-white/50 leading-relaxed">
          Ixos builds a secure semantic map of your files so you can stop
          hunting and start working.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="relative z-10 w-full max-w-5xl overflow-hidden shadow-2xl shadow-black/50"
      >
          <DemoSurface />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="relative z-10 flex flex-wrap justify-center gap-4 mt-10"
      >
        <Link
          href="/download"
          className="px-8 py-3.5 bg-amber-400 text-[#0A0D0F] font-semibold text-sm hover:bg-amber-300 transition-colors rounded-sm"
        >
          Download the Desktop App
        </Link>
        <a
          href="#how-it-works"
          className="px-8 py-3.5 border border-amber-400/20 text-amber-400/70 text-sm hover:bg-amber-400/5 transition-colors rounded-sm"
        >
          See Ixos in Action
        </a>
      </motion.div>
    </section>
  );
}
