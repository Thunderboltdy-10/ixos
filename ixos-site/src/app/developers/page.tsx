"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";

const PIPELINE_STAGES = [
  {
    stage: "01",
    title: "Scan",
    desc: "Rust file-watcher daemon monitors your project in real-time. Rate-limited at 100 events/sec with dedup and symlink protection. Changes are captured instantly.",
    color: "#F6B94C",
    tag: "FS_WATCH",
  },
  {
    stage: "02",
    title: "Lexical",
    desc: "BM25-powered keyword matching with parallel Rayon processing. Pre-filters millions of tokens across your entire directory tree in under 10ms.",
    color: "#14B8A6",
    tag: "BM25_ENGINE",
  },
  {
    stage: "03",
    title: "Semantic",
    desc: "Model2Vec embeddings generated locally via ONNX runtime. Cosine similarity ranking surfaces intent-matching results that keyword search alone would miss.",
    color: "#7C5CFF",
    tag: "EMBED_LOCAL",
  },
  {
    stage: "04",
    title: "Locked",
    desc: "Final hybrid score fuses lexical, semantic, and quality signals. Results are integrity-verified with behavioral scoring and attack detection. Deterministic output.",
    color: "#F6B94C",
    tag: "HYBRID_LOCK",
  },
];

const SECURITY_FEATURES = [
  {
    metric: "HMAC-SHA256 signing",
    detail: "Every cached embedding is cryptographically signed to prevent tampering",
    color: "#14B8A6",
    tag: "INTEGRITY",
  },
  {
    metric: "mlock memory protection",
    detail: "Sensitive buffers locked in RAM and zeroized on drop. Never swapped to disk.",
    color: "#14B8A6",
    tag: "SECMEM",
  },
  {
    metric: "Zero cloud dependency",
    detail: "All embedding generation and search ranking runs on your local CPU",
    color: "#14B8A6",
    tag: "ISOLATION",
  },
];

const CACHE_FORMAT = `[version:u8]           1 byte
[model_fingerprint:32b] 32 bytes
[file_hash:32b]         32 bytes
[embedding:128b]        128 bytes  (64-dim × f16)
[signature:32b]         32 bytes   (HMAC-SHA256)
────────────────────────────────
Total:                  225 bytes per entry`;

const COMP_FEATURES = [
  { feature: "Full-text keyword search", ixos: "yes", grep: "yes", spotlight: "yes", vscode: "yes" },
  { feature: "Semantic understanding", ixos: "yes", grep: "no", spotlight: "partial", vscode: "no" },
  { feature: "Local-first / no egress", ixos: "yes", grep: "yes", spotlight: "partial", vscode: "partial" },
  { feature: "Progressive results", ixos: "yes", grep: "no", spotlight: "no", vscode: "no" },
  { feature: "No background daemon", ixos: "yes", grep: "yes", spotlight: "no", vscode: "partial" },
  { feature: "Hybrid retrieval", ixos: "yes", grep: "no", spotlight: "no", vscode: "no" },
  { feature: "Cryptographic cache signing", ixos: "yes", grep: "no", spotlight: "no", vscode: "no" },
  { feature: "Cross-platform", ixos: "yes", grep: "yes", spotlight: "no", vscode: "yes" },
  { feature: "Natural language queries", ixos: "pro", grep: "no", spotlight: "no", vscode: "no" },
];

type CellValue = "yes" | "no" | "partial" | "pro";

function CompSymbol({ value, isIxos }: { value: CellValue; isIxos: boolean }) {
  if (value === "yes")
    return (
      <span style={{ fontSize: 14, color: isIxos ? "#F6B94C" : "rgba(255,255,255,0.35)", fontWeight: isIxos ? 700 : 400 }}>
        ■
      </span>
    );
  if (value === "no") return <span style={{ fontSize: 14, color: "rgba(255,255,255,0.15)" }}>—</span>;
  if (value === "partial") return <span style={{ fontSize: 14, color: "rgba(245,158,11,0.6)" }}>◐</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "#F6B94C", fontFamily: "var(--font-ixo-mono, monospace)", letterSpacing: "0.05em" }}>
      <span style={{ fontSize: 13 }}>◆</span>
      <span style={{ fontSize: 8, opacity: 0.8 }}>PRO</span>
    </span>
  );
}

