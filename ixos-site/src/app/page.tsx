"use client";

/**
 * Ixos — Main Landing Page
 * Concept: "Telescope → Observatory → Exploration"
 *
 * Phase 1 — Loader: site2-style amber light-sweep (matching SplashLoader.tsx)
 * Phase 2 — Hero: two-column, app at 62% scale floating right, copy left
 * Phase 3 — Zoom: scroll drives app from 62% → 100%, hero copy fades out
 * Phase 4 — Chapters: 4 feature explorations inside the live app
 * Phase 5 — Sections: real landing page (benchmarks, features, privacy, CLI, CTA)
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import {
  AppWorldSurface,
  AmbientIxosField,
  type IxosSearchResult,
  type IxosTodayRow,
  type IxosTodaySignal,
  type IxosView,
  type IxosWorkstreamRow,
} from "@ixos/ixos-ui";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/sections/Footer";
import { PricingProFlow } from "@/components/sections/PricingProFlow";

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// Source: packages/ui/src/tokens/colors.ts + UI_TRUTH_SHEET.md
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg0: "#050507",
  bg1: "#0a0c10",
  bg2: "#12151a",
  bg3: "#1e2024",
  teal: "#14b8a6",
  tealDim: "rgba(20,184,166,0.55)",
  amber: "#f6b94c",
  violet: "#7c5cff",
  porcelain: "#f3f5f7",
  fg1: "rgba(243,245,247,0.9)",
  fg2: "rgba(243,245,247,0.62)",
  fg3: "rgba(243,245,247,0.36)",
  border: "rgba(243,245,247,0.08)",
  borderMed: "rgba(243,245,247,0.14)",
  card: "rgba(18,21,26,0.88)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
// ─────────────────────────────────────────────────────────────────────────────
const RESULTS: IxosSearchResult[] = [
  { id: "r1", title: "Q1-financial-report.md", path: "docs/finance/Q1-financial-report.md", score: 0.97, snippet: "Revenue variance attributed to delayed enterprise renewals and support seat consolidation.", rationale: "Strong lexical match on \"Q1 financial\" + semantic alignment in revenue section. Cache hit, HMAC verified." },
  { id: "r2", title: "meeting_notes_2024-11-15.txt", path: "docs/meetings/meeting_notes_2024-11-15.txt", score: 0.91, snippet: "Action: Reconcile variance figures with CFO by EOD Friday. Evidence context intact.", rationale: "Semantic match on financial review. Date proximity signal contributed." },
  { id: "r3", title: "board_deck_nov.pptx", path: "presentations/board_deck_nov.pptx", score: 0.87, snippet: "Slide 12: Financial performance summary with Q1 variance analysis and Q4 guidance.", rationale: "Hybrid: \"board\" + \"financial\" lexical + executive review semantic." },
  { id: "r4", title: "budget_2025_draft.xlsx", path: "finance/budget_2025_draft.xlsx", score: 0.83, snippet: "Projected ARR growth: 22% enterprise expansion, 8% SMB churn reduction.", rationale: "Semantic embedding similarity on financial forecasting cluster." },
  { id: "r5", title: "revenue_model_v3.csv", path: "finance/revenue_model_v3.csv", score: 0.79, snippet: "LTV:CAC ratio 4.2:1 in Q3. NRR at 118% enterprise, 94% SMB.", rationale: "Financial metrics cluster semantic alignment." },
  { id: "r6", title: "investor_update_q3.md", path: "docs/investor_update_q3.md", score: 0.74, snippet: "Q3 closed strong. Variance from plan: timing shifts in deal close rates.", rationale: "Variance term cluster + investor reporting context." },
  { id: "r7", title: "product_roadmap_v2.md", path: "product/product_roadmap_v2.md", score: 0.68, snippet: "Pricing revision scheduled Q1. Enterprise tier impact analysis attached.", rationale: "Loose semantic: pricing + enterprise in Q1 context." },
];

const PIPELINE = { stage: "locked", filesScanned: 312, candidates: 28, embedded: 12, cacheHits: 7, scanTrail: ["docs/finance/Q1-financial-report.md", "finance/revenue_model_v3.csv", "finance/budget_2025_draft.xlsx", "docs/meetings/meeting_notes_2024-11-15.txt"] };
const PIPELINE_LIVE = { stage: "semantic", filesScanned: 148, candidates: 14, embedded: 6, cacheHits: 3, scanTrail: ["finance/revenue_model_v3.csv", "docs/finance/Q1-financial-report.md"] };

const TODAY_SIGNALS: IxosTodaySignal[] = [
  { label: "Active Streams", value: "3", hint: "Resume from last position" },
  { label: "Files Touched", value: "24", hint: "Open or accessed today" },
  { label: "Queries Run", value: "11", hint: "This session" },
];
const TODAY_RESUME: IxosTodayRow[] = [
  { id: "t1", title: "Q1 Financial Review", meta: "14 min ago", detail: "Stopped at board_deck_nov.pptx — 3 files open." },
  { id: "t2", title: "Product Roadmap Alignment", meta: "1 hr ago", detail: "Thread: \"enterprise tier Q1 changes\"" },
];
const TODAY_RECENT: IxosTodayRow[] = [
  { id: "tr1", title: "IMPLEMENTATION_ROADMAP.md", meta: "docs/", detail: "Opened from search result #3" },
  { id: "tr2", title: "budget_2025_draft.xlsx", meta: "finance/", detail: "Reveal in Finder triggered" },
];
const TODAY_SUGGESTED: IxosTodayRow[] = [
  { id: "ts1", title: "revenue_model_v3.csv", meta: "finance/", detail: "Related to active Q1 thread" },
  { id: "ts2", title: "investor_update_q3.md", meta: "docs/", detail: "Accessed in similar sessions" },
];
const WS_ROWS: IxosWorkstreamRow[] = [
  { id: "ws1", name: "Q1 Financial Review", status: "active", detail: "Revenue variance, CFO reconciliation, board prep.", files: 12, actions: 43, lastActive: "14 min ago" },
  { id: "ws2", name: "Product Roadmap Q1", status: "warm", detail: "Enterprise tier pricing and feature alignment.", files: 8, actions: 19, lastActive: "1 hr ago" },
  { id: "ws3", name: "Investor Update", status: "cold", detail: "Q3 report review and Q4 projections.", files: 5, actions: 7, lastActive: "3 days ago" },
];
const WS_SUMMARY = [
  { label: "Total Streams", value: "3", hint: "1 active, 1 warm" },
  { label: "Files Indexed", value: "25", hint: "Across all streams" },
  { label: "Actions", value: "69", hint: "Opens, reveals, copies" },
  { label: "Recovery Ready", value: "Yes", hint: "Context cache warm" },
];

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER CONFIG
// ─────────────────────────────────────────────────────────────────────────────
interface Chapter {
  id: string;
  tag: string;
  headline: string;
  body: string;
  source: string;
  accent: string;
  view: IxosView;
  region?: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: "search",
    tag: "/ hybrid search",
    headline: "Lexical and semantic. One pass.",
    body: "Keyword scoring fused with embedding similarity. Best signal wins. No tradeoff between recall and precision.",
    source: "src/ixos_rank/hybrid_engine.rs",
    accent: C.teal,
    view: "search",
    region: "results",
  },
  {
    id: "pipeline",
    tag: "/ transparency",
    headline: "Every step, visible.",
    body: "Lexical → Semantic → Refining → Locked. Live progress per stage. Evidence per result. Scan trail in real time.",
    source: "packages/ixos-ui/src/components/SearchSurface.tsx",
    accent: C.amber,
    view: "search",
    region: "pipeline",
  },
  {
    id: "context",
    tag: "/ memory",
    headline: "Your work, remembered.",
    body: "Today dashboard and auto-clustered Workstreams. Resume any session instantly — no re-searching, no reconstruction.",
    source: "ui/src/components/today/ + workstreams/",
    accent: C.teal,
    view: "today",
  },
  {
    id: "privacy",
    tag: "/ offline-first",
    headline: "No cloud. No trace.",
    body: "HMAC-SHA256 signed cache. mlock memory protection. Journalist mode. Zero network calls required.",
    source: "src/storage/validator.rs + journalist_mode.rs",
    accent: C.violet,
    view: "search",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOADER — site2 amber light-sweep style (matches SplashLoader.tsx)
// Source: ui/src/components/layout/SplashLoader.tsx
// ─────────────────────────────────────────────────────────────────────────────
function Loader({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: C.bg0,
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-ixo-mono, monospace)",
      }}
    >
      <div style={{ display: "grid", placeItems: "center", gap: 28 }}>
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: 52, height: 52, borderRadius: 14,
            background: `linear-gradient(135deg, ${C.teal}60 0%, ${C.violet}60 100%)`,
            padding: 1.5,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${C.teal}30`,
          }}
        >
          <div style={{
            width: "100%", height: "100%", borderRadius: 12,
            background: C.bg1,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Image src="/assets/logo-v3.png" alt="Ixos" width={30} height={30} style={{ objectFit: "contain" }} />
          </div>
        </motion.div>

        {/* Amber light-sweep text — identical to SplashLoader.tsx */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{ position: "relative", display: "inline-block" }}
        >
          {/* Dim base */}
          <p style={{
            margin: 0, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(243,245,247,0.18)",
          }}>
            Loading Ixos Protocol...
          </p>
          {/* Amber sweep overlay */}
          <motion.div
            initial={{ maskPosition: "-50% 0" }}
            animate={{ maskPosition: "150% 0" }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "linear", delay: 0.3 }}
            style={{
              position: "absolute", inset: 0,
              display: "flex", justifyContent: "center",
              color: C.amber,
              maskImage: "linear-gradient(90deg, transparent 0%, black 50%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 50%, transparent 100%)",
              maskSize: "50% 100%",
              WebkitMaskSize: "50% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              mixBlendMode: "plus-lighter",
              pointerEvents: "none",
            }}
          >
            <p style={{
              margin: 0, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>
              Loading Ixos Protocol...
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER CARD — glass card with feature copy, shown during scroll chapters
// ─────────────────────────────────────────────────────────────────────────────
function ChapterCard({ chapter, prefersReducedMotion }: { chapter: Chapter; prefersReducedMotion: boolean | null }) {
  return (
    <motion.div
      key={chapter.id}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -28, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -20, scale: 0.97 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        left: 24,
        top: "50%",
        transform: "translateY(-50%)",
        width: 270,
        zIndex: 40,
        background: "rgba(10,12,16,0.86)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${C.borderMed}`,
        borderLeft: `2px solid ${chapter.accent}`,
        borderRadius: 14,
        padding: "20px 18px",
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(243,245,247,0.03) inset`,
        fontFamily: "var(--font-ixo-mono, monospace)",
      }}
    >
      <p style={{ margin: "0 0 10px", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: chapter.accent }}>
        {chapter.tag}
      </p>
      <h3 style={{
        margin: "0 0 12px",
        fontSize: 20, fontWeight: 700, lineHeight: 1.18,
        letterSpacing: "-0.025em",
        color: C.porcelain,
        fontFamily: "var(--font-ixo-heading, sans-serif)",
      }}>
        {chapter.headline}
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: C.fg2, lineHeight: 1.65 }}>
        {chapter.body}
      </p>
      <p style={{ margin: 0, fontSize: 9, color: C.fg3, letterSpacing: "0.06em" }}>
        {chapter.source}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CINEMATIC SECTION — 800vh sticky scroll experience
// ─────────────────────────────────────────────────────────────────────────────
function CinematicSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const prefersReducedMotion = useReducedMotion();

  const [chapterIndex, setChapterIndex] = useState(-1);
  const [appView, setAppView] = useState<IxosView>("search");
  const [selectedResult, setSelectedResult] = useState(0);
  const [selectedWS, setSelectedWS] = useState("ws1");
  const [demoQuery, setDemoQuery] = useState("Q1 revenue variance");
  const [demoMode, setDemoMode] = useState<"flash" | "auto" | "pro">("auto");

  // Scroll-driven transforms
  // Hero copy: visible 0→0.12, fades 0.12→0.28
  const heroOpacity = useTransform(scrollYProgress, [0.10, 0.27], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0.12, 0.30], [0, -72]);

  // App: scales from 62% → 105% → 100% (overshoot + settle = lock-in feel)
  const appScaleRaw = useTransform(scrollYProgress, [0.10, 0.28, 0.32], [0.62, 1.05, 1.0]);
  const appScale = useSpring(appScaleRaw, { stiffness: 120, damping: 28 });

  const appRotateX = useTransform(scrollYProgress, [0.10, 0.30], [-10, 0]);
  const appRotateY = useTransform(scrollYProgress, [0.10, 0.30], [4, 0]);

  // App shifts right to expose left column for chapter card
  const appXRaw = useTransform(scrollYProgress, [0.28, 0.36], ["0%", "7%"]);
  const appX = useSpring(appXRaw, { stiffness: 100, damping: 22 });

  // Entry flash at zoom completion — teal portal burst
  const entryFlash = useTransform(scrollYProgress, [0.27, 0.29, 0.32], [0, 0.28, 0]);

  // Chapter card visibility
  const chapterCardOpacity = useTransform(scrollYProgress, [0.32, 0.38], [0, 1]);

  // Exit from cinematic
  const sectionOpacity = useTransform(scrollYProgress, [0.92, 1.0], [1, 0]);

  // Chapter detection
  const prevChapterRef = useRef(-1);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    let newIndex = -1;
    if (v >= 0.32 && v < 0.50) newIndex = 0;
    else if (v >= 0.50 && v < 0.65) newIndex = 1;
    else if (v >= 0.65 && v < 0.78) newIndex = 2;
    else if (v >= 0.78 && v < 0.92) newIndex = 3;

    if (newIndex !== prevChapterRef.current) {
      prevChapterRef.current = newIndex;
      setChapterIndex(newIndex);
      if (newIndex >= 0) {
        setAppView(CHAPTERS[newIndex].view);
      }
    }
  });

  const isSearching = chapterIndex === 1;
  const pipelineStats = chapterIndex === 1 ? PIPELINE_LIVE : PIPELINE;
  const stageLabel = chapterIndex === 1 ? "Live · Streaming" : "Locked · 7 results";

  return (
    <div ref={containerRef} style={{ height: "800vh", position: "relative" }}>
      <motion.div
        style={{
          position: "sticky", top: 0, height: "100vh",
          overflow: "hidden",
          opacity: sectionOpacity,
        }}
      >
        {/* Ambient pixel field — ONE instance, persists as background */}
        <AmbientIxosField
          mode="fixed"
          energy={isSearching && !prefersReducedMotion ? "dynamic" : "calm"}
        />

        {/* ── HERO TEXT (fades as app zooms in) ── */}
        <motion.div
          style={{
            position: "absolute",
            top: 0, left: 0,
            width: "46%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 0 0 clamp(28px, 5vw, 80px)",
            zIndex: 30,
            opacity: heroOpacity,
            y: heroY,
            pointerEvents: "none",
          }}
        >
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{
              margin: "0 0 14px",
              fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
              color: C.teal,
              fontFamily: "var(--font-ixo-mono, monospace)",
            }}
          >
            Local-first semantic search
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: "0 0 20px",
              fontSize: "clamp(44px, 5.5vw, 78px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              color: C.porcelain,
              fontFamily: "var(--font-ixo-heading, sans-serif)",
            }}
          >
            Find it.<br />
            <span style={{ color: C.teal }}>No cloud.</span><br />
            No index.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.45 }}
            style={{
              margin: "0 0 32px",
              fontSize: 14, color: C.fg2, lineHeight: 1.72,
              maxWidth: 390,
              fontFamily: "var(--font-ixo-mono, monospace)",
            }}
          >
            Semantic + lexical hybrid search. Runs entirely on your machine.
            First result in under 800ms on 1,000 files.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.4 }}
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <Link href="/download" style={{
              textDecoration: "none", display: "inline-flex",
              alignItems: "center", gap: 8,
              background: C.teal, color: C.bg0,
              fontSize: 12, fontWeight: 700,
              padding: "11px 24px", borderRadius: 10,
              letterSpacing: "-0.01em",
              fontFamily: "var(--font-ixo-mono, monospace)",
            }}>
              Download for Mac
            </Link>
            <Link href="/docs" style={{
              textDecoration: "none", display: "inline-flex",
              alignItems: "center", gap: 6,
              color: C.teal,
              border: `1px solid rgba(20,184,166,0.35)`,
              fontSize: 12, padding: "11px 20px", borderRadius: 10,
              fontFamily: "var(--font-ixo-mono, monospace)",
            }}>
              CLI reference →
            </Link>
          </motion.div>
        </motion.div>

        {/* ── APP WINDOW (scroll-driven zoom) ── */}
        <motion.div
          style={{
            position: "absolute",
            top: 0, right: 0,
            width: "62%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "72px 24px 24px",
            x: appX,
            zIndex: 20,
            perspective: "1800px",
          }}
        >
          <motion.div
            style={{
              width: "100%",
              maxWidth: 900,
              transformStyle: "preserve-3d",
              scale: appScale,
              rotateX: prefersReducedMotion ? 0 : appRotateX,
              rotateY: prefersReducedMotion ? 0 : appRotateY,
              position: "relative",
            }}
          >
            {/* The ONE AppWorldSurface — never unmounted, synced to desktop UI */}
            {/* source: packages/ixos-ui/src/components/AppWorldSurface.tsx */}
            <AppWorldSurface
              view={appView}
              onViewChange={setAppView}
              title="Ixos Desktop"
              subtitle="Local-first search cockpit"
              interactive
              search={{
                query: demoQuery,
                directoryLabel: "~/Documents",
                mode: demoMode,
                onModeChange: setDemoMode,
                stageLabel,
                isSearching,
                results: RESULTS,
                selectedIndex: selectedResult,
                onSelectResult: setSelectedResult,
                allowResultsScroll: true,
                showInlineRunButton: chapterIndex <= 0,
                hideSearchChrome: false,
                resultLimit: 7,
                pipelineStats,
                onQueryChange: setDemoQuery,
                presets: ["Q1 revenue variance", "product roadmap enterprise", "CFO reconciliation", "board deck November"],
                sourcePath: "src-tauri/src/commands/search.rs",
              }}
              today={{
                dateLabel: "Friday, Nov 29",
                signals: TODAY_SIGNALS,
                resumeRows: TODAY_RESUME,
                recentRows: TODAY_RECENT,
                suggestedRows: TODAY_SUGGESTED,
                sourcePath: "ui/src/components/today/",
              }}
              workstreams={{
                rows: WS_ROWS,
                selectedId: selectedWS,
                onSelectRow: setSelectedWS,
                summary: WS_SUMMARY,
                sourcePath: "ui/src/components/workstreams/",
              }}
            />

            {/* Portal entry flash */}
            {!prefersReducedMotion && (
              <motion.div
                style={{
                  position: "absolute", inset: 0, borderRadius: 18,
                  pointerEvents: "none", zIndex: 50,
                  background: `radial-gradient(ellipse at 50% 40%, ${C.teal}60 0%, transparent 65%)`,
                  opacity: entryFlash,
                }}
              />
            )}
          </motion.div>
        </motion.div>

        {/* ── CHAPTER CARDS (float left when chapters active) ── */}
        <motion.div style={{ opacity: chapterCardOpacity }}>
          <AnimatePresence mode="wait">
            {chapterIndex >= 0 && chapterIndex < CHAPTERS.length && (
              <ChapterCard
                key={chapterIndex}
                chapter={CHAPTERS[chapterIndex]}
                prefersReducedMotion={prefersReducedMotion}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── CHAPTER DOT NAV ── */}
        <motion.div style={{
          opacity: chapterCardOpacity,
          position: "absolute", left: 24, bottom: 32,
          display: "flex", gap: 7, zIndex: 50,
        }}>
          {CHAPTERS.map((ch, i) => (
            <div
              key={ch.id}
              style={{
                width: i === chapterIndex ? 20 : 5,
                height: 5, borderRadius: 999,
                background: i === chapterIndex ? ch.accent : "rgba(243,245,247,0.2)",
                transition: "all 280ms cubic-bezier(0.22, 1, 0.36, 1)",
                boxShadow: i === chapterIndex ? `0 0 6px ${ch.accent}80` : "none",
              }}
            />
          ))}
        </motion.div>

        {/* ── SCROLL INDICATOR ── */}
        <motion.div style={{
          opacity: heroOpacity,
          position: "absolute", bottom: 28, right: 32,
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
          color: C.fg3,
          fontFamily: "var(--font-ixo-mono, monospace)",
        }}>
          <motion.span
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >↓</motion.span>
          Scroll to explore
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: BENCHMARKS
// Source: CLAUDE.md performance benchmarks
// ─────────────────────────────────────────────────────────────────────────────
function BenchmarksSection() {
  const ref = useRef<HTMLElement>(null);

  const stats = [
    { value: "7ms", label: "File loading", detail: "1,000 files, parallel rayon", source: "CLAUDE.md" },
    { value: "<800ms", label: "Total search", detail: "Stub model, first result", source: "CLAUDE.md" },
    { value: "225B", label: "Cache per file", detail: "Compact embedding format", source: "src/storage/validator.rs" },
    { value: "250+", label: "Tests passing", detail: "All green, 3 ignored", source: "CLAUDE.md" },
  ];

  return (
    <section
      ref={ref}
      style={{
        background: C.bg0,
        borderTop: `1px solid ${C.border}`,
        padding: "100px clamp(28px, 7vw, 120px)",
      }}
    >
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        style={{
          margin: "0 0 56px",
          fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
          color: C.teal,
          fontFamily: "var(--font-ixo-mono, monospace)",
        }}
      >
        / performance
      </motion.p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 1,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        overflow: "hidden",
      }}>
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              padding: "44px 36px",
              background: C.bg1,
              borderRight: i < stats.length - 1 ? `1px solid ${C.border}` : undefined,
            }}
          >
            <p style={{
              margin: "0 0 10px",
              fontSize: "clamp(40px, 4vw, 60px)",
              fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1,
              color: C.porcelain,
              fontFamily: "var(--font-ixo-heading, sans-serif)",
            }}>
              {s.value}
            </p>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: C.fg1, fontFamily: "var(--font-ixo-mono, monospace)" }}>
              {s.label}
            </p>
            <p style={{ margin: "0 0 10px", fontSize: 11, color: C.fg3, fontFamily: "var(--font-ixo-mono, monospace)" }}>
              {s.detail}
            </p>
            <p style={{ margin: 0, fontSize: 9, color: C.fg3, letterSpacing: "0.06em", fontFamily: "var(--font-ixo-mono, monospace)" }}>
              {s.source}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Type your query",
      body: "Natural language or keyword. Ixos runs both engines simultaneously — no choosing.",
      detail: "flash / auto / pro speed tiers",
    },
    {
      num: "02",
      title: "Pipeline runs locally",
      body: "Lexical → Semantic → Refining → Locked. Progress visible at every stage. Zero network calls.",
      detail: "src/ixos_rank/hybrid_engine.rs",
    },
    {
      num: "03",
      title: "Results stream in",
      body: "Progressive streaming. First result in milliseconds. Evidence per match. Open, reveal, or copy instantly.",
      detail: "--progressive flag, src/cli/commands.rs",
    },
  ];

  return (
    <section style={{
      background: C.bg1,
      padding: "100px clamp(28px, 7vw, 120px)",
      borderTop: `1px solid ${C.border}`,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{ marginBottom: 64 }}
      >
        <p style={{ margin: "0 0 14px", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.amber, fontFamily: "var(--font-ixo-mono, monospace)" }}>
          / how it works
        </p>
        <h2 style={{
          margin: 0,
          fontSize: "clamp(28px, 3.5vw, 48px)",
          fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1,
          color: C.porcelain,
          fontFamily: "var(--font-ixo-heading, sans-serif)",
        }}>
          Three steps.<br />No magic.
        </h2>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 2 }}>
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              padding: "36px 32px",
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Step number — large, background */}
            <p style={{
              position: "absolute", top: 16, right: 20,
              margin: 0, fontSize: 80, fontWeight: 900,
              lineHeight: 1, letterSpacing: "-0.05em",
              color: "rgba(243,245,247,0.04)",
              fontFamily: "var(--font-ixo-heading, sans-serif)",
              userSelect: "none",
            }}>
              {step.num}
            </p>

            <p style={{ margin: "0 0 16px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.teal, fontFamily: "var(--font-ixo-mono, monospace)" }}>
              {step.num}
            </p>
            <h3 style={{
              margin: "0 0 14px",
              fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em",
              color: C.porcelain,
              fontFamily: "var(--font-ixo-heading, sans-serif)",
            }}>
              {step.title}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: C.fg2, lineHeight: 1.7, fontFamily: "var(--font-ixo-mono, monospace)" }}>
              {step.body}
            </p>
            <p style={{ margin: 0, fontSize: 9, color: C.fg3, letterSpacing: "0.06em", fontFamily: "var(--font-ixo-mono, monospace)" }}>
              {step.detail}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: PRIVACY — big editorial block
// Source: src/storage/validator.rs, journalist_mode.rs, memory_protection.rs
// ─────────────────────────────────────────────────────────────────────────────
function PrivacySection() {
  const modes = [
    { name: "Standard", desc: "Local NTFS ADS / xattr cache. No uploads.", accent: C.teal },
    { name: "Ephemeral", desc: "Memory-only. No disk writes. Exits clean.", accent: C.amber },
    { name: "Journalist", desc: "No cache. No history. No trace. Maximum privacy.", accent: C.violet },
  ];

  return (
    <section style={{
      background: C.bg0,
      padding: "100px clamp(28px, 7vw, 120px)",
      borderTop: `1px solid ${C.border}`,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background accent */}
      <div style={{
        position: "absolute", top: "20%", right: "-10%",
        width: "50vw", height: "50vw",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${C.violet}06 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 920, position: "relative" }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ margin: "0 0 20px", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.violet, fontFamily: "var(--font-ixo-mono, monospace)" }}
        >
          / privacy by design
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            margin: "0 0 24px",
            fontSize: "clamp(38px, 5.5vw, 76px)",
            fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.01,
            fontFamily: "var(--font-ixo-heading, sans-serif)",
          }}
        >
          <span style={{ color: C.porcelain }}>Zero</span>{" "}
          <span style={{
            color: "transparent",
            WebkitTextStroke: `1px ${C.violet}`,
          }}>
            network
          </span>
          <br />
          <span style={{ color: C.porcelain }}>calls.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12, duration: 0.45 }}
          style={{
            margin: "0 0 48px",
            fontSize: 15, color: C.fg2, lineHeight: 1.75, maxWidth: 580,
            fontFamily: "var(--font-ixo-mono, monospace)",
          }}
        >
          Embeddings live in NTFS ADS (Windows) or xattr (macOS/Linux).
          Signed with HMAC-SHA256. Verified on every read. Never uploaded.
          Never indexed remotely.
        </motion.p>

        {/* Privacy mode cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 40 }}>
          {modes.map((mode, i) => (
            <motion.div
              key={mode.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
              style={{
                padding: "20px 18px",
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderTop: `2px solid ${mode.accent}`,
                borderRadius: 12,
              }}
            >
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: mode.accent, fontFamily: "var(--font-ixo-mono, monospace)" }}>
                {mode.name}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: C.fg2, lineHeight: 1.6, fontFamily: "var(--font-ixo-mono, monospace)" }}>
                {mode.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Technical details row */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
        >
          {[
            "HMAC-SHA256 cache signing",
            "mlock + zeroize-on-drop",
            "Path sandbox",
            "No telemetry",
            "Ed25519 attestation",
            "EU AI Act / GDPR compliant",
          ].map((tag) => (
            <span key={tag} style={{
              fontSize: 10, padding: "5px 12px",
              border: `1px solid ${C.borderMed}`,
              borderRadius: 999, color: C.fg2,
              letterSpacing: "0.06em",
              fontFamily: "var(--font-ixo-mono, monospace)",
            }}>
              {tag}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: FEATURES GRID
// ─────────────────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      tag: "Search",
      icon: "⌕",
      title: "Hybrid\nSearch",
      body: "Lexical candidate scoring fused with semantic embedding similarity. Best of both engines in one pass.",
      source: "src/ixos_rank/hybrid_engine.rs",
      accent: C.teal,
    },
    {
      tag: "Context",
      icon: "◎",
      title: "Session\nMemory",
      body: "Today dashboard and Workstreams. Auto-clustered task threads from your actual activity. Resume instantly.",
      source: "ui/src/components/today/ + workstreams/",
      accent: C.amber,
    },
    {
      tag: "Pipeline",
      icon: "▸",
      title: "Transparent\nPipeline",
      body: "Four stages. Per-result rationale. Live scan trail. You see exactly what Ixos touches and why.",
      source: "packages/ixos-ui/src/components/SearchSurface.tsx",
      accent: C.teal,
    },
    {
      tag: "Privacy",
      icon: "◈",
      title: "Offline\nFirst",
      body: "Works completely offline. NTFS ADS or xattr storage. HMAC-signed. Journalist mode. Zero cloud dependency.",
      source: "src/storage/ + journalist_mode.rs",
      accent: C.violet,
    },
    {
      tag: "CLI",
      icon: "$",
      title: "Full\nCLI",
      body: "--progressive, --json, --show-scores, --journalist-mode, --cache-mode, --context. Scriptable, pipeable.",
      source: "src/cli/commands.rs + output.rs",
      accent: C.teal,
    },
    {
      tag: "File Watch",
      icon: "◉",
      title: "Live\nWatch",
      body: "Rate-limited file watching (100 events/sec). Dedup, symlink protection, DoS resilience built in.",
      source: "src/ixos_watcher/resilience.rs",
      accent: C.amber,
    },
  ];

  return (
    <section style={{
      background: C.bg1,
      padding: "100px clamp(28px, 7vw, 120px)",
      borderTop: `1px solid ${C.border}`,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{ marginBottom: 60 }}
      >
        <p style={{ margin: "0 0 14px", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.teal, fontFamily: "var(--font-ixo-mono, monospace)" }}>
          / feature set
        </p>
        <h2 style={{
          margin: 0,
          fontSize: "clamp(28px, 3.5vw, 48px)",
          fontWeight: 800, letterSpacing: "-0.03em",
          color: C.porcelain,
          fontFamily: "var(--font-ixo-heading, sans-serif)",
        }}>
          Everything you need.<br />Nothing you don't.
        </h2>
      </motion.div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
      }}>
        {features.map((f, i) => (
          <motion.div
            key={f.tag}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, borderColor: `${f.accent}40` }}
            style={{
              padding: "28px 24px",
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              transition: "border-color 200ms ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: f.accent, fontFamily: "var(--font-ixo-mono, monospace)" }}>
                {f.tag}
              </span>
              <span style={{ fontSize: 22, color: `${f.accent}80` }}>{f.icon}</span>
            </div>
            <h3 style={{
              margin: "0 0 14px",
              fontSize: 22, fontWeight: 700,
              letterSpacing: "-0.025em", lineHeight: 1.12,
              whiteSpace: "pre-line",
              color: C.porcelain,
              fontFamily: "var(--font-ixo-heading, sans-serif)",
            }}>
              {f.title}
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: C.fg2, lineHeight: 1.7, fontFamily: "var(--font-ixo-mono, monospace)" }}>
              {f.body}
            </p>
            <p style={{ margin: 0, fontSize: 9, color: C.fg3, letterSpacing: "0.05em", fontFamily: "var(--font-ixo-mono, monospace)" }}>
              {f.source}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: CLI SHOWCASE
// ─────────────────────────────────────────────────────────────────────────────
function CLISection() {
  const lines = [
    { t: 0, text: "$ ixos search \"Q1 revenue variance\" --dir ~/Documents --show-scores", color: C.fg1 },
    { t: 200, text: "  Streaming lexical candidates...", color: C.fg3 },
    { t: 400, text: "  ✓ Q1-financial-report.md          [97%] lexical+semantic", color: C.teal },
    { t: 520, text: "  ✓ meeting_notes_2024-11-15.txt    [91%] semantic", color: C.teal },
    { t: 640, text: "  ✓ board_deck_nov.pptx             [87%] hybrid", color: C.teal },
    { t: 760, text: "  ✓ budget_2025_draft.xlsx          [83%] semantic", color: C.teal },
    { t: 880, text: "  ─────────────────────────────────────────────────", color: C.border },
    { t: 960, text: "  7ms scan · 28 candidates · 12 embedded · 7 cache hits", color: C.amber },
  ];

  const [visibleLines, setVisibleLines] = useState(0);

  return (
    <section style={{
      background: C.bg0,
      padding: "100px clamp(28px, 7vw, 120px)",
      borderTop: `1px solid ${C.border}`,
    }}>
      <div style={{ maxWidth: 900, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ margin: "0 0 14px", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.teal, fontFamily: "var(--font-ixo-mono, monospace)" }}
          >
            / command line
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: "0 0 20px",
              fontSize: "clamp(28px, 3.5vw, 44px)",
              fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1,
              color: C.porcelain,
              fontFamily: "var(--font-ixo-heading, sans-serif)",
            }}
          >
            Scriptable.<br />Pipeable.<br />Yours.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.14, duration: 0.4 }}
            style={{ margin: "0 0 28px", fontSize: 13, color: C.fg2, lineHeight: 1.75, fontFamily: "var(--font-ixo-mono, monospace)" }}
          >
            Full-featured CLI with JSON output, progressive streaming,
            journalist mode, score breakdown, and context snippets.
            Automate anything.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <Link href="/docs/cli-reference" style={{
              textDecoration: "none", fontSize: 12, color: C.teal,
              border: `1px solid rgba(20,184,166,0.38)`,
              padding: "10px 20px", borderRadius: 10,
              fontFamily: "var(--font-ixo-mono, monospace)",
              display: "inline-block",
            }}>
              CLI reference →
            </Link>
          </motion.div>
        </div>

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          onViewportEnter={() => {
            lines.forEach((l, i) => {
              window.setTimeout(() => setVisibleLines((n) => Math.max(n, i + 1)), l.t + 200);
            });
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "#040507",
            border: `1px solid ${C.borderMed}`,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Window chrome */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "12px 14px",
            borderBottom: `1px solid ${C.border}`,
            background: C.bg2,
          }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
            ))}
            <span style={{ marginLeft: 8, fontSize: 10, color: C.fg3, letterSpacing: "0.1em", fontFamily: "var(--font-ixo-mono, monospace)" }}>
              terminal — ixos
            </span>
          </div>
          {/* Terminal content */}
          <div style={{ padding: "20px 18px", minHeight: 220 }}>
            {lines.slice(0, visibleLines).map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  margin: "0 0 6px", fontSize: 11.5,
                  color: line.color, lineHeight: 1.5,
                  fontFamily: "var(--font-ixo-mono, monospace)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {line.text}
              </motion.p>
            ))}
            {visibleLines > 0 && visibleLines < lines.length && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ display: "inline-block", width: 8, height: 14, background: C.teal, borderRadius: 1 }}
              />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: DOWNLOAD CTA
// ─────────────────────────────────────────────────────────────────────────────
function DownloadSection() {
  return (
    <section style={{
      background: C.bg1,
      padding: "120px clamp(28px, 7vw, 120px)",
      borderTop: `1px solid ${C.border}`,
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "60vw", height: "40vh",
        background: `radial-gradient(ellipse, ${C.teal}10 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "relative" }}
      >
        <p style={{ margin: "0 0 16px", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.teal, fontFamily: "var(--font-ixo-mono, monospace)" }}>
          / get started
        </p>
        <h2 style={{
          margin: "0 0 20px",
          fontSize: "clamp(36px, 5vw, 64px)",
          fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.04,
          color: C.porcelain,
          fontFamily: "var(--font-ixo-heading, sans-serif)",
        }}>
          Your files are waiting.
        </h2>
        <p style={{
          margin: "0 0 44px",
          fontSize: 15, color: C.fg2, lineHeight: 1.7,
          maxWidth: 480, marginLeft: "auto", marginRight: "auto",
          fontFamily: "var(--font-ixo-mono, monospace)",
        }}>
          Local-first. Offline-capable. Privacy by default.
          Download and run your first search in under a minute.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/download" style={{
            textDecoration: "none",
            background: C.teal, color: C.bg0,
            fontSize: 14, fontWeight: 700,
            padding: "14px 32px", borderRadius: 12,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-ixo-mono, monospace)",
            boxShadow: `0 0 40px ${C.teal}30`,
          }}>
            Download for Mac →
          </Link>
          <Link href="/pricing" style={{
            textDecoration: "none", color: C.fg2,
            border: `1px solid ${C.borderMed}`,
            fontSize: 14, padding: "14px 28px", borderRadius: 12,
            fontFamily: "var(--font-ixo-mono, monospace)",
          }}>
            View pricing
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const handleLoaderDone = useCallback(() => setLoaded(true), []);

  return (
    <div style={{ background: C.bg0, color: C.porcelain, minHeight: "100vh" }}>
      {/* Loader */}
      <AnimatePresence>{!loaded && <Loader onDone={handleLoaderDone} />}</AnimatePresence>

      {/* Nav — existing component, preserved */}
      <Nav />

      {/* ── CINEMATIC SCROLL SECTION ── */}
      <CinematicSection />

      {/* ── LANDING SECTIONS ── */}
      <BenchmarksSection />
      <HowItWorksSection />
      <PrivacySection />
      <FeaturesSection />
      <CLISection />
      <DownloadSection />

      {/* ── PRICING — existing component, preserved ── */}
      <div style={{ borderTop: `1px solid ${C.border}` }}>
        <Suspense fallback={null}>
          <PricingProFlow />
        </Suspense>
      </div>

      {/* ── FOOTER — existing component, preserved ── */}
      <Footer />
    </div>
  );
}
