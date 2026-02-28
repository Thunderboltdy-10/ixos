"use client";

import { useCallback, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { DemoSurface } from "@/landing/DemoSurface";

/* ── Utilities ─────────────────────────────────────────────────────── */

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.35, delay, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
}

function StaggerGroup({ children, className = "", stagger = 0.08 }: { children: React.ReactNode; className?: string; stagger?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: stagger } }, hidden: {} }} className={className}>
      {children}
    </motion.div>
  );
}

const cFade = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const NAV = [
  { label: "Pipeline", id: "pipeline" }, { label: "Evidence", id: "evidence" },
  { label: "Modes", id: "modes" }, { label: "Today", id: "today" },
  { label: "CLI", id: "cli" }, { label: "Pricing", id: "pricing" },
];

const FAQS = [
  { q: "Does Ixos send any data to the cloud?", a: "Never. Every embedding is computed on your machine, cached locally using HMAC-SHA256 signed entries, and never transmitted. There are no servers to phone home to." },
  { q: "How is this different from grep or ripgrep?", a: "Grep searches for exact string matches. Ixos understands meaning. Search for 'authentication bug' and it surfaces files about token refresh failures, session expiry, and OAuth edge cases -- even when those exact words never appear." },
  { q: "What happens if my files change?", a: "The file watcher detects changes within milliseconds. Stale embeddings are invalidated via HMAC verification and re-computed on the next search. Rate limiting and deduplication prevent DoS from rapid-fire saves." },
  { q: "Which operating systems are supported?", a: "Windows (NTFS Alternate Data Streams), macOS (extended attributes), and Linux (xattr). The cache backend is auto-detected per filesystem. FAT32 and cloud drives fall back to ephemeral mode." },
  { q: "Is Pro worth it if Community is already fast?", a: "Community gives you Flash and Auto modes with the int8 model (16.6 MB, sub-second search). Pro unlocks the fusion model (MRR@10 = 0.92), unlimited workstreams, and deep reasoning mode for complex multi-hop queries." },
];

/* ── Tiny helpers ──────────────────────────────────────────────────── */

const Dot = ({ color }: { color: string }) => <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />;
const Kicker = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span className="inline-block font-mono text-[10px] tracking-[0.25em] uppercase px-2.5 py-1 rounded-full mb-5" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>{children}</span>
);
const SepBorder = "border-t border-white/[0.04]";

/* ── Page ──────────────────────────────────────────────────────────── */

