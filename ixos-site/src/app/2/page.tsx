"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { DemoSurface } from "@/landing/DemoSurface";

/* ── 3D core: SSR-disabled, renders only in browser ── */
const VaultCore = dynamic(() => import("./VaultCore"), { ssr: false });

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION ANIMATION WRAPPER
   ═══════════════════════════════════════════════════════════════════════════ */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAVIGATION — Hide on scroll down, reappear on scroll up
   ═══════════════════════════════════════════════════════════════════════════ */
function VaultNav() {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < 80 || y < lastY.current);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-6 md:px-10"
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: "rgba(3, 5, 8, 0.7)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -70 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      <a href="/" className="text-white text-sm font-medium tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
        ixos
      </a>
      <div className="flex items-center gap-8 text-[13px] text-white/50">
        <a href="#indexer" className="hover:text-white/90 transition-colors">Engine</a>
        <a href="#privacy" className="hover:text-white/90 transition-colors">Privacy</a>
        <a href="#pricing" className="hover:text-white/90 transition-colors">Pricing</a>
        <a
          href="#cta"
          className="px-4 py-1.5 rounded bg-[#F6B94C]/10 text-[#F6B94C] border border-[#F6B94C]/20 hover:bg-[#F6B94C]/20 transition-colors"
        >
          Download
        </a>
      </div>
    </motion.nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INDEXER STEP NODE (Section 3)
   ═══════════════════════════════════════════════════════════════════════════ */
