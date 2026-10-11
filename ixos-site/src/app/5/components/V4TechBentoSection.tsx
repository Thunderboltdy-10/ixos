"use client";

// ─── V4TechBentoSection ───────────────────────────────────────────────────────
// Bento-grid architecture overview combining three micro-sections:
//   1. Caching architecture (NTFS ADS / xattr / NullCache)
//   2. HMAC-SHA256 signing + Ed25519 attestation
//   3. Parallelism model (rayon threadpool)
//
// Source references:
//   - storage/ads_windows.rs, storage/xattr_unix.rs, storage/null.rs
//   - attestation/mod.rs (Ed25519 signing)
//   - ixos_rank/lexical_engine.rs (rayon parallel scan)
//   - CLAUDE.md · Key Design Patterns

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// ─── Cache diagram ────────────────────────────────────────────────────────────
function CacheDiagram({ active }: { active: boolean }) {
  const platforms = [
    { label: "Windows NTFS", detail: "NTFS Alternate Data Streams", color: "#2DD4BF", file: "storage/ads_windows.rs" },
    { label: "Linux / macOS", detail: "xattr extended attributes", color: "#7C3AED", file: "storage/xattr_unix.rs" },
    { label: "FAT32 / Cloud", detail: "NullCache (no-op fallback)", color: "#F59E0B", file: "storage/null.rs" },
  ];

  return (
    <div className="flex flex-col gap-3 mt-4">
      {platforms.map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ opacity: 0, x: -12 }}
          animate={active ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.1 + i * 0.12, duration: 0.38 }}
          className="flex items-start gap-3 p-3"
          style={{ border: `1px solid ${p.color}18`, backgroundColor: `${p.color}05` }}
        >
          <div className="w-1 h-full shrink-0 mt-0.5" style={{ backgroundColor: p.color, opacity: 0.6 }} />
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] font-semibold" style={{ color: p.color }}>{p.label}</div>
            <div className="font-mono text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{p.detail}</div>
            <div className="font-mono text-[8px] mt-1 opacity-50" style={{ color: p.color }}>{p.file}</div>
          </div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : {}}
        transition={{ delay: 0.5 }}
        className="font-mono text-[8px] mt-1 tracking-[0.12em]"
        style={{ color: "rgba(255,255,255,0.15)" }}
      >
        CLI record: 643–2,375 bytes · [IXD1][recipe][source][locators][vectors][signature]
      </motion.div>
    </div>
  );
}

// ─── Security diagram ─────────────────────────────────────────────────────────
function SecurityDiagram({ active }: { active: boolean }) {
  const steps = [
    { step: "01", label: "Embed", detail: "Generate f16 embedding vector", color: "#2DD4BF" },
    { step: "02", label: "Sign", detail: "HMAC-SHA256 over content hash", color: "#7C3AED" },
    { step: "03", label: "Attest", detail: "Ed25519 signature (P3.1)", color: "#F59E0B" },
    { step: "04", label: "Verify", detail: "On read: verify before use", color: "#2DD4BF" },
  ];

  return (
    <div className="flex flex-col gap-2 mt-4">
      {steps.map((s, i) => (
        <motion.div
          key={s.step}
          initial={{ opacity: 0, y: 8 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.08 + i * 0.1, duration: 0.35 }}
          className="flex items-center gap-3"
        >
          <span className="font-mono text-[8px] tracking-[0.2em] w-5 shrink-0" style={{ color: s.color }}>{s.step}</span>
          <div className="w-px h-6 shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
          <div>
            <div className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{s.label}</div>
            <div className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.22)" }}>{s.detail}</div>
          </div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : {}}
        transition={{ delay: 0.55 }}
        className="flex flex-wrap gap-2 mt-3"
      >
        {["ring · HMAC-SHA256", "ed25519-dalek · signatures", "zeroize · memory clear"].map((tag) => (
          <span
            key={tag}
            className="font-mono text-[8px] px-2 py-1"
            style={{ border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.25)" }}
          >
            {tag}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Parallelism diagram ──────────────────────────────────────────────────────
function ParallelismDiagram({ active }: { active: boolean }) {
  const cores = 8;
  const tasks = [
    "auth.ts", "db.ts", "api.ts", "session.ts",
    "tokens.ts", "routes.ts", "utils.ts", "config.ts",
  ];

  return (
    <div className="flex flex-col gap-4 mt-4">
      {/* Core lanes */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: cores }).map((_, c) => (
          <div key={c} className="flex items-center gap-2">
            <span className="font-mono text-[8px] w-8 text-right shrink-0" style={{ color: "rgba(255,255,255,0.18)" }}>
              c{c}
            </span>
            <motion.div
              className="h-4 flex items-center px-1.5"
              initial={{ width: 0, opacity: 0 }}
              animate={active ? { width: "auto", opacity: 1 } : {}}
              transition={{ delay: 0.05 + c * 0.08, duration: 0.4, ease: "easeOut" }}
              style={{
                backgroundColor: c % 3 === 0 ? "rgba(45,212,191,0.12)" : c % 3 === 1 ? "rgba(124,58,237,0.10)" : "rgba(245,158,11,0.10)",
                border: `1px solid ${c % 3 === 0 ? "rgba(45,212,191,0.2)" : c % 3 === 1 ? "rgba(124,58,237,0.18)" : "rgba(245,158,11,0.18)"}`,
                minWidth: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <span className="font-mono text-[8px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {tasks[c]}
              </span>
            </motion.div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : {}}
        transition={{ delay: 0.75 }}
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.22)" }}>
          rayon threadpool · auto-sized to CPU cores
        </span>
        <span className="font-mono text-[9px]" style={{ color: "#2DD4BF" }}>~7ms / 1000 files</span>
      </motion.div>

      <p className="font-mono text-[8px] tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.15)" }}>
        Source: ixos_rank/lexical_engine.rs · CLAUDE.md
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function V4TechBentoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-60px" });

  const CELLS = [
    {
      tag: "Storage",
      headline: "Cache anywhere.",
      desc: "Platform-aware embedding cache automatically selects the best backend. No manual configuration.",
      color: "#2DD4BF",
      Viz: CacheDiagram,
      span: "lg:col-span-1",
    },
    {
      tag: "Security",
      headline: "Signed embeddings.",
      desc: "Every cached embedding is HMAC-signed. Tampered or stale entries are rejected before ranking.",
      color: "#7C3AED",
      Viz: SecurityDiagram,
      span: "lg:col-span-1",
    },
    {
      tag: "Performance",
      headline: "Every core, on every search.",
      desc: "Rayon threadpool parallelizes file loading and lexical scoring across all available CPU cores.",
      color: "#F59E0B",
      Viz: ParallelismDiagram,
      span: "lg:col-span-1",
    },
  ] as const;

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)", backgroundColor: "#0C0E10" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-16"
        >
          <p className="font-mono text-[10px] tracking-[0.35em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            Architecture · Internals
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
            Built to last.
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {CELLS.map((cell, i) => {
            const { Viz } = cell;
            return (
              <motion.div
                key={cell.tag}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.12, duration: 0.55 }}
                className={`flex flex-col p-7 ${cell.span}`}
                style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.01)" }}
              >
                <div className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3" style={{ color: cell.color }}>
                  {cell.tag}
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">{cell.headline}</h3>
                <p className="font-mono text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {cell.desc}
                </p>
                <Viz active={inView} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