export default function Page1DemoGuided() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const scrollTo = useCallback((id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }, []);
  const A = "var(--color-accent-amber)", T = "var(--color-accent-teal)", V = "var(--color-accent-violet)";

  return (
    <main className="min-h-screen bg-transparent text-[var(--color-fg-porcelain)] selection:bg-amber-500/30 overflow-x-hidden">

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-12 flex items-center border-b border-white/[0.06] bg-[var(--color-bg-graphite-0)]/80 backdrop-blur-md px-4 md:px-8">
        <button onClick={() => scrollTo("hero")} className="font-display text-sm font-semibold tracking-tight text-[var(--color-accent-amber)] mr-8 shrink-0">Ixos</button>
        <div className="hidden md:flex items-center gap-5 text-[11px] tracking-wide uppercase text-white/50">
          {NAV.map((l) => <button key={l.id} onClick={() => scrollTo(l.id)} className="hover:text-white/90 transition-colors duration-150">{l.label}</button>)}
        </div>
        <div className="ml-auto">
          <button onClick={() => scrollTo("pricing")} className="text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded bg-[var(--color-accent-amber)]/10 text-[var(--color-accent-amber)] border border-[var(--color-accent-amber)]/20 hover:bg-[var(--color-accent-amber)]/20 transition-colors duration-150">Download</button>
        </div>
      </nav>

      {/* ── S1  HERO: Full-bleed Split Screen ────────────────────── */}
      <section id="hero" className="section-hero relative pt-16 min-h-screen flex flex-col lg:flex-row items-center gap-8 lg:gap-12 px-5 md:px-10 lg:px-16 pb-24">
        <div className="relative z-10 flex-1 max-w-xl pt-12 lg:pt-24">
          <Reveal><p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-amber)] mb-4">Local-first semantic search</p></Reveal>
          <Reveal delay={0.05}>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] mb-5">
              Search reimagined locally. <span className="heading-gradient-amber">Every file remembered.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}><p className="text-base sm:text-lg leading-relaxed text-white/60 max-w-lg mb-8">Ixos indexes your codebase on-device with sub-second hybrid search. No cloud. No telemetry. Just results that understand what you mean, not just what you type.</p></Reveal>
          <Reveal delay={0.15}>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => scrollTo("pricing")} className="px-5 py-2.5 rounded-md bg-[var(--color-accent-amber)] text-black text-sm font-semibold hover:brightness-110 transition-all duration-200">Download Free</button>
              <button onClick={() => scrollTo("pipeline")} className="px-5 py-2.5 rounded-md border border-white/10 text-sm font-medium text-white/70 hover:text-white hover:border-white/20 transition-all duration-200">See how it works</button>
            </div>
          </Reveal>
        </div>
        <div className="relative z-10 flex-1 w-full min-w-0 lg:min-w-[620px] max-w-2xl">
          <Reveal delay={0.2}>
            <div className="rounded-xl overflow-hidden border border-white/[0.06] shadow-lg shadow-amber-500/5 bg-[var(--color-bg-graphite-1)]/60 backdrop-blur-sm">
              <DemoSurface initialQuery="authentication token refresh" initialMode="auto" autoRun presets={["authentication token refresh", "rate limiter middleware", "How does token expiry work?", "database migration scripts"]} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── S2  TRUST STRIP: Asymmetric Grid Band ────────────────── */}
      <section className="relative z-10 py-16 px-5 md:px-10 border-y border-white/[0.04]">
        <StaggerGroup className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {([["100%", "Local-first", "Zero cloud dependency"], ["0 B", "Data sent", "No telemetry ever"], ["<800ms", "Search latency", "1,000 files, cold cache"], ["250+", "Tests passed", "Security + correctness"]] as const).map(([val, label, sub], i) => (
            <motion.div key={i} variants={cFade} className="flex items-start gap-3">
              <div className="w-[3px] shrink-0 self-stretch rounded-full bg-[var(--color-accent-amber)]" />
              <div>
                <div className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">{val}</div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40 mt-0.5">{label}</div>
                <div className="text-xs text-white/30 mt-0.5">{sub}</div>
              </div>
            </motion.div>
          ))}
        </StaggerGroup>
      </section>

      {/* ── S3  PIPELINE 1: Lexical Scan ─────────────────────────── */}
      <section id="pipeline" className={`section-how relative z-10 py-28 md:py-36 px-5 md:px-10`}>
        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-14 items-center">
          <div>
            <Reveal><Kicker color={A}>Phase 1 &mdash; Lexical</Kicker></Reveal>
            <Reveal delay={0.05}><h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-4">Millions of tokens, scanned in&nbsp;milliseconds.</h2></Reveal>
            <Reveal delay={0.1}><p className="text-white/55 leading-relaxed max-w-lg">When you hit enter, Ixos fires up a Rayon-parallelized lexical engine that streams through your entire directory. It tokenizes file contents, scores n-gram overlap against your query, and produces a ranked candidate set -- typically in under 10ms for 1,000 files.</p></Reveal>
            <Reveal delay={0.15}>
              <ul className="mt-6 space-y-3 text-sm text-white/45">
                {["Parallel file loading via Rayon for directories >100 files", "Keyword frequency analysis with sub-token matching", "Pre-filters candidates before expensive embedding step"].map((t, i) => <li key={i} className="flex items-start gap-2"><Dot color={A} />{t}</li>)}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <div className="rounded-lg border border-white/[0.06] bg-[var(--color-bg-graphite-1)]/50 p-6 space-y-3">
              <div className="font-mono text-[10px] tracking-wider uppercase text-white/30 mb-4">Lexical score distribution</div>
              {([["src/auth/token-manager.ts", 94], ["src/auth/refresh.ts", 87], ["src/api/middleware.ts", 61], ["src/utils/crypto.ts", 43], ["tests/auth.test.ts", 38], ["src/db/sessions.ts", 22]] as const).map(([file, pct], i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-xs text-white/50 truncate mr-4">{file}</span>
                    <span className="font-mono text-xs text-[var(--color-accent-amber)] shrink-0">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div className="h-full rounded-full bg-[var(--color-accent-amber)]" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} transition={{ duration: 0.4, delay: i * 0.06 }} viewport={{ once: true }} />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── S4  PIPELINE 2: Semantic Index ────────────────────────── */}
      <section className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-14 items-center">
          <Reveal>
            <div className="rounded-lg border border-white/[0.06] bg-[var(--color-bg-graphite-1)]/50 p-6">
              <div className="font-mono text-[10px] tracking-wider uppercase text-white/30 mb-5">Embedding similarity space</div>
              <div className="relative h-64 rounded-md bg-[var(--color-bg-graphite-0)]/60 overflow-hidden">
                {([{ x: 20, y: 25, l: "query", c: T, s: 10 }, { x: 26, y: 32, l: "token-mgr", c: T, s: 7 }, { x: 18, y: 38, l: "refresh.ts", c: T, s: 6 }, { x: 55, y: 55, l: "middleware", c: V, s: 5 }, { x: 72, y: 20, l: "crypto.ts", c: A, s: 4 }, { x: 80, y: 70, l: "sessions", c: "white", s: 3 }]).map((d, i) => (
                  <motion.div key={i} className="absolute flex items-center gap-1.5" style={{ left: `${d.x}%`, top: `${d.y}%` }} initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, delay: 0.1 + i * 0.06 }} viewport={{ once: true }}>
                    <div className="rounded-full" style={{ width: d.s + 4, height: d.s + 4, backgroundColor: d.c, opacity: d.l === "query" ? 1 : 0.6 }} />
                    <span className="font-mono text-[9px] whitespace-nowrap" style={{ color: d.c, opacity: 0.7 }}>{d.l}</span>
                  </motion.div>
                ))}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
                  <line x1="20%" y1="25%" x2="26%" y2="32%" stroke={T} strokeWidth="1" />
                  <line x1="20%" y1="25%" x2="18%" y2="38%" stroke={T} strokeWidth="1" />
                  <line x1="20%" y1="25%" x2="55%" y2="55%" stroke={V} strokeWidth="0.5" strokeDasharray="4" />
                </svg>
              </div>
            </div>
          </Reveal>
          <div>
            <Reveal><Kicker color={T}>Phase 2 &mdash; Semantic</Kicker></Reveal>
            <Reveal delay={0.05}><h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-4">Understanding intent, not just&nbsp;keywords.</h2></Reveal>
            <Reveal delay={0.1}><p className="text-white/55 leading-relaxed max-w-lg">After lexical filtering, the top candidates are passed to a local Model2Vec embedding model. Each file chunk is vectorized and compared against your query via cosine similarity. Cached embeddings are signed with HMAC-SHA256 so stale results are never served.</p></Reveal>
            <Reveal delay={0.15}>
              <ul className="mt-6 space-y-3 text-sm text-white/45">
                {["int8 quantized model -- 16.6 MB, MRR@10 = 0.834", "HMAC-verified cache with NTFS ADS / xattr backends", "Cosine similarity in 64-dimensional embedding space"].map((t, i) => <li key={i} className="flex items-start gap-2"><Dot color={T} />{t}</li>)}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── S5  EVIDENCE DRAWER: Score Rationale Cards ────────────── */}
      <section id="evidence" className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-violet)] mb-3">Transparency</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-3">Every result tells you <span className="heading-gradient-violet">why</span> it matched.</h2>
              <p className="text-white/50 max-w-xl mx-auto">No black boxes. Ixos exposes the full scoring breakdown -- lexical overlap, semantic similarity, recency boost, and behavioral adjustment.</p>
            </div>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {([{ t: "Lexical Score", v: "0.87", c: A, d: "Keyword frequency match against query tokens. Weighted by TF-IDF with sub-word matching." }, { t: "Semantic Score", v: "0.94", c: T, d: "Cosine similarity between query embedding and cached file chunk embedding (64-dim)." }, { t: "Hybrid Score", v: "0.91", c: V, d: "Adaptive weighted combination. Attack detection auto-adjusts weights if degradation is detected." }]).map((card, i) => (
              <motion.div key={i} variants={cFade} className="rounded-lg border border-white/[0.06] bg-[var(--color-bg-graphite-1)]/40 p-5">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-[10px] tracking-wider uppercase text-white/40">{card.t}</span>
                  <span className="font-display text-2xl font-semibold" style={{ color: card.c }}>{card.v}</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.04] mb-4 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: card.c }} initial={{ width: 0 }} whileInView={{ width: `${parseFloat(card.v) * 100}%` }} transition={{ duration: 0.4, delay: 0.15 }} viewport={{ once: true }} />
                </div>
                <p className="text-xs text-white/40 leading-relaxed">{card.d}</p>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── S6  RESULT ANATOMY: Zoomed UI Overlay ────────────────── */}
      <section className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-3">Anatomy of a result</h2>
              <p className="text-white/50 max-w-lg mx-auto">Dense, utilitarian, and instantly actionable. Every element earns its screen space.</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-xl border border-white/[0.08] bg-[var(--color-bg-graphite-1)]/60 backdrop-blur-sm overflow-hidden p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-white/35 truncate mb-1">src/auth/token-manager.ts:142</div>
                  <div className="font-display text-lg font-semibold tracking-tight">TokenManager::refreshAndRotate</div>
                </div>
                <div className="shrink-0 w-12 h-12 rounded-full border-2 border-[var(--color-accent-teal)] flex items-center justify-center">
                  <span className="font-display text-sm font-semibold text-[var(--color-accent-teal)]">98</span>
                </div>
              </div>
              <div className="rounded-md bg-[var(--color-bg-graphite-0)]/80 border border-white/[0.04] p-4 font-mono text-xs leading-relaxed overflow-x-auto">
                <div className="text-white/30"><span className="text-white/20 select-none mr-3">140</span>{`/// Refresh the current token and rotate the signing key`}</div>
                <div className="text-white/30"><span className="text-white/20 select-none mr-3">141</span><span className="text-[var(--color-accent-violet)]">pub async fn</span>{` refreshAndRotate(`}</div>
                <div className="bg-[var(--color-accent-teal)]/10 border-l-2 border-[var(--color-accent-teal)] -mx-4 px-4 py-0.5 text-white/70"><span className="text-white/20 select-none mr-3">142</span>{`  let new_token = self.issuer.rotate(old_token).await?;`}</div>
                <div className="text-white/30"><span className="text-white/20 select-none mr-3">143</span>{`  self.cache.invalidate(&old_token.fingerprint);`}</div>
              </div>
              <div className="flex items-center gap-4 mt-4 text-[10px] font-mono tracking-wide uppercase text-white/30">
                <span>Lexical <span className="text-[var(--color-accent-amber)]">0.87</span></span>
                <span className="w-px h-3 bg-white/10" />
                <span>Semantic <span className="text-[var(--color-accent-teal)]">0.94</span></span>
                <span className="w-px h-3 bg-white/10" />
                <span>Recency <span className="text-[var(--color-accent-violet)]">0.72</span></span>
                <span className="w-px h-3 bg-white/10" />
                <span>Hybrid <span className="text-white/70">0.98</span></span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── S7  MODES / QUALITY: Stepper Rail ────────────────────── */}
      <section id="modes" className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-6xl mx-auto">
          <Reveal><div className="text-center mb-14"><p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40 mb-3">Search modes</p><h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Choose your depth</h2></div></Reveal>
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {([
              { mode: "Flash", speed: "~10ms", c: A, bar: 20, model: "int8 / 16.6 MB", mrr: "0.71", desc: "Pure lexical pass. Instant results for keyword-heavy queries. Perfect for known file names and exact patterns." },
              { mode: "Auto", speed: "~40ms", c: T, bar: 55, model: "int8 / 16.6 MB", mrr: "0.83", desc: "Adaptive hybrid engine. Lexical pre-filter followed by semantic re-ranking. Best balance of speed and quality." },
              { mode: "Pro", speed: "~120ms", c: V, bar: 100, model: "Fusion / ~102 MB", mrr: "0.92", desc: "Deep semantic reasoning with fusion model. Multi-hop understanding for complex conceptual queries." },
            ]).map((m, i) => (
              <motion.div key={i} variants={cFade} className="rounded-lg border border-white/[0.06] bg-[var(--color-bg-graphite-1)]/40 p-6 flex flex-col">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-display text-xl font-semibold" style={{ color: m.c }}>{m.mode}</span>
                  <span className="font-mono text-xs text-white/30">{m.speed}</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.04] mb-4 overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.bar}%`, backgroundColor: m.c }} /></div>
                <p className="text-xs text-white/45 leading-relaxed flex-1 mb-4">{m.desc}</p>
                <div className="flex items-center justify-between text-[10px] font-mono tracking-wide uppercase text-white/25 border-t border-white/[0.04] pt-3">
                  <span>{m.model}</span><span>MRR@10 <span className="text-white/50">{m.mrr}</span></span>
                </div>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── S8  TODAY / WORKSTREAMS: Inline Demo Container ────────── */}
      <section id="today" className={`section-today relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-start">
          <div className="pt-4">
            <Reveal><p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--color-accent-teal)] mb-4">Context recovery</p></Reveal>
            <Reveal delay={0.05}><h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-4">Pick up right where you&nbsp;left&nbsp;off.</h2></Reveal>
            <Reveal delay={0.1}><p className="text-white/55 leading-relaxed mb-6">Ixos watches which files you touch, groups them into workstreams, and tells you what you were doing when you sit back down. No manual bookmarks. No IDE history digging.</p></Reveal>
            <Reveal delay={0.15}>
              <ul className="space-y-3 text-sm text-white/40">
                {["Automatic workstream detection from file access patterns", "Resilient file watcher with rate limiting (100 events/sec)", "Active / warm / cold status tracking across sessions"].map((t, i) => <li key={i} className="flex items-start gap-2"><Dot color={T} />{t}</li>)}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <div className="rounded-xl overflow-hidden border border-white/[0.06] shadow-lg shadow-teal-500/5 bg-[var(--color-bg-graphite-1)]/60 backdrop-blur-sm min-w-0 lg:min-w-[520px]">
              <DemoSurface initialView="today" initialQuery="What was I working on yesterday in the auth module?" autoRun={false} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── S9  CLI WORKFLOWS: Terminal Window Chrome ─────────────── */}
      <section id="cli" className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-10">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40 mb-3">CLI-native</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-3">For the terminal-native developer</h2>
              <p className="text-white/50 max-w-lg mx-auto">Ixos is a single Rust binary. Pipe results into your existing workflow or use JSON output for scripting.</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-lg overflow-hidden border border-white/[0.08]">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0d0f14] border-b border-white/[0.06]">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-white/10" /><div className="w-2.5 h-2.5 rounded-full bg-white/10" /><div className="w-2.5 h-2.5 rounded-full bg-white/10" /></div>
                <span className="font-mono text-[10px] text-white/25 ml-2">terminal</span>
              </div>
              <div className="bg-[#08090d] p-5 font-mono text-[12px] leading-[1.8] text-white/60 space-y-4 overflow-x-auto">
                <div><span className="text-white/25">$</span> <span className="text-[var(--color-accent-amber)]">ixos</span> search &quot;authentication token refresh&quot; --progressive --show-scores</div>
                <div className="text-white/25 text-[11px]">{`[scan] 1,247 files in 7ms`}<br />{`[lexical] 89 candidates scored`}<br />{`[semantic] 24 embedded (19 cache hits)`}<br />{`[locked] 8 results in 312ms`}</div>
                <div>
                  <span className="text-[var(--color-accent-teal)]">1.</span> <span className="text-white/80">src/auth/token-manager.ts:142</span> <span className="text-[var(--color-accent-amber)]">[0.98]</span><br />
                  <span className="text-[var(--color-accent-teal)]">2.</span> <span className="text-white/80">src/auth/refresh.ts:89</span> <span className="text-[var(--color-accent-amber)]">[0.94]</span><br />
                  <span className="text-[var(--color-accent-teal)]">3.</span> <span className="text-white/80">src/api/middleware/auth.ts:31</span> <span className="text-[var(--color-accent-amber)]">[0.87]</span>
                </div>
                <div className="border-t border-white/[0.04] pt-4"><span className="text-white/25">$</span> <span className="text-[var(--color-accent-amber)]">ixos</span> search &quot;unhandled exceptions&quot; --json | jq &quot;.results[].path&quot;</div>
                <div className="text-white/35 text-[11px]">{`"src/api/errorHandler.ts"`}<br />{`"src/core/pipeline.rs"`}<br />{`"tests/error.test.ts"`}</div>
                <div className="border-t border-white/[0.04] pt-4"><span className="text-white/25">$</span> <span className="text-[var(--color-accent-amber)]">ixos</span> search &quot;database migration&quot; --cache-mode ephemeral --journalist-mode</div>
                <div className="text-white/25 text-[11px]">{`[journalist] ephemeral mode active — no cache persisted`}<br />{`[journalist] secure timing floor enabled (100ms)`}<br />{`[locked] 5 results — memory wiped on exit`}</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── S10  PROOF / TRANSPARENCY: Bento Grid ────────────────── */}
      <section className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-3">Zero cloud. Zero telemetry. Provable.</h2>
              <p className="text-white/50 max-w-xl mx-auto">Six guarantees baked into the architecture, not bolted on after.</p>
            </div>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              { t: "No network calls", d: "The binary contains zero HTTP client code. There are no servers to send data to. Verify with `cargo audit` or read the source.", c: A },
              { t: "HMAC-signed cache", d: "Every cached embedding is signed with HMAC-SHA256. Tampered or stale entries are rejected and re-computed automatically.", c: T },
              { t: "Local execution only", d: "Embedding inference runs on your CPU. Model2Vec int8 model ships with the binary. No GPU required, no API keys.", c: V },
              { t: "Path sandboxing", d: "The security sandbox validates all file paths and restricts access to configured directories. No symlink traversal attacks.", c: A },
              { t: "Memory protection", d: "SecureBuffer uses mlock to prevent embedding data from being swapped to disk. Zeroize-on-drop clears sensitive memory.", c: T },
              { t: "Compliance built in", d: "GDPR right-to-delete, CCPA opt-out, and EU AI Act transparency requirements are satisfied by design, not by policy.", c: V },
            ]).map((item, i) => (
              <motion.div key={i} variants={cFade} className="rounded-lg border border-white/[0.06] bg-[var(--color-bg-graphite-1)]/40 p-5">
                <div className="w-1.5 h-1.5 rounded-full mb-3" style={{ backgroundColor: item.c }} />
                <h3 className="font-display text-sm font-semibold mb-2 text-white/90">{item.t}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{item.d}</p>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── S11  PRICING: Monolithic Table ────────────────────────── */}
      <section id="pricing" className={`section-pricing relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-4xl mx-auto">
          <Reveal><div className="text-center mb-14"><h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-3">Simple, honest pricing</h2><p className="text-white/50 max-w-lg mx-auto">Community is free forever. Pro unlocks the full engine.</p></div></Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-xl border border-white/[0.08] bg-[var(--color-bg-graphite-1)]/40 overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_120px] sm:grid-cols-[1fr_150px_150px] border-b border-white/[0.06]">
                <div className="p-4 sm:p-5" />
                <div className="p-4 sm:p-5 text-center border-l border-white/[0.06]"><div className="font-display text-lg font-semibold">Community</div><div className="font-display text-2xl font-semibold mt-1">Free</div></div>
                <div className="p-4 sm:p-5 text-center border-l border-[var(--color-accent-amber)]/20 bg-[var(--color-accent-amber)]/[0.03]"><div className="font-display text-lg font-semibold text-[var(--color-accent-amber)]">Pro</div><div className="font-display text-2xl font-semibold mt-1">$12<span className="text-sm text-white/40">/mo</span></div></div>
              </div>
              {([
                ["Local semantic search", true, true], ["Flash + Auto modes", true, true], ["CLI with JSON/CSV output", true, true], ["HMAC-signed cache", true, true],
                ["Pro mode (fusion model)", false, true], ["Unlimited workstreams", false, true], ["Journalist mode", false, true], ["Cryptographic attestation", false, true], ["Priority support", false, true],
              ] as const).map(([feat, comm, pro], i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_120px] sm:grid-cols-[1fr_150px_150px] border-b border-white/[0.03] last:border-b-0">
                  <div className="px-4 sm:px-5 py-3 text-xs text-white/50">{feat}</div>
                  <div className="px-4 sm:px-5 py-3 text-center border-l border-white/[0.06] text-sm">{comm ? <span className="text-white/50">&#10003;</span> : <span className="text-white/15">&mdash;</span>}</div>
                  <div className="px-4 sm:px-5 py-3 text-center border-l border-[var(--color-accent-amber)]/10 bg-[var(--color-accent-amber)]/[0.02] text-sm">{pro ? <span className="text-[var(--color-accent-amber)]">&#10003;</span> : <span className="text-white/15">&mdash;</span>}</div>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_120px_120px] sm:grid-cols-[1fr_150px_150px] border-t border-white/[0.06]">
                <div className="p-4 sm:p-5" />
                <div className="p-4 sm:p-5 flex justify-center border-l border-white/[0.06]"><button className="px-4 py-2 rounded-md border border-white/10 text-xs font-medium text-white/60 hover:text-white hover:border-white/20 transition-colors duration-150">Download</button></div>
                <div className="p-4 sm:p-5 flex justify-center border-l border-[var(--color-accent-amber)]/10 bg-[var(--color-accent-amber)]/[0.03]"><button className="px-4 py-2 rounded-md bg-[var(--color-accent-amber)] text-black text-xs font-semibold hover:brightness-110 transition-all duration-150">Start Free Trial</button></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── S12  FAQ & CTA FOOTER: Accordion Block ───────────────── */}
      <section className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-3xl mx-auto">
          <Reveal><div className="text-center mb-12"><h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-3">Frequently asked questions</h2></div></Reveal>
          <div className="space-y-2 mb-20">
            {FAQS.map((item, i) => (
              <Reveal key={i} delay={i * 0.04}>
                <div className="rounded-lg border border-white/[0.06] bg-[var(--color-bg-graphite-1)]/30 overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-sm font-medium text-white/80">{item.q}</span>
                    <motion.span animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.2 }} className="text-white/30 text-lg shrink-0 leading-none">+</motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="px-5 pb-4 text-xs text-white/45 leading-relaxed">{item.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="text-center">
              <h3 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-4">Ready to search smarter?</h3>
              <p className="text-white/45 text-sm mb-7 max-w-md mx-auto">Download Ixos, point it at a directory, and search. Setup takes less than 30 seconds.</p>
              <button className="px-7 py-3 rounded-md bg-[var(--color-accent-amber)] text-black text-sm font-semibold hover:brightness-110 transition-all duration-200">Get Ixos Free</button>
            </div>
          </Reveal>
          <div className="mt-24 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono tracking-wide uppercase text-white/20">
            <span>&copy; 2026 Ixos. All rights reserved.</span>
            <div className="flex gap-5">
              <span className="hover:text-white/40 cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-white/40 cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-white/40 cursor-pointer transition-colors">GitHub</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
