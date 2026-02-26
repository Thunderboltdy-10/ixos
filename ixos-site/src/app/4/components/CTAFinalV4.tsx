"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

const TRUST_ITEMS = [
  "Local-first posture",
  "Progressive results",
  "No background daemon",
  "Hybrid retrieval",
];

export function CTAFinalV4() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      ref={ref}
      className="relative py-44 px-6 overflow-hidden"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Spotlight glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(45,212,191,0.035) 0%, rgba(124,58,237,0.025) 40%, transparent 70%)",
        }}
      />

      {/* Blueprint grid (sparse) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Corner marks */}
      {(["top-12 left-12", "top-12 right-12"] as const).map((pos) => (
        <div key={pos} className={`absolute ${pos} w-8 h-8 pointer-events-none`}>
          <div className="absolute top-0 left-0 w-full h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div className="absolute top-0 left-0 h-full w-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
        </div>
      ))}

      <div className="relative max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Eyebrow */}
          <p
            className="font-mono text-[10px] tracking-[0.35em] uppercase mb-8"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Ready to calibrate
          </p>

          {/* Headline */}
          <h2
            className="font-display font-bold text-white leading-[1.0] mb-8"
            style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
          >
            Your files.
            <br />
            <span
              style={{
                WebkitTextFillColor: "transparent",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                backgroundImage: "linear-gradient(135deg, #2DD4BF 20%, #7C3AED 80%)",
              }}
            >
              Found.
            </span>
          </h2>

          <p
            className="font-mono text-sm leading-relaxed mb-12 max-w-md mx-auto"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Local-first. Progressive results. No indexing daemon. Exactly the
            information you need, when you need it.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 justify-center mb-14">
            <Link
              href="/download"
              className="font-mono text-xs px-10 py-4 font-semibold tracking-[0.25em] uppercase transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#2DD4BF", color: "#0C0E10" }}
            >
              Download for Desktop
            </Link>
            <Link
              href="/docs"
              className="font-mono text-xs px-10 py-4 tracking-[0.25em] uppercase transition-all duration-200 active:scale-[0.98]"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.5)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)";
                e.currentTarget.style.color = "rgba(255,255,255,0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
              }}
            >
              CLI Documentation
            </Link>
          </div>

          {/* Trust strip */}
          <div
            className="flex flex-wrap justify-center gap-8 pt-8"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1 h-1" style={{ backgroundColor: "rgba(45,212,191,0.45)" }} />
                <span
                  className="font-mono text-[9px] tracking-[0.18em] uppercase"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