const INDEXER_STEPS = [
  { label: "Scan", desc: "Enumerate files via parallel directory walk", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  { label: "Parse", desc: "Extract tokens, symbols, and structure", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
  { label: "Embed", desc: "Vectorize content with local model", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Cache", desc: "Store embeddings with HMAC-SHA256 signing", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PRIVACY CHIP (Section 9)
   ═══════════════════════════════════════════════════════════════════════════ */
const PRIVACY_ITEMS = [
  { label: "No Cloud Index", detail: "Index never leaves disk" },
  { label: "HMAC-SHA256", detail: "Cryptographic cache signing" },
  { label: "mlock Memory", detail: "Embeddings pinned, never paged" },
  { label: "Timing Protection", detail: "Opt-in constant-time search" },
  { label: "Ephemeral Mode", detail: "Zero persistence on exit" },
  { label: "Local-Only", detail: "No network calls, ever" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Page2TheVault() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroParallax = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <main className="min-h-screen text-gray-200 overflow-x-hidden selection:bg-[#F6B94C]/30" style={{ background: "#030508" }}>
      <VaultNav />

      {/* ================================================================
          1. HERO — Centered Parallax Stage
          ================================================================ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-[60px]">
        {/* 3D Core background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <VaultCore className="absolute inset-0 w-full h-full" />
          {/* Fallback: static amber gradient if WebGL fails */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(246,185,76,0.12) 0%, transparent 70%)" }}
          />
        </div>

        <motion.div
          className="relative z-10 text-center mb-12 max-w-3xl mx-auto"
          style={{ y: heroParallax, opacity: heroOpacity }}
        >
          <motion.p
            className="text-xs uppercase tracking-[0.3em] text-[#F6B94C]/70 mb-5 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Local-first semantic search
          </motion.p>
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-light tracking-[-0.03em] text-white mb-6"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            The Local Index.
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-white/40 font-light max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            A cryptographically signed vector index that never leaves your machine.
          </motion.p>
        </motion.div>

        <motion.div
          className="relative z-10 w-full max-w-4xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          style={{ minHeight: 620 }}
        >
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: "1px solid rgba(246,185,76,0.12)",
              background: "rgba(3,5,8,0.85)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(246,185,76,0.06)",
            }}
          >
            <DemoSurface
              initialQuery="How does token refresh work?"
              autoRun
              presets={[
                "How does token refresh work?",
                "rate limiter middleware",
                "database migration scripts",
                "authentication flow",
              ]}
            />
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <motion.div
            className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-1 h-2 bg-white/40 rounded-full"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================
          2. VAULT FLOOR — Full-width Atmospheric Band
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(246,185,76,0.03) 0%, transparent 70%)" }}>
        <Reveal className="max-w-3xl mx-auto">
          <div className="flex items-start gap-6">
            <div className="w-1 shrink-0 self-stretch rounded-full" style={{ background: "linear-gradient(to bottom, #F6B94C, transparent)" }} />
            <div>
              <h2
                className="text-3xl md:text-4xl font-light text-white mb-5 tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Zero Cloud. Zero Tracking.
              </h2>
              <p className="text-white/45 text-lg leading-relaxed max-w-2xl">
                Your proprietary codebase never touches a remote server. Ixos builds and queries a local vector
                index on your filesystem. Embeddings are signed with HMAC-SHA256, stored in platform-native
                metadata (NTFS ADS on Windows, xattr on Unix), and optionally protected with mlock memory
                pinning and ephemeral mode.
              </p>
              <p className="text-white/30 text-sm mt-6 font-mono">
                No telemetry. No analytics. No phone-home.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================================================================
          3. THE INDEXER — SVG Line-Drawing Pipeline
          ================================================================ */}
      <section id="indexer" className="relative py-28 md:py-36 px-6" style={{ background: "#050709" }}>
        <Reveal className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.25em] text-[#14B8A6]/70 mb-3 font-mono">The engine</p>
            <h2
              className="text-3xl md:text-4xl font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How the index builds itself
            </h2>
          </div>

          {/* Pipeline steps with connecting lines */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px">
              <svg className="w-full h-2 overflow-visible" preserveAspectRatio="none">
                <line
                  x1="0" y1="1" x2="100%" y2="1"
                  stroke="#14B8A6"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                  strokeOpacity="0.3"
                >
                  <animate attributeName="stroke-dashoffset" from="20" to="0" dur="2s" repeatCount="indefinite" />
                </line>
              </svg>
            </div>

            {INDEXER_STEPS.map((step, i) => (
              <Reveal key={step.label} delay={i * 0.12} className="relative flex flex-col items-center text-center px-4 py-6">
                <div
                  className="w-[104px] h-[104px] rounded-2xl flex items-center justify-center mb-5 relative"
                  style={{
                    background: "rgba(20,184,166,0.06)",
                    border: "1px solid rgba(20,184,166,0.15)",
                  }}
                >
                  <svg className="w-7 h-7 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d={step.icon} />
                  </svg>
                  {/* Step number */}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#050709] border border-[#14B8A6]/30 text-[#14B8A6] text-[10px] font-mono flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-white text-sm font-medium mb-2">{step.label}</h3>
                <p className="text-white/35 text-xs leading-relaxed max-w-[180px]">{step.desc}</p>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ================================================================
          4. SPEED METRICS — Massive Typographic Grid
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6" style={{ background: "#030508", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.25em] text-[#F6B94C]/60 mb-3 font-mono">Performance</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 text-center">
            <Reveal delay={0.0}>
              <div className="relative">
                <div
                  className="text-7xl md:text-8xl lg:text-9xl font-extralight text-white tracking-tighter leading-none mb-3"
                  style={{ fontFamily: "var(--font-display)", textShadow: "0 0 60px rgba(246,185,76,0.15)" }}
                >
                  Sub-second
                </div>
                <div className="text-white/30 uppercase tracking-[0.2em] text-[11px] font-mono">Full search pipeline</div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="relative md:border-x md:border-white/5">
                <div
                  className="text-7xl md:text-8xl lg:text-9xl font-extralight text-white tracking-tighter leading-none mb-3"
                  style={{ fontFamily: "var(--font-display)", textShadow: "0 0 60px rgba(20,184,166,0.12)" }}
                >
                  312
                </div>
                <div className="text-white/30 uppercase tracking-[0.2em] text-[11px] font-mono">Files scanned in parallel</div>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="relative">
                <div
                  className="text-7xl md:text-8xl lg:text-9xl font-extralight text-white tracking-tighter leading-none mb-3"
                  style={{ fontFamily: "var(--font-display)", textShadow: "0 0 60px rgba(246,185,76,0.15)" }}
                >
                  94%
                </div>
                <div className="text-white/30 uppercase tracking-[0.2em] text-[11px] font-mono">Cache hit rate</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================================
          5. SEARCH ACCURACY — Split Editorial
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6" style={{ background: "#050709" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#14B8A6]/70 mb-3 font-mono">Hybrid scoring</p>
              <h2
                className="text-3xl md:text-4xl font-light text-white mb-6 tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Two engines. One score.
              </h2>
              <p className="text-white/45 leading-relaxed mb-6">
                Ixos runs a parallel scoring pipeline. The lexical engine matches exact tokens and patterns for
                precision. The semantic engine embeds your query into a vector space to capture conceptual
                similarity. The two are fused using an adaptive weighting algorithm that detects degradation
                attacks and adjusts automatically.
              </p>
              <p className="text-white/30 text-sm leading-relaxed">
                In benchmarks, the hybrid approach consistently outperforms either engine alone, especially on
                natural-language queries against codebases with mixed naming conventions.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="space-y-5">
              {/* Lexical bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Lexical</span>
                  <span className="text-xs text-[#F6B94C] font-mono">0.78</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "#F6B94C" }}
                    initial={{ width: 0 }}
                    whileInView={{ width: "78%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Semantic bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Semantic</span>
                  <span className="text-xs text-[#14B8A6] font-mono">0.91</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "#14B8A6" }}
                    initial={{ width: 0 }}
                    whileInView={{ width: "91%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.45, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Combined bar */}
              <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/70 font-mono uppercase tracking-wider">Combined</span>
                  <span className="text-xs text-white font-mono font-medium">0.94</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #F6B94C 0%, #14B8A6 60%, #5EEAD4 100%)" }}
                    initial={{ width: 0 }}
                    whileInView={{ width: "94%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          6. CODE SNIPPETS — Sticky Code Viewer
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6" style={{ background: "#030508" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.25em] text-[#7C5CFF]/70 mb-3 font-mono">Context</p>
            <h2
              className="text-3xl md:text-4xl font-light text-white mb-4 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              High-fidelity code context
            </h2>
            <p className="text-white/40 mb-10 max-w-xl">
              Results include highlighted source with matched lines, so you can evaluate relevance
              without switching windows.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "#0a0d14",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Path header */}
              <div
                className="px-5 py-3 flex items-center gap-3 font-mono text-xs"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-white/25">src/auth/</span>
                <span className="text-white/60">session.ts</span>
                <span className="ml-auto text-[#14B8A6]/50">:42-58</span>
              </div>

              {/* Code block */}
              <div className="p-5 font-mono text-[13px] leading-relaxed overflow-x-auto">
                <div className="flex">
                  <span className="text-white/15 select-none w-10 shrink-0 text-right pr-4">41</span>
                  <span><span className="text-[#7C5CFF]">export async function</span> <span className="text-[#F6B94C]">validateSession</span>(req: Request) {"{"}</span>
                </div>
                <div
                  className="flex my-0.5 -mx-5 px-5 py-1"
                  style={{ background: "rgba(246,185,76,0.06)", borderLeft: "2px solid #F6B94C" }}
                >
                  <span className="text-white/15 select-none w-10 shrink-0 text-right pr-4">42</span>
                  <span className="text-[#F6B94C]/90">{"  "}const token = extractBearerToken(req);</span>
                </div>
                <div
                  className="flex my-0.5 -mx-5 px-5 py-1"
                  style={{ background: "rgba(246,185,76,0.06)", borderLeft: "2px solid #F6B94C" }}
                >
                  <span className="text-white/15 select-none w-10 shrink-0 text-right pr-4">43</span>
                  <span className="text-[#F6B94C]/90">{"  "}<span className="text-[#7C5CFF]">if</span> (!token) <span className="text-[#7C5CFF]">throw new</span> AuthError(<span className="text-[#14B8A6]">&quot;Missing token&quot;</span>);</span>
                </div>
                <div className="flex">
                  <span className="text-white/15 select-none w-10 shrink-0 text-right pr-4">44</span>
                  <span className="text-white/50">{"  "}const claims = <span className="text-[#7C5CFF]">await</span> verifyJWT(token);</span>
                </div>
                <div className="flex">
                  <span className="text-white/15 select-none w-10 shrink-0 text-right pr-4">45</span>
                  <span className="text-white/50">{"  "}<span className="text-[#7C5CFF]">return</span> {"{"} userId: claims.sub, role: claims.role {"}"};</span>
                </div>
                <div className="flex">
                  <span className="text-white/15 select-none w-10 shrink-0 text-right pr-4">46</span>
                  <span className="text-white/50">{"}"}</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          7. EVIDENCE PANEL — Masked Reveal
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6" style={{ background: "#050709", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <Reveal delay={0.15}>
            <div
              className="rounded-xl p-6"
              style={{
                background: "rgba(124,92,255,0.04)",
                border: "1px solid rgba(124,92,255,0.12)",
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#7C5CFF]/70 mb-4 font-mono">Evidence card</p>
              <div className="space-y-4">
                <div>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Matched because the function name <span className="text-[#F6B94C] font-mono text-xs">validateSession</span> is
                    semantically equivalent to <span className="text-[#14B8A6] font-mono text-xs">&quot;token refresh&quot;</span> in
                    the embedding space (cosine: 0.91).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["exact:token", "semantic:auth", "semantic:session", "recency:7d"].map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded text-[10px] font-mono"
                      style={{
                        background: tag.startsWith("exact") ? "rgba(246,185,76,0.1)" : tag.startsWith("semantic") ? "rgba(20,184,166,0.1)" : "rgba(124,92,255,0.1)",
                        color: tag.startsWith("exact") ? "#F6B94C" : tag.startsWith("semantic") ? "#14B8A6" : "#7C5CFF",
                        border: `1px solid ${tag.startsWith("exact") ? "rgba(246,185,76,0.2)" : tag.startsWith("semantic") ? "rgba(20,184,166,0.2)" : "rgba(124,92,255,0.2)"}`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 text-xs text-white/30 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
                    Behavioral score: normal &middot; no degradation detected
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#7C5CFF]/70 mb-3 font-mono">Transparency</p>
              <h2
                className="text-3xl md:text-4xl font-light text-white mb-6 tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                No black boxes
              </h2>
              <p className="text-white/45 leading-relaxed mb-6">
                Every result includes a full evidence breakdown. You see the exact lexical matches, the
                semantic similarity vector, and the recency weighting that produced the final rank. The
                behavioral scoring engine monitors for anomalous patterns that could indicate a degradation
                attack on the search pipeline.
              </p>
              <p className="text-white/30 text-sm leading-relaxed">
                Click any result in the Ixos UI to inspect its rationale. Match tags show which signals
                contributed, and the evidence card provides a natural-language explanation of why the
                result ranked where it did.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          8. DEEP DIVE — DemoSurface #2 (Workstreams)
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6" style={{ background: "#030508" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.25em] text-[#14B8A6]/70 mb-3 font-mono">Workstreams</p>
            <h2
              className="text-3xl md:text-4xl font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Session Recovery
            </h2>
            <p className="text-white/35 mt-4 max-w-lg mx-auto">
              Pick up exactly where you left off. Ixos tracks your active workstreams, recent files,
              and search context across sessions.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid rgba(20,184,166,0.12)",
                background: "rgba(3,5,8,0.9)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(20,184,166,0.04)",
                minHeight: 520,
              }}
            >
              <DemoSurface
                initialView="workstreams"
                initialQuery="What was I working on in the auth module?"
                autoRun={false}
                presets={[
                  "What was I working on in the auth module?",
                  "Find my recent database migration work",
                  "Show all rate limiter changes",
                ]}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          9. PRIVACY BLUEPRINT — 3x2 Diagrammatic Grid
          ================================================================ */}
      <section id="privacy" className="relative py-28 md:py-36 px-6" style={{ background: "#050709", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.25em] text-[#F6B94C]/60 mb-3 font-mono">Architecture</p>
            <h2
              className="text-3xl md:text-4xl font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Privacy by construction
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRIVACY_ITEMS.map((item, i) => (
              <Reveal key={item.label} delay={i * 0.08}>
                <div
                  className="rounded-lg p-5 h-full"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: i % 2 === 0 ? "#F6B94C" : "#14B8A6" }}
                    />
                    <span className="text-white text-sm font-medium">{item.label}</span>
                  </div>
                  <p className="text-white/30 text-xs leading-relaxed font-mono">{item.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Visual: data flow */}
          <Reveal delay={0.5} className="mt-12">
            <div className="flex items-center justify-center gap-4 text-xs font-mono flex-wrap">
              <span className="px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/60">
                Your Codebase
              </span>
              <svg className="w-6 h-4 text-[#14B8A6]/40" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 8h16m0 0l-4-4m4 4l-4 4" />
              </svg>
              <span className="px-4 py-2.5 rounded-lg border text-[#14B8A6]/80" style={{ background: "rgba(20,184,166,0.06)", borderColor: "rgba(20,184,166,0.2)" }}>
                Local Vector Index
              </span>
              <span className="text-white/15 mx-2">//</span>
              <span className="px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-white/20 line-through">
                Cloud APIs
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          10. INTEGRATION — Asymmetric Layout
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6" style={{ background: "#030508" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-16 items-center">
          <Reveal>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/30 mb-3 font-mono">Integrations</p>
              <h2
                className="text-3xl md:text-4xl font-light text-white tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Works where you work.
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "VS Code", desc: "Extension with inline results" },
                { name: "NeoVim", desc: "Telescope integration" },
                { name: "JetBrains", desc: "Tool window plugin" },
                { name: "CLI", desc: "Pipe-friendly output formats" },
              ].map((tool) => (
                <div
                  key={tool.name}
                  className="rounded-lg p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="text-white text-sm font-medium mb-1">{tool.name}</div>
                  <div className="text-white/25 text-xs">{tool.desc}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          11. PRICING — Column Layout (Table)
          ================================================================ */}
      <section
        id="pricing"
        className="relative py-28 md:py-36 px-6"
        style={{ background: "#050709", borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Simple, transparent pricing
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {/* Community column */}
              <div className="p-8 md:p-10" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 className="text-lg text-white/70 mb-1">Community</h3>
                <div className="text-4xl font-light text-white mb-8 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Free
                </div>
                <div className="space-y-4 text-sm">
                  {[
                    "Local vector search",
                    "Flash & Auto modes",
                    "CLI interface",
                    "HMAC cache signing",
                    "File watcher",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-white/40">
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  className="mt-10 w-full py-3 rounded-lg text-sm font-medium text-white/60 hover:text-white/80 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Download
                </button>
              </div>

              {/* Pro column */}
              <div className="p-8 md:p-10 relative" style={{ background: "rgba(246,185,76,0.02)" }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #F6B94C, transparent)" }} />
                <h3 className="text-lg text-[#F6B94C] mb-1">Pro</h3>
                <div className="text-4xl font-light text-white mb-8 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  $12<span className="text-lg text-white/30">/mo</span>
                </div>
                <div className="space-y-4 text-sm">
                  {[
                    "Everything in Community",
                    "Pro mode (deep semantic)",
                    "Unlimited workstreams",
                    "Cryptographic attestation",
                    "Priority model updates",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-white/50">
                      <span className="w-1 h-1 rounded-full bg-[#F6B94C]" />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  className="mt-10 w-full py-3 rounded-lg text-sm font-medium text-black hover:brightness-110 transition-all"
                  style={{ background: "#F6B94C" }}
                >
                  Start Free Trial
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          12. CTA FOOTER — Stark, Centered
          ================================================================ */}
      <section id="cta" className="relative py-36 md:py-48 px-6" style={{ background: "#030508" }}>
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-10 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Start searching locally.
          </h2>

          <div className="relative max-w-md mx-auto mb-6">
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full rounded-lg px-5 py-4 pr-28 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <button
              className="absolute right-1.5 top-1.5 bottom-1.5 px-5 rounded-md text-sm font-medium text-black hover:brightness-110 transition-all"
              style={{ background: "#F6B94C" }}
            >
              Get access
            </button>
          </div>

          <p className="text-white/20 text-xs font-mono">
            No credit card. No telemetry. Your email is used once to deliver the download link.
          </p>
        </Reveal>

        {/* Footer line */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-white/10 text-[11px] font-mono">
            &copy; 2026 Ixos &middot; All rights reserved
          </p>
        </div>
      </section>
    </main>
  );
}
