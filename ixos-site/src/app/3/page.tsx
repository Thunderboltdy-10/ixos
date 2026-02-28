"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { DemoSurface } from "@/landing/DemoSurface";

/* ──────────────────────────────────────────────
   Ripple Section — clip-path reveal primitive
   ────────────────────────────────────────────── */
function RippleReveal({
  children,
  originX = 50,
  originY = 50,
  startRadius = 0,
  endRadius = 85,
  duration = 0.8,
  className = "",
}: {
  children: React.ReactNode;
  originX?: number;
  originY?: number;
  startRadius?: number;
  endRadius?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ clipPath: `circle(${startRadius}% at ${originX}% ${originY}%)` }}
      animate={
        inView
          ? { clipPath: `circle(${endRadius}% at ${originX}% ${originY}%)` }
          : {}
      }
      transition={{ duration, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   Stagger children wrapper
   ────────────────────────────────────────────── */
function StaggerChildren({
  children,
  stagger = 0.1,
  className = "",
}: {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        visible: { transition: { staggerChildren: stagger } },
        hidden: {},
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const fadeLine = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
};

/* ──────────────────────────────────────────────
   Floating Pill Nav
   ────────────────────────────────────────────── */
function FloatingNav() {
  const links = [
    { label: "Speed", href: "#speed" },
    { label: "Privacy", href: "#privacy" },
    { label: "Pipeline", href: "#pipeline" },
    { label: "CLI", href: "#cli" },
  ];

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-full border border-white/[0.08] bg-[#060810]/70 backdrop-blur-xl shadow-lg shadow-black/30">
      <a
        href="#hero"
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-[#F6B94C] tracking-tight"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Ixos
      </a>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          className="px-3 py-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors rounded-full hover:bg-white/5"
        >
          {l.label}
        </a>
      ))}

      <a
        href="#download"
        className="ml-1 px-4 py-1.5 text-[13px] font-semibold rounded-full bg-[#F6B94C] text-[#060810] hover:bg-[#f0c45e] transition-colors"
      >
        Download
      </a>
    </nav>
  );
}

/* ──────────────────────────────────────────────
   Score Bar (animated fill)
   ────────────────────────────────────────────── */
function ScoreBar({
  label,
  value,
  color,
  inView,
  delay = 0,
}: {
  label: string;
  value: number;
  color: string;
  inView: boolean;
  delay?: number;
}) {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-white/60 font-mono">{label}</span>
        <span className="text-sm font-mono" style={{ color }}>
          {value.toFixed(2)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          animate={inView ? { width: `${value * 100}%` } : {}}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════ */
export default function Page3RippleFoundry() {
  const scoreRef = useRef<HTMLDivElement>(null);
  const scoreInView = useInView(scoreRef, { once: true, margin: "-100px" });

  return (
    <main className="relative min-h-screen bg-[#060810] text-[#f3f5f7] overflow-x-hidden font-sans selection:bg-[#F6B94C]/30">
      {/* ── SVG Dot Grid Background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.05 }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dot-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.8" fill="#f3f5f7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
      </div>

      <FloatingNav />

      {/* ═══════════════════════════════════
          1. HERO — Circle expand reveal
          ═══════════════════════════════════ */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-16 px-6 z-10">
        <RippleReveal
          originX={50}
          originY={50}
          startRadius={0}
          endRadius={85}
          duration={1.0}
          className="absolute inset-0 bg-gradient-to-b from-[#F6B94C]/[0.04] via-transparent to-transparent"
        >
          <div className="w-full h-full" />
        </RippleReveal>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative z-10 text-center mb-12 max-w-4xl mx-auto"
        >
          <h1
            className="text-5xl sm:text-6xl md:text-8xl font-bold mb-6"
            style={{ letterSpacing: "-0.03em", lineHeight: 1.05 }}
          >
            The impact of
            <br />
            <span className="bg-gradient-to-r from-[#F6B94C] to-[#f0c45e] bg-clip-text text-transparent">
              instant search.
            </span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: "rgba(243,245,247,0.6)" }}>
            Drop Ixos into your codebase and watch clarity ripple through your
            entire engineering workflow. Local-first. Sub-second. Deterministic.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative z-10 w-full max-w-4xl rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0d12]/80 shadow-2xl shadow-[#F6B94C]/5"
          style={{ minHeight: 620 }}
        >
          <DemoSurface
            initialQuery="authentication token refresh"
            autoRun
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="relative z-10 flex flex-wrap justify-center gap-4 mt-10"
        >
          <a
            href="#download"
            className="px-8 py-3.5 rounded-full bg-[#F6B94C] text-[#060810] font-semibold text-sm hover:bg-[#f0c45e] transition-colors"
          >
            Download Ixos
          </a>
          <a
            href="#pipeline"
            className="px-8 py-3.5 rounded-full border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/5 transition-colors"
          >
            Learn More
          </a>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════
          2. IMPACT 1 — Speed (from LEFT)
          ═══════════════════════════════════ */}
      <section id="speed" className="relative z-10 py-28 px-6">
        <RippleReveal originX={0} originY={50} endRadius={110} duration={0.9} className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              Frictionless speed
            </h2>
            <p style={{ color: "rgba(243,245,247,0.55)" }} className="text-lg max-w-xl mx-auto">
              Every millisecond matters. Ixos searches your entire codebase before your finger lifts off the key.
            </p>
          </div>

          <StaggerChildren stagger={0.15} className="flex flex-col gap-4">
            {[
              { metric: "Sub-second search", detail: "Average query resolves in under 50ms across 10k+ files", color: "#F6B94C" },
              { metric: "312 files in 7ms", detail: "Parallel Rayon-powered file scanning with zero blocking I/O", color: "#F6B94C" },
              { metric: "94% cache reuse", detail: "HMAC-SHA256 signed embeddings cached in NTFS ADS or xattr", color: "#F6B94C" },
            ].map((row) => (
              <motion.div
                key={row.metric}
                variants={fadeUp}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-6 px-6 md:px-10 rounded-xl border bg-white/[0.02]"
                style={{ borderColor: `${row.color}33` }}
              >
                <span className="text-2xl md:text-3xl font-bold" style={{ color: row.color }}>
                  {row.metric}
                </span>
                <span className="text-sm md:text-base" style={{ color: "rgba(243,245,247,0.5)" }}>
                  {row.detail}
                </span>
              </motion.div>
            ))}
          </StaggerChildren>
        </RippleReveal>
      </section>

      {/* ═══════════════════════════════════
          3. IMPACT 2 — Privacy (from RIGHT)
          ═══════════════════════════════════ */}
      <section id="privacy" className="relative z-10 py-28 px-6">
        <RippleReveal originX={100} originY={50} endRadius={110} duration={0.9} className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              Zero-trust by default
            </h2>
            <p style={{ color: "rgba(243,245,247,0.55)" }} className="text-lg max-w-xl mx-auto">
              Your intellectual property never leaves your SSD. Not a single byte is transmitted, logged, or telemetered.
            </p>
          </div>

          <StaggerChildren stagger={0.15} className="flex flex-col gap-4">
            {[
              { metric: "Zero cloud dependency", detail: "All embedding generation and search ranking runs on your local CPU", color: "#14B8A6" },
              { metric: "HMAC-SHA256 signing", detail: "Every cached embedding is cryptographically signed to prevent tampering", color: "#14B8A6" },
              { metric: "mlock memory protection", detail: "Sensitive buffers are locked in RAM and zeroized on drop. Never swapped to disk.", color: "#14B8A6" },
            ].map((row) => (
              <motion.div
                key={row.metric}
                variants={fadeUp}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-6 px-6 md:px-10 rounded-xl border bg-white/[0.02]"
                style={{ borderColor: `${row.color}33` }}
              >
                <span className="text-2xl md:text-3xl font-bold" style={{ color: row.color }}>
                  {row.metric}
                </span>
                <span className="text-sm md:text-base" style={{ color: "rgba(243,245,247,0.5)" }}>
                  {row.detail}
                </span>
              </motion.div>
            ))}
          </StaggerChildren>
        </RippleReveal>
      </section>

      {/* ═══════════════════════════════════
          4. PIPELINE — Staggered 2x2 Grid
          ═══════════════════════════════════ */}
      <section id="pipeline" className="relative z-10 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              The crystallized pipeline
            </h2>
            <p style={{ color: "rgba(243,245,247,0.55)" }} className="text-lg max-w-xl mx-auto">
              Four stages. From raw filesystem scan to cryptographically locked results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                stage: "01",
                title: "Scan",
                desc: "Rust file-watcher daemon monitors your project in real-time. Rate-limited at 100 events/sec with dedup and symlink protection. Changes are captured instantly.",
                color: "#F6B94C",
                origin: "0% 0%",
                delay: 0,
              },
              {
                stage: "02",
                title: "Lexical",
                desc: "BM25-powered keyword matching with parallel Rayon processing. Pre-filters millions of tokens across your entire directory tree in under 10ms.",
                color: "#14B8A6",
                origin: "100% 0%",
                delay: 0.15,
              },
              {
                stage: "03",
                title: "Semantic",
                desc: "Model2Vec embeddings generated locally via ONNX runtime. Cosine similarity ranking surfaces intent-matching results that keyword search alone would miss.",
                color: "#7C5CFF",
                origin: "0% 100%",
                delay: 0.3,
              },
              {
                stage: "04",
                title: "Locked",
                desc: "Final hybrid score fuses lexical, semantic, and quality signals. Results are integrity-verified with behavioral scoring and attack detection. Deterministic output.",
                color: "#F6B94C",
                origin: "100% 100%",
                delay: 0.45,
              },
            ].map((item) => {
              const ref = useRef<HTMLDivElement>(null);
              const visible = useInView(ref, { once: true, margin: "-60px" });

              return (
                <motion.div
                  key={item.stage}
                  ref={ref}
                  initial={{ clipPath: `circle(0% at ${item.origin})`, opacity: 0 }}
                  animate={
                    visible
                      ? { clipPath: `circle(150% at ${item.origin})`, opacity: 1 }
                      : {}
                  }
                  transition={{ duration: 0.7, delay: item.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="p-8 md:p-10 rounded-xl border bg-white/[0.02]"
                  style={{ borderColor: `${item.color}22` }}
                >
                  <div
                    className="font-mono text-xs font-semibold tracking-widest uppercase mb-3"
                    style={{ color: item.color }}
                  >
                    Phase {item.stage}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(243,245,247,0.5)" }}>
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          5. RESULT ANATOMY — Crystallized UI
          ═══════════════════════════════════ */}
      <section className="relative z-10 py-28 px-6">
        <RippleReveal originX={50} originY={30} endRadius={90} duration={0.8} className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              Anatomy of a result
            </h2>
            <p style={{ color: "rgba(243,245,247,0.55)" }} className="text-lg max-w-xl mx-auto">
              Every result is a self-contained evidence object. File, line, snippet, and full score breakdown.
            </p>
          </div>

          {/* Mock result card */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0a0d14] overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-white/[0.05]">
              <div>
                <div className="font-mono text-xs text-white/40 mb-1.5">
                  src/middleware/jwt.ts:42
                </div>
                <h4 className="text-lg font-bold">
                  validateAndRefreshToken()
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-bold"
                  style={{ borderColor: "#F6B94C", color: "#F6B94C" }}
                >
                  96
                </div>
              </div>
            </div>

            {/* Snippet */}
            <div className="p-6 font-mono text-[13px] leading-relaxed" style={{ color: "rgba(243,245,247,0.6)" }}>
              <div className="flex">
                <span className="select-none w-10 shrink-0 text-white/20 text-right pr-4">40</span>
                <span>{"export async function validateAndRefreshToken(req: Request) {"}</span>
              </div>
              <div className="flex">
                <span className="select-none w-10 shrink-0 text-white/20 text-right pr-4">41</span>
                <span>{"  const bearer = extractBearerToken(req.headers);"}</span>
              </div>
              <div className="flex bg-[#F6B94C]/[0.06] border-l-2 border-[#F6B94C] pl-0 -ml-px">
                <span className="select-none w-10 shrink-0 text-[#F6B94C]/60 text-right pr-4">42</span>
                <span className="text-[#F6B94C]/90">
                  {"  if (isExpired(bearer)) return await rotateToken(bearer);"}
                </span>
              </div>
              <div className="flex">
                <span className="select-none w-10 shrink-0 text-white/20 text-right pr-4">43</span>
                <span>{"  return { valid: true, token: bearer };"}</span>
              </div>
              <div className="flex">
                <span className="select-none w-10 shrink-0 text-white/20 text-right pr-4">44</span>
                <span>{"}"}</span>
              </div>
            </div>

            {/* Score bars */}
            <div className="px-6 pb-6 pt-2 border-t border-white/[0.05]">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono text-white/40">lexical</span>
                    <span className="font-mono text-[#F6B94C]">0.82</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#F6B94C]" style={{ width: "82%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono text-white/40">semantic</span>
                    <span className="font-mono text-[#14B8A6]">0.91</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#14B8A6]" style={{ width: "91%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono text-white/40">quality</span>
                    <span className="font-mono text-[#7C5CFF]">0.88</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: "88%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RippleReveal>
      </section>

      {/* ═══════════════════════════════════
          6. CODE SNIPPETS — Staggered lines
          ═══════════════════════════════════ */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              Exact context, every time
            </h2>
            <p style={{ color: "rgba(243,245,247,0.55)" }} className="text-lg max-w-xl mx-auto">
              Ixos returns the precise lines that matched. Not file names. Not summaries. The actual code.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0a0d14] overflow-hidden">
            {/* File header */}
            <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <span className="font-mono text-xs text-white/40">
                src/middleware/jwt.ts:42
              </span>
            </div>

            {/* Code lines with stagger */}
            <StaggerChildren stagger={0.1} className="p-5 font-mono text-[13px] leading-[1.9]">
              {[
                { num: 38, text: "import { rotateToken, isExpired } from './token-manager';", color: "rgba(243,245,247,0.4)" },
                { num: 39, text: "", color: "transparent" },
                { num: 40, text: "export async function validateAndRefreshToken(req: Request) {", color: "rgba(243,245,247,0.65)" },
                { num: 41, text: "  const bearer = extractBearerToken(req.headers);", color: "rgba(243,245,247,0.65)" },
                { num: 42, text: "  if (isExpired(bearer)) return await rotateToken(bearer);", color: "#F6B94C", highlight: true },
                { num: 43, text: "  return { valid: true, token: bearer };", color: "rgba(243,245,247,0.65)" },
                { num: 44, text: "}", color: "rgba(243,245,247,0.65)" },
                { num: 45, text: "", color: "transparent" },
              ].map((line) => (
                <motion.div
                  key={line.num}
                  variants={fadeLine}
                  className={`flex ${line.highlight ? "bg-[#F6B94C]/[0.06] border-l-2 border-[#F6B94C] -ml-px pl-0" : ""}`}
                >
                  <span className="select-none w-10 shrink-0 text-right pr-4 text-white/20">
                    {line.num}
                  </span>
                  <span style={{ color: line.color }}>{line.text || "\u00A0"}</span>
                </motion.div>
              ))}
            </StaggerChildren>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          7. SCORE BREAKDOWN — Pinned explainer
          ═══════════════════════════════════ */}
      <section className="relative z-10 py-28 px-6">
        <div ref={scoreRef} className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
            {/* Left: explanation */}
            <div className="md:sticky md:top-32">
              <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ letterSpacing: "-0.03em" }}>
                The math is transparent
              </h2>
              <p className="mb-6" style={{ color: "rgba(243,245,247,0.55)", fontSize: 15, lineHeight: 1.7 }}>
                Every Ixos result carries a deterministic score breakdown that you can inspect and verify.
                No black boxes. No hidden weights. The final score is a fusion of three independent signals.
              </p>
              <div className="space-y-4 text-sm" style={{ color: "rgba(243,245,247,0.5)" }}>
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#F6B94C] mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-white/80">Lexical score</strong> measures exact keyword overlap using
                    BM25 term-frequency analysis across the full document.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#14B8A6] mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-white/80">Semantic score</strong> captures conceptual similarity through
                    Model2Vec embeddings computed entirely on your local machine.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#7C5CFF] mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-white/80">Quality boost</strong> factors in file recency, code structure
                    quality, and access patterns for context-aware re-ranking.
                  </span>
                </div>
              </div>
            </div>

            {/* Right: animated bars */}
            <div className="pt-4">
              <div className="p-8 rounded-xl border border-white/[0.08] bg-[#0a0d14]">
                <div className="font-mono text-xs text-white/30 uppercase tracking-widest mb-8">
                  Score Breakdown
                </div>
                <ScoreBar label="lexical" value={0.82} color="#F6B94C" inView={scoreInView} delay={0} />
                <ScoreBar label="semantic" value={0.91} color="#14B8A6" inView={scoreInView} delay={0.15} />
                <ScoreBar label="quality" value={0.88} color="#7C5CFF" inView={scoreInView} delay={0.3} />
                <div className="mt-8 pt-6 border-t border-white/[0.06]">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm text-white/40">Final score</span>
                    <motion.span
                      className="text-3xl font-bold"
                      style={{ color: "#F6B94C" }}
                      initial={{ opacity: 0 }}
                      animate={scoreInView ? { opacity: 1 } : {}}
                      transition={{ delay: 0.6, duration: 0.4 }}
                    >
                      0.96
                    </motion.span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          8. WORKSTREAMS — Circle mask reveal
          ═══════════════════════════════════ */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              Session recovery
            </h2>
            <p style={{ color: "rgba(243,245,247,0.55)" }} className="text-lg max-w-xl mx-auto">
              Group your searches into logical workstreams. Resume exactly where you left off, across sessions and machines.
            </p>
          </div>

          <RippleReveal originX={50} originY={50} startRadius={0} endRadius={85} duration={0.9}>
            <div
              className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0d12]/80 shadow-2xl shadow-[#14B8A6]/5"
              style={{ minHeight: 520 }}
            >
              <DemoSurface
                initialView="workstreams"
                initialQuery="Refactor payment processing"
              />
            </div>
          </RippleReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════
          9. CLI FLOW — Terminal chrome
          ═══════════════════════════════════ */}
      <section id="cli" className="relative z-10 py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              For the terminal native
            </h2>
            <p style={{ color: "rgba(243,245,247,0.55)" }} className="text-lg max-w-lg mx-auto">
              Full CLI with progressive output, JSON export, and journalist mode for maximum privacy.
            </p>
          </div>

          {/* Terminal chrome */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0a0d14] overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="font-mono text-xs text-white/30 ml-2">ixos v0.4.0</span>
            </div>

            {/* CLI commands */}
            <StaggerChildren stagger={0.18} className="p-6 font-mono text-[13px] leading-[2.2] space-y-4">
              <motion.div variants={fadeLine}>
                <span className="text-white/30">$ </span>
                <span className="text-[#F6B94C]">ixos</span>
                <span className="text-white/70">{" search \"authentication token refresh\" --progressive"}</span>
                <div className="text-white/25 ml-2 text-xs mt-0.5">Stream results as each pipeline stage completes</div>
              </motion.div>
              <motion.div variants={fadeLine}>
                <span className="text-white/30">$ </span>
                <span className="text-[#F6B94C]">ixos</span>
                <span className="text-white/70">{" search --show-scores --json"}</span>
                <div className="text-white/25 ml-2 text-xs mt-0.5">Pipe structured JSON with full score breakdown</div>
              </motion.div>
              <motion.div variants={fadeLine}>
                <span className="text-white/30">$ </span>
                <span className="text-[#F6B94C]">ixos</span>
                <span className="text-white/70">{" search \"source protection\" --journalist-mode"}</span>
                <div className="text-white/25 ml-2 text-xs mt-0.5">Maximum privacy: ephemeral cache, no logs, no history</div>
              </motion.div>
              <motion.div variants={fadeLine}>
                <span className="text-white/30">$ </span>
                <span className="text-[#F6B94C]">ixos</span>
                <span className="text-white/70">{" search \"config\" --cache-mode ephemeral"}</span>
                <div className="text-white/25 ml-2 text-xs mt-0.5">All embeddings discarded after query. Zero footprint.</div>
              </motion.div>
            </StaggerChildren>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          10. TRANSPARENCY — Layered cards
          ═══════════════════════════════════ */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              Auditable by design
            </h2>
            <p style={{ color: "rgba(243,245,247,0.55)" }} className="text-lg max-w-xl mx-auto">
              Every claim we make is verifiable. The core engine is open source. Every search path is deterministic.
            </p>
          </div>

          <div className="relative flex justify-center items-center" style={{ height: 340 }}>
            {[
              {
                text: "Every search runs locally",
                detail: "Zero network calls. Works offline. Your filesystem is the only data source.",
                rotate: -6,
                x: -40,
                y: -20,
                opacity: 0.6,
                color: "#F6B94C",
              },
              {
                text: "Every score is deterministic",
                detail: "Same query, same files, same result. No probabilistic re-ranking or server-side logic.",
                rotate: -1,
                x: 0,
                y: 0,
                opacity: 0.8,
                color: "#14B8A6",
              },
              {
                text: "Every path is verifiable",
                detail: "Ed25519 cryptographic attestation signs every search result for provenance.",
                rotate: 4,
                x: 40,
                y: 20,
                opacity: 1,
                color: "#7C5CFF",
              },
            ].map((card, i) => {
              const ref = useRef<HTMLDivElement>(null);
              const visible = useInView(ref, { once: true, margin: "-60px" });

              return (
                <motion.div
                  key={card.text}
                  ref={ref}
                  initial={{ opacity: 0, y: 40, rotate: 0 }}
                  animate={
                    visible
                      ? { opacity: card.opacity, y: card.y, rotate: card.rotate, x: card.x }
                      : {}
                  }
                  transition={{ duration: 0.6, delay: i * 0.12 }}
                  className="absolute w-[340px] sm:w-[400px] p-8 rounded-xl border bg-[#0a0d14]"
                  style={{
                    borderColor: `${card.color}30`,
                    zIndex: i + 1,
                  }}
                >
                  <h3 className="text-xl font-bold mb-2" style={{ color: card.color }}>
                    {card.text}
                  </h3>
                  <p className="text-sm" style={{ color: "rgba(243,245,247,0.45)" }}>
                    {card.detail}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          11. PRICING — Concentric layout
          ═══════════════════════════════════ */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              Simple pricing
            </h2>
            <p style={{ color: "rgba(243,245,247,0.55)" }} className="text-lg max-w-xl mx-auto">
              Start free. Upgrade when your workstreams demand it.
            </p>
          </div>

          {/* Concentric layout: outer = Community, inner = Pro */}
          <div className="relative flex justify-center">
            {/* Outer ring: Community */}
            <div className="w-full max-w-3xl rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-10">
                <div>
                  <h3 className="text-xl font-bold text-white/80 mb-1">Community</h3>
                  <div className="text-4xl font-bold">
                    $0
                    <span className="text-base font-normal text-white/30 ml-1">forever</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm" style={{ color: "rgba(243,245,247,0.5)" }}>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    Local vector search with Flash and Auto modes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    VS Code extension and standard CLI
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    Up to 3 active workstreams
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    HMAC-SHA256 cache signing
                  </li>
                </ul>
              </div>

              {/* Inner ring: Pro */}
              <div className="rounded-xl border border-[#F6B94C]/30 bg-[#F6B94C]/[0.03] p-8 md:p-10 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#F6B94C]/[0.06] rounded-full blur-[80px]" />
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-[#F6B94C] mb-1">Pro</h3>
                      <div className="text-4xl font-bold">
                        $12
                        <span className="text-base font-normal text-white/30 ml-1">/month</span>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm" style={{ color: "rgba(243,245,247,0.6)" }}>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#F6B94C]" />
                        JIT Pro embedding models with deep reasoning
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#F6B94C]" />
                        Unlimited workstreams with session recovery
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#F6B94C]" />
                        Journalist mode and ephemeral cache
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#F6B94C]" />
                        Ed25519 cryptographic attestation
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#F6B94C]" />
                        Priority support and early access
                      </li>
                    </ul>
                  </div>
                  <a
                    href="#download"
                    className="inline-block px-8 py-3 rounded-full bg-[#F6B94C] text-[#060810] font-semibold text-sm hover:bg-[#f0c45e] transition-colors"
                  >
                    Start Free Trial
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
          12. FOOTER CTA — Collapsing ripple
          ═══════════════════════════════════ */}
      <section id="download" className="relative z-10 py-32 px-6">
        <CollapsingRipple />
      </section>
    </main>
  );
}

/* ──────────────────────────────────────────────
   Collapsing Ripple footer CTA
   ────────────────────────────────────────────── */
function CollapsingRipple() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="max-w-3xl mx-auto text-center">
      <motion.div
        initial={{ clipPath: "circle(85% at 50% 50%)" }}
        animate={inView ? { clipPath: "circle(60% at 50% 50%)" } : {}}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative rounded-2xl p-16 md:p-20 overflow-hidden"
      >
        {/* Amber glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F6B94C]/[0.06] via-[#F6B94C]/[0.03] to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#F6B94C]/[0.05] blur-[120px] rounded-full" />

        <div className="relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ letterSpacing: "-0.03em" }}>
            Stop searching the cloud.
          </h2>
          <p className="mb-10 text-base" style={{ color: "rgba(243,245,247,0.5)" }}>
            Your code deserves a search engine that respects it. Local-first.
            Sub-second. Cryptographically verifiable.
          </p>
          <a
            href="#"
            className="inline-block px-10 py-4 rounded-full bg-[#F6B94C] text-[#060810] font-bold text-base hover:bg-[#f0c45e] transition-colors shadow-lg shadow-[#F6B94C]/20"
          >
            Download Ixos
          </a>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs font-mono" style={{ color: "rgba(243,245,247,0.3)" }}>
            <span>macOS / Windows / Linux</span>
            <span className="text-white/10">|</span>
            <span>MIT License</span>
            <span className="text-white/10">|</span>
            <span>Zero telemetry</span>
          </div>
        </div>
      </motion.div>

      <div className="mt-16 text-white/20 text-xs">
        2026 Ixos Inc. All rights reserved.
      </div>
    </div>
  );
}