export default function DevelopersPage() {
  return (
    <div className="relative min-h-screen text-[#f3f5f7] selection:bg-amber-400/30" style={{ overflowX: "clip" }}>
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
                ▸ For Developers
              </p>
              <h1
                className="text-4xl md:text-6xl font-semibold font-display text-white mb-6"
                style={{ letterSpacing: "-0.03em", lineHeight: 1.08 }}
              >
                Built for engineers who{" "}
                <span className="heading-gradient-teal">read source code.</span>
              </h1>
              <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
                Four-stage pipeline. Hybrid retrieval. HMAC-signed caches. Deterministic
                ranking. Here&apos;s how it works under the hood.
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
                  ▸ Pipeline
                </p>
                <h2
                  className="text-3xl md:text-5xl font-semibold font-display text-white"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  The crystallized pipeline.
                </h2>
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Four stages. From raw filesystem scan to cryptographically locked results.
                </p>
              </div>
            </FadeInView>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PIPELINE_STAGES.map((item, i) => (
                <FadeInView key={item.stage} direction="up" delay={i * 80}>
                  <div
                    className="p-8 border relative"
                    style={{ borderColor: `${item.color}22`, background: `${item.color}04` }}
                  >
                    <CornerBrackets size={12} color={`${item.color}30`} />
                    <div
                      className="font-mono text-[10px] font-semibold tracking-[0.3em] uppercase mb-4 flex items-center justify-between"
                      style={{ color: item.color }}
                    >
                      <span>Phase {item.stage}</span>
                      <span className="opacity-40">[{item.tag}]</span>
                    </div>
                    <h3 className="text-2xl font-bold font-mono mb-3" style={{ color: item.color }}>
                      {item.title}
                    </h3>
                    <p className="text-sm font-mono leading-relaxed text-white/40">{item.desc}</p>
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
                  ▸ Cache Binary Format
                </p>
                <h2
                  className="text-3xl md:text-4xl font-semibold font-display text-white"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  225 bytes per entry.
                </h2>
              </div>
            </FadeInView>

            <FadeInView direction="up" delay={100}>
              <div className="border border-amber-400/15 bg-[#0A0D0F] overflow-hidden relative">
                <CornerBrackets size={14} color="rgba(246,185,76,0.12)" />
                <div className="px-5 py-3 border-b border-amber-400/8 bg-amber-400/[0.02]">
                  <span className="font-mono text-xs text-amber-400/40 uppercase tracking-widest">
                    embedding_cache.bin
                  </span>
                </div>
                <pre className="p-6 font-mono text-[13px] leading-relaxed text-white/50 overflow-x-auto">
                  {CACHE_FORMAT}
                </pre>
              </div>
            </FadeInView>
          </div>
        </section>

        {/* Security */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <FadeInView direction="up">
              <div className="text-center mb-14">
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-teal-400/60 mb-4">
                  ▸ Security Posture
                </p>
                <h2
                  className="text-3xl md:text-5xl font-semibold font-display text-white"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  Zero-trust by default.
                </h2>
              </div>
            </FadeInView>

            <div className="flex flex-col gap-4">
              {SECURITY_FEATURES.map((row, i) => (
                <FadeInView key={row.metric} direction="up" delay={i * 80}>
                  <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5 px-6 border border-teal-400/10 bg-teal-400/[0.02] relative">
                    <span
                      className="absolute top-2 right-3 text-[9px] font-mono tracking-widest"
                      style={{ color: "rgba(20,184,166,0.3)" }}
                    >
                      [{row.tag}]
                    </span>
                    <span
                      className="text-2xl md:text-3xl font-bold font-mono"
                      style={{ color: row.color }}
                    >
                      {row.metric}
                    </span>
                    <span className="text-sm font-mono text-white/40">{row.detail}</span>
                  </div>
                </FadeInView>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <FadeInView direction="up">
              <div className="text-center mb-14">
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/60 mb-4">
                  ▸ Feature Matrix
                </p>
                <h2
                  className="text-3xl md:text-5xl font-semibold font-display text-white"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  Desktop search. Plainly compared.
                </h2>
              </div>
            </FadeInView>

            <FadeInView direction="up" delay={100}>
              <div style={{ background: "rgb(16,20,26)", border: "1px solid rgba(246,185,76,0.15)", borderTop: "2px solid rgba(246,185,76,0.25)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(246,185,76,0.02)", gap: 8 }}>
                  <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)" }}>Capability</div>
                  {["Ixos", "grep/rg", "Spotlight", "VS Code"].map((tool, i) => (
                    <div key={tool} className="font-mono" style={{ fontSize: 10, textAlign: "center", color: i === 0 ? "rgba(246,185,76,0.85)" : "rgba(255,255,255,0.3)", letterSpacing: "0.05em", fontWeight: i === 0 ? 600 : 400, background: i === 0 ? "rgba(246,185,76,0.06)" : "transparent", borderRadius: 3, padding: "2px 4px" }}>
                      {tool}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                <div style={{ padding: "8px 0" }}>
                  {COMP_FEATURES.map((feat) => (
                    <div key={feat.feature} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", alignItems: "center", padding: "11px 12px", gap: 8 }}>
                      <div className="font-mono" style={{ fontSize: 12, color: "rgba(243,245,247,0.65)", letterSpacing: "0.01em" }}>
                        {feat.feature}
                      </div>
                      {(["ixos", "grep", "spotlight", "vscode"] as const).map((k) => (
                        <div key={k} style={{ textAlign: "center", background: k === "ixos" ? "rgba(246,185,76,0.04)" : "transparent", borderRadius: 3, padding: "2px 4px" }}>
                          <CompSymbol value={feat[k] as CellValue} isIxos={k === "ixos"} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: 12, borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                  {[
                    { symbol: "■", label: "Supported", color: "rgba(246,185,76,0.7)" },
                    { symbol: "◐", label: "Partial", color: "rgba(245,158,11,0.6)" },
                    { symbol: "—", label: "Not supported", color: "rgba(255,255,255,0.2)" },
                    { symbol: "◆", label: "Pro tier", color: "#F6B94C" },
                  ].map((item) => (
                    <div key={item.label} className="font-mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                      <span style={{ color: item.color, fontSize: 12 }}>{item.symbol}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
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
                © 2026 Ixos Inc. All rights reserved.
              </div>
            </FadeInView>
          </div>
        </section>
      </main>
    </div>
  );
}
