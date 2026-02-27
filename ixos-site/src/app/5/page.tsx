"use client";

/**
 * Ixos Landing /5 — Director's Cut
 *
 * Split-screen stage: left editorial narrative, right live AppWorld viewport.
 * Stage panels slide in from depth (translateZ). AppWorld pans on scroll.
 * Hovering a bullet highlights the exact UI region on the right.
 *
 * Shared components imported from @ixos/ixos-ui (no copies).
 * Sync proof: change any token in packages/ixos-ui → landing updates instantly.
 *
 * FEATURE_MASTERLIST.md · UI_TRUTH_SHEET.md · COPY_DECK.md — see ixos-site/
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'framer-motion';
import {
  AmbientIxosField,
  AppWorldSurface,
  PixelRingLoader,
  type IxosSearchResult,
  type IxosTodayRow,
  type IxosTodaySignal,
  type IxosView,
  type IxosWorkstreamRow,
} from '@ixos/ixos-ui';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Source: packages/ui/src/tokens/colors.ts + UI_TRUTH_SHEET.md
const T = {
  teal: '#14b8a6',
  tealDim: 'rgba(20,184,166,0.55)',
  amber: '#f6b94c',
  amberDim: 'rgba(246,185,76,0.55)',
  violet: '#7c5cff',
  violetDim: 'rgba(124,92,255,0.55)',
  porcelain: '#f3f5f7',
  fg1: 'rgba(243,245,247,0.88)',
  fg2: 'rgba(243,245,247,0.65)',
  fg3: 'rgba(243,245,247,0.38)',
  bg0: '#050507',
  bg1: '#0a0c10',
  bg2: '#12151a',
  border: 'rgba(243,245,247,0.08)',
  borderMed: 'rgba(243,245,247,0.14)',
} as const;

// ─── DATA ─────────────────────────────────────────────────────────────────────
// Source: CLAUDE.md performance benchmarks, src-tauri sample data

const SEARCH_RESULTS: IxosSearchResult[] = [
  {
    id: 'r1',
    title: 'Q1-financial-report.md',
    path: 'docs/finance/Q1-financial-report.md',
    score: 0.97,
    snippet:
      'Revenue variance attributed to delayed enterprise renewals and support seat consolidation.',
    rationale:
      'Strong lexical match on "Q1 financial" + semantic alignment in revenue variance section. Cache hit, HMAC verified.',
  },
  {
    id: 'r2',
    title: 'meeting_notes_2024-11-15.txt',
    path: 'docs/meetings/meeting_notes_2024-11-15.txt',
    score: 0.91,
    snippet:
      'Action item: Reconcile variance figures with CFO by EOD Friday. Evidence context intact.',
    rationale:
      'Semantic match on financial review context. Date proximity signal contributed.',
  },
  {
    id: 'r3',
    title: 'board_deck_nov.pptx',
    path: 'presentations/board_deck_nov.pptx',
    score: 0.87,
    snippet:
      'Slide 12: Financial performance summary with Q1 variance analysis and Q4 guidance.',
    rationale:
      'Hybrid: "board" + "financial" lexical + semantic alignment on executive review.',
  },
  {
    id: 'r4',
    title: 'budget_2025_draft.xlsx',
    path: 'finance/budget_2025_draft.xlsx',
    score: 0.83,
    snippet:
      'Projected ARR growth assumes 22% enterprise expansion and 8% SMB churn reduction.',
    rationale: 'Semantic embedding similarity on financial forecasting cluster.',
  },
  {
    id: 'r5',
    title: 'revenue_model_v3.csv',
    path: 'finance/revenue_model_v3.csv',
    score: 0.79,
    snippet: 'Cohort LTV:CAC ratio 4.2:1 in Q3. NRR at 118% enterprise, 94% SMB.',
    rationale: 'Semantic alignment on financial metrics cluster. File timestamp near active dates.',
  },
  {
    id: 'r6',
    title: 'investor_update_q3.md',
    path: 'docs/investor_update_q3.md',
    score: 0.74,
    snippet:
      'Q3 closed strong. Variance from plan driven by timing shifts in deal close rates.',
    rationale: '"Variance" term cluster + investor reporting semantic context.',
  },
  {
    id: 'r7',
    title: 'product_roadmap_v2.md',
    path: 'product/product_roadmap_v2.md',
    score: 0.68,
    snippet:
      'Pricing model revision scheduled for Q1. Enterprise tier impact analysis attached.',
    rationale: 'Loose semantic connection: pricing and enterprise terms in Q1 context.',
  },
];

const PIPELINE_STATS = {
  stage: 'locked',
  filesScanned: 312,
  candidates: 28,
  embedded: 12,
  cacheHits: 7,
  scanTrail: [
    'docs/finance/Q1-financial-report.md',
    'finance/revenue_model_v3.csv',
    'finance/budget_2025_draft.xlsx',
    'docs/meetings/meeting_notes_2024-11-15.txt',
  ],
};

const TODAY_SIGNALS: IxosTodaySignal[] = [
  { label: 'Active Streams', value: '3', hint: 'Resume from last position' },
  { label: 'Files Touched', value: '24', hint: 'Open or search-accessed today' },
  { label: 'Queries Run', value: '11', hint: 'Searches this session' },
];

const TODAY_RESUME: IxosTodayRow[] = [
  {
    id: 't1',
    title: 'Q1 Financial Review',
    meta: '14 min ago',
    detail: 'Stopped at board_deck_nov.pptx — 3 evidence files open.',
  },
  {
    id: 't2',
    title: 'Product Roadmap Alignment',
    meta: '1 hr ago',
    detail: 'Search thread: "enterprise tier Q1 changes"',
  },
];

const TODAY_RECENT: IxosTodayRow[] = [
  { id: 'tr1', title: 'IMPLEMENTATION_ROADMAP.md', meta: 'docs/', detail: 'Opened from search result #3' },
  { id: 'tr2', title: 'budget_2025_draft.xlsx', meta: 'finance/', detail: 'Reveal in Finder triggered' },
];

const TODAY_SUGGESTED: IxosTodayRow[] = [
  { id: 'ts1', title: 'revenue_model_v3.csv', meta: 'finance/', detail: 'Related to active Q1 thread' },
  {
    id: 'ts2',
    title: 'investor_update_q3.md',
    meta: 'docs/',
    detail: 'Frequently accessed in similar sessions',
  },
];

const WORKSTREAM_ROWS: IxosWorkstreamRow[] = [
  {
    id: 'ws1',
    name: 'Q1 Financial Review',
    status: 'active',
    detail: 'Revenue variance, CFO reconciliation, board prep.',
    files: 12,
    actions: 43,
    lastActive: '14 min ago',
  },
  {
    id: 'ws2',
    name: 'Product Roadmap Q1',
    status: 'warm',
    detail: 'Enterprise tier pricing and feature alignment.',
    files: 8,
    actions: 19,
    lastActive: '1 hr ago',
  },
  {
    id: 'ws3',
    name: 'Investor Update',
    status: 'cold',
    detail: 'Q3 investor report review and Q4 projections.',
    files: 5,
    actions: 7,
    lastActive: '3 days ago',
  },
];

const WORKSTREAM_SUMMARY = [
  { label: 'Total Streams', value: '3', hint: '1 active, 1 warm' },
  { label: 'Files Indexed', value: '25', hint: 'Across all streams' },
  { label: 'Actions', value: '69', hint: 'Opens, reveals, copies' },
  { label: 'Recovery Ready', value: 'Yes', hint: 'Context cache warm' },
];

// ─── CHAPTERS ─────────────────────────────────────────────────────────────────
// Source: COPY_DECK.md + FEATURE_MASTERLIST.md

type Tone = 'teal' | 'amber' | 'violet';

interface Bullet {
  id: string;
  text: string;
  source: string;
  region: string;
  tone: Tone;
  view?: IxosView;
}

interface Chapter {
  id: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  view: IxosView;
  ctas?: { label: string; href: string; primary?: boolean }[];
  bullets: Bullet[];
}

const CHAPTERS: Chapter[] = [
  {
    id: 'find',
    eyebrow: '/ search',
    headline: 'Find it.\nNo cloud.\nNo index.',
    subhead:
      'Semantic + lexical hybrid search, running entirely on your machine. First result in under 800ms on 1,000 files.',
    view: 'search',
    ctas: [
      { label: 'Download for Mac', href: '/download', primary: true },
      { label: 'CLI reference →', href: '/docs' },
    ],
    bullets: [
      {
        id: 'hybrid',
        text: 'Hybrid search: lexical candidate scoring fused with semantic embedding similarity in one pass.',
        source: 'src/ixos_rank/hybrid_engine.rs',
        region: 'results-list',
        tone: 'teal',
      },
      {
        id: 'tiers',
        text: 'Three speed tiers — Flash, Auto, Pro — trade search depth for latency.',
        source: 'ui/src/components/search/QualitySwitcher.tsx',
        region: 'mode-chips',
        tone: 'teal',
      },
      {
        id: 'stream',
        text: 'Progressive streaming: results surface as the pipeline processes, not after it finishes.',
        source: 'src/cli/commands.rs (--progressive)',
        region: 'results-list',
        tone: 'teal',
      },
    ],
  },
  {
    id: 'see',
    eyebrow: '/ pipeline',
    headline: 'Every step,\nvisible.',
    subhead:
      "Ixos doesn't hide its work. Watch the pipeline scan, embed, and rank — stage by stage, in real time.",
    view: 'search',
    bullets: [
      {
        id: 'stages',
        text: 'Four pipeline stages: lexical → semantic → refining → locked. Per-stage progress bar.',
        source: 'packages/ixos-ui/src/components/SearchSurface.tsx',
        region: 'pipeline-bar',
        tone: 'teal',
      },
      {
        id: 'evidence',
        text: 'Evidence panel: per-result rationale explaining which signal dominated the match.',
        source: 'ui/src/components/search/WhyMatched.tsx + ExplainPanel.tsx',
        region: 'evidence-panel',
        tone: 'amber',
      },
      {
        id: 'trail',
        text: 'Live scan trail: every file path touched, in sequence, as search happens.',
        source: 'src/ixos_rank/hybrid_engine.rs + ixos_watcher/resilience.rs',
        region: 'scan-trail',
        tone: 'teal',
      },
    ],
  },
  {
    id: 'know',
    eyebrow: '/ context',
    headline: 'Your work,\nremembered.',
    subhead:
      'Today and Workstreams keep momentum between sessions. Resume exactly where you left off.',
    view: 'today',
    bullets: [
      {
        id: 'today',
        text: 'Today: resume active streams, see recently touched files, get next-file predictions.',
        source: 'ui/src/components/today/',
        region: 'today-signals',
        tone: 'teal',
        view: 'today',
      },
      {
        id: 'workstreams',
        text: 'Workstreams: auto-clustered task threads from local open and search actions.',
        source: 'ui/src/components/workstreams/',
        region: 'workstream-list',
        tone: 'amber',
        view: 'workstreams',
      },
      {
        id: 'inspector',
        text: 'Inspector: stream health, file count, last-active timestamp, instant context recovery.',
        source: 'packages/ixos-ui/src/components/WorkstreamsSurface.tsx',
        region: 'workstream-inspector',
        tone: 'teal',
        view: 'workstreams',
      },
    ],
  },
  {
    id: 'protect',
    eyebrow: '/ privacy',
    headline: 'No cloud.\nNo trace.\nYour data.',
    subhead:
      'Offline-first. Ephemeral mode, journalist mode, HMAC-signed cache, mlock memory protection. For sensitive work, Ixos leaves no trail.',
    view: 'search',
    bullets: [
      {
        id: 'offline',
        text: 'Zero network calls. Embeddings cached via NTFS ADS (Windows) or xattr (macOS/Linux). Never uploaded.',
        source: 'src/storage/ads_windows.rs + xattr_unix.rs + null.rs',
        region: 'nav-rail',
        tone: 'amber',
      },
      {
        id: 'journalist',
        text: 'Journalist mode: no cache writes, no history, no filesystem trace. Maximum privacy. One flag.',
        source: 'src/journalist_mode.rs + cli/commands.rs (--journalist-mode)',
        region: 'journalist-chip',
        tone: 'amber',
      },
      {
        id: 'hmac',
        text: 'HMAC-SHA256 signed embedding cache. Tamper detection on every read. Integrity guaranteed.',
        source: 'src/storage/validator.rs',
        region: 'evidence-panel',
        tone: 'violet',
      },
      {
        id: 'mlock',
        text: 'Embedding vectors protected with mlock + zeroize-on-drop. No data survives to swap.',
        source: 'src/ixos_embed/memory_protection.rs',
        region: 'pipeline-bar',
        tone: 'violet',
      },
    ],
  },
];

// ─── REGION OVERLAY POSITIONS ─────────────────────────────────────────────────
// Approximate % positions over the AppWorldSurface container.
// AppWorld grid: 210px rail (~25%) + content panel (~75%).
// Source: packages/ixos-ui/src/styles.css + visual inspection.

const REGIONS: Record<string, React.CSSProperties> = {
  // Search view regions
  'nav-rail': { top: '15%', left: '1%', width: '22%', height: '52%' },
  'mode-chips': { top: '32%', left: '26%', width: '42%', height: '8%' },
  'results-list': { top: '40%', left: '26%', width: '43%', height: '50%' },
  'evidence-panel': { top: '40%', left: '71%', width: '27%', height: '50%' },
  'pipeline-bar': { top: '40%', left: '71%', width: '27%', height: '11%' },
  'scan-trail': { top: '76%', left: '71%', width: '27%', height: '13%' },
  'journalist-chip': { top: '20%', left: '26%', width: '24%', height: '6%' },
  // Today view regions
  'today-signals': { top: '26%', left: '26%', width: '72%', height: '16%' },
  'today-resume': { top: '44%', left: '26%', width: '39%', height: '28%' },
  // Workstreams view regions
  'workstream-list': { top: '26%', left: '26%', width: '39%', height: '57%' },
  'workstream-inspector': { top: '26%', left: '66%', width: '32%', height: '57%' },
};

const TONE_GLOW: Record<Tone, { border: string; bg: string; shadow: string }> = {
  teal: {
    border: 'rgba(20,184,166,0.7)',
    bg: 'rgba(20,184,166,0.06)',
    shadow: '0 0 28px rgba(20,184,166,0.22), inset 0 0 18px rgba(20,184,166,0.04)',
  },
  amber: {
    border: 'rgba(246,185,76,0.7)',
    bg: 'rgba(246,185,76,0.06)',
    shadow: '0 0 28px rgba(246,185,76,0.22), inset 0 0 18px rgba(246,185,76,0.04)',
  },
  violet: {
    border: 'rgba(124,92,255,0.7)',
    bg: 'rgba(124,92,255,0.06)',
    shadow: '0 0 28px rgba(124,92,255,0.22), inset 0 0 18px rgba(124,92,255,0.04)',
  },
};

// ─── LOADER ───────────────────────────────────────────────────────────────────

const LOADER_STAGES = [
  'Initializing local graph',
  'Scanning embedding cache',
  'Verifying HMAC signatures',
  'Ixos ready',
];

function Loader() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const delays = [0, 520, 1060, 1600];
    const ids = delays.map((d, i) => window.setTimeout(() => setStage(i), d));
    return () => ids.forEach(window.clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: T.bg0,
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--font-ixo-mono, monospace)',
      }}
    >
      <div style={{ display: 'grid', placeItems: 'center', gap: 36 }}>
        <PixelRingLoader label={LOADER_STAGES[stage]} speedMs={60} />
        <div style={{ display: 'grid', gap: 8, minWidth: 260 }}>
          {LOADER_STAGES.slice(0, stage + 1).map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i === stage ? 1 : 0.32, x: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: 10,
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                color: T.fg2,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  color: i < stage ? T.teal : i === stage ? T.amber : T.fg3,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {i < stage ? '✓' : '→'}
              </span>
              {s}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function Nav({
  chapterIndex,
  onChapterClick,
}: {
  chapterIndex: number;
  onChapterClick: (i: number) => void;
}) {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: 54,
        background: 'rgba(5,5,7,0.88)',
        backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${T.border}`,
        fontFamily: 'var(--font-ixo-mono, monospace)',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          textDecoration: 'none',
          color: T.porcelain,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '-0.02em',
        }}
      >
        <span style={{ color: T.teal, fontSize: 17, lineHeight: 1 }}>◈</span>
        Ixos
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {CHAPTERS.map((ch, i) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => onChapterClick(i)}
            style={{
              border: 'none',
              cursor: 'pointer',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: i === chapterIndex ? T.teal : T.fg3,
              padding: '6px 12px',
              borderRadius: 6,
              background: i === chapterIndex ? 'rgba(20,184,166,0.08)' : 'transparent',
              transition: '180ms ease',
            }}
          >
            {ch.eyebrow.replace('/ ', '')}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: T.border, margin: '0 8px' }} />
        <Link
          href="/download"
          style={{
            textDecoration: 'none',
            fontSize: 11,
            fontWeight: 700,
            color: T.bg0,
            background: T.teal,
            borderRadius: 8,
            padding: '7px 18px',
            letterSpacing: '-0.01em',
            transition: '160ms ease',
          }}
        >
          Download
        </Link>
      </div>
    </nav>
  );
}

// ─── BULLET ITEM ──────────────────────────────────────────────────────────────

function BulletItem({
  bullet,
  index,
  onHoverRegion,
  onViewChange,
}: {
  bullet: Bullet;
  index: number;
  onHoverRegion: (region: string | null, tone: Tone | null) => void;
  onViewChange: (view: IxosView) => void;
}) {
  const color = { teal: T.teal, amber: T.amber, violet: T.violet }[bullet.tone];

  return (
    <motion.li
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.22 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => {
        onHoverRegion(bullet.region, bullet.tone);
        if (bullet.view) onViewChange(bullet.view);
      }}
      onHoverEnd={() => onHoverRegion(null, null)}
      whileHover={{ x: 5 }}
      style={{ listStyle: 'none' }}
    >
      <motion.div
        whileHover={{
          borderColor: `${color}48`,
          background: `${color}09`,
        }}
        transition={{ duration: 0.18 }}
        style={{
          display: 'grid',
          gap: 7,
          padding: '12px 14px',
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: 'rgba(255,255,255,0.018)',
          cursor: 'default',
        }}
      >
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          <motion.span
            style={{
              width: 5,
              height: 5,
              borderRadius: 1,
              background: color,
              flexShrink: 0,
              marginTop: 5,
              display: 'block',
              boxShadow: `0 0 6px ${color}70`,
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: T.fg1,
              lineHeight: 1.58,
              fontFamily: 'var(--font-ixo-mono, monospace)',
            }}
          >
            {bullet.text}
          </p>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            color: T.fg3,
            letterSpacing: '0.07em',
            paddingLeft: 16,
            fontFamily: 'var(--font-ixo-mono, monospace)',
          }}
        >
          {bullet.source}
        </p>
      </motion.div>
    </motion.li>
  );
}

// ─── CHAPTER PANEL ────────────────────────────────────────────────────────────

function ChapterPanel({
  chapter,
  onHoverRegion,
  onViewChange,
}: {
  chapter: Chapter;
  onHoverRegion: (region: string | null, tone: Tone | null) => void;
  onViewChange: (view: IxosView) => void;
}) {
  return (
    <motion.div
      key={chapter.id}
      initial={{ opacity: 0, y: 40, rotateX: 14, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      exit={{ opacity: 0, y: -28, rotateX: -8, scale: 1.04 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 36px 40px 48px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Eyebrow */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.32 }}
        style={{
          margin: '0 0 10px',
          fontSize: 10,
          color: T.teal,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-ixo-mono, monospace)',
        }}
      >
        {chapter.eyebrow}
      </motion.p>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.42 }}
        style={{
          margin: '0 0 18px',
          whiteSpace: 'pre-line',
          fontSize: 'clamp(34px, 4vw, 58px)',
          fontWeight: 800,
          letterSpacing: '-0.035em',
          lineHeight: 1.06,
          color: T.porcelain,
          fontFamily: 'var(--font-ixo-heading, sans-serif)',
        }}
      >
        {chapter.headline}
      </motion.h1>

      {/* Subhead */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.38 }}
        style={{
          margin: `0 0 ${chapter.ctas ? '24px' : '28px'}`,
          fontSize: 14,
          color: T.fg2,
          lineHeight: 1.68,
          maxWidth: 440,
          fontFamily: 'var(--font-ixo-mono, monospace)',
        }}
      >
        {chapter.subhead}
      </motion.p>

      {/* CTAs */}
      {chapter.ctas && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}
        >
          {chapter.ctas.map((cta) => (
            <Link
              key={cta.label}
              href={cta.href}
              style={
                cta.primary
                  ? {
                      textDecoration: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      color: T.bg0,
                      background: T.teal,
                      borderRadius: 10,
                      padding: '10px 22px',
                      letterSpacing: '-0.01em',
                      fontFamily: 'var(--font-ixo-mono, monospace)',
                    }
                  : {
                      textDecoration: 'none',
                      fontSize: 12,
                      color: T.teal,
                      border: `1px solid rgba(20,184,166,0.38)`,
                      borderRadius: 10,
                      padding: '10px 22px',
                      fontFamily: 'var(--font-ixo-mono, monospace)',
                    }
              }
            >
              {cta.label}
            </Link>
          ))}
        </motion.div>
      )}

      {/* Bullets */}
      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18, duration: 0.3 }}
        style={{ display: 'grid', gap: 9, padding: 0, margin: 0 }}
      >
        {chapter.bullets.map((bullet, i) => (
          <BulletItem
            key={bullet.id}
            bullet={bullet}
            index={i}
            onHoverRegion={onHoverRegion}
            onViewChange={onViewChange}
          />
        ))}
      </motion.ul>
    </motion.div>
  );
}

// ─── CHAPTER DOT NAV ─────────────────────────────────────────────────────────

function ChapterDotNav({
  chapterIndex,
  onChapterClick,
}: {
  chapterIndex: number;
  onChapterClick: (i: number) => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        zIndex: 10,
        alignItems: 'center',
      }}
    >
      {CHAPTERS.map((ch, i) => (
        <button
          key={ch.id}
          type="button"
          onClick={() => onChapterClick(i)}
          title={ch.eyebrow}
          style={{
            width: 5,
            height: i === chapterIndex ? 22 : 5,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            background: i === chapterIndex ? T.teal : 'rgba(243,245,247,0.2)',
            transition: '280ms cubic-bezier(0.22, 1, 0.36, 1)',
            padding: 0,
            boxShadow: i === chapterIndex ? `0 0 8px ${T.tealDim}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ─── REGION GLOW OVERLAY ──────────────────────────────────────────────────────

function RegionOverlay({ region, tone }: { region: string; tone: Tone }) {
  const pos = REGIONS[region];
  if (!pos) return null;
  const glow = TONE_GLOW[tone];

  return (
    <motion.div
      key={`${region}-${tone}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 20,
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      {/* Main highlight box */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute',
          ...pos,
          border: `1.5px solid ${glow.border}`,
          borderRadius: 10,
          background: glow.bg,
          boxShadow: glow.shadow,
        }}
      />
      {/* Pulsing ring */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.45, 0.12, 0.45] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          ...pos,
          border: `1px solid ${glow.border}`,
          borderRadius: 12,
        }}
      />
      {/* Corner pip */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: 1,
          background: glow.border,
          boxShadow: `0 0 8px ${glow.border}`,
          left: `calc(${pos.left} - 3px)`,
          top: `calc(${pos.top} - 3px)`,
        }}
      />
    </motion.div>
  );
}

// ─── STAGE LIFT FLASH ─────────────────────────────────────────────────────────

function TransitionFlash({ tone }: { tone: Tone }) {
  const color = { teal: T.teal, amber: T.amber, violet: T.violet }[tone];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.14, 0] }}
      transition={{ duration: 0.55, times: [0, 0.28, 1] }}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 18,
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 40%, ${color}28 0%, transparent 68%)`,
        zIndex: 15,
      }}
    />
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Page5() {
  const [loaded, setLoaded] = useState(false);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [appView, setAppView] = useState<IxosView>('search');
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredTone, setHoveredTone] = useState<Tone>('teal');
  const [demoQuery, setDemoQuery] = useState('Q1 revenue variance');
  const [demoMode, setDemoMode] = useState<'flash' | 'auto' | 'pro'>('auto');
  const [selectedResult, setSelectedResult] = useState(0);
  const [selectedWorkstream, setSelectedWorkstream] = useState('ws1');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  const prevChapterRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const prefersReducedMotion = useReducedMotion();

  // Loader — exits after calibration sequence
  useEffect(() => {
    const id = window.setTimeout(() => setLoaded(true), 2200);
    return () => window.clearTimeout(id);
  }, []);

  // Chapter detection from scroll progress (500vh container → 4 chapters)
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const newIndex = Math.min(CHAPTERS.length - 1, Math.floor(latest * CHAPTERS.length * 0.9999));
    if (newIndex !== prevChapterRef.current) {
      prevChapterRef.current = newIndex;
      setIsTransitioning(true);
      setFlashKey((k) => k + 1);
      window.setTimeout(() => {
        setChapterIndex(newIndex);
        setAppView(CHAPTERS[newIndex].view);
        setIsTransitioning(false);
      }, 300);
    }
  });

  // Scroll to chapter (used by Nav and dot nav)
  const scrollToChapter = useCallback(
    (i: number) => {
      const container = containerRef.current;
      if (!container) return;
      // containerHeight = 500vh, scroll range = 400vh, chapter i starts at i/4 progress
      const totalScroll = container.scrollHeight - window.innerHeight;
      const target = (i / CHAPTERS.length) * totalScroll + container.offsetTop;
      window.scrollTo({ top: target, behavior: 'smooth' });
    },
    [],
  );

  const handleHoverRegion = useCallback((region: string | null, tone: Tone | null) => {
    setHoveredRegion(region);
    if (tone) setHoveredTone(tone);
  }, []);

  const handleViewChange = useCallback((view: IxosView) => {
    setAppView(view);
  }, []);

  const currentChapter = CHAPTERS[chapterIndex];

  // Pipeline stats vary by chapter for demo effect
  const activePipelineStats = useMemo(
    () =>
      chapterIndex === 1
        ? { ...PIPELINE_STATS, stage: 'semantic', filesScanned: 148, candidates: 14, embedded: 6, cacheHits: 3 }
        : PIPELINE_STATS,
    [chapterIndex],
  );

  const isSearching = chapterIndex === 1;
  const stageLabel = chapterIndex === 1 ? 'Live · Streaming' : 'Locked · 7 results';

  return (
    <div
      style={{
        background: T.bg0,
        color: T.porcelain,
        minHeight: '100vh',
        fontFamily: 'var(--font-ixo-mono, monospace)',
        position: 'relative',
      }}
    >
      {/* ── Continuous ambient pixel field — ONE instance for full page ── */}
      {/* source: packages/ixos-ui/src/components/AmbientIxosField.tsx */}
      <AmbientIxosField
        mode="fixed"
        energy={isTransitioning && !prefersReducedMotion ? 'dynamic' : 'calm'}
      />

      {/* ── Calibration Loader ── */}
      <AnimatePresence>{!loaded && <Loader key="loader" />}</AnimatePresence>

      {/* ── Fixed Navigation ── */}
      <Nav chapterIndex={chapterIndex} onChapterClick={scrollToChapter} />

      {/* ── SPLIT STAGE: 500vh scroll container → sticky 100vh stage ── */}
      <div ref={containerRef} style={{ height: '500vh', position: 'relative' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {/* ────────────────────────────────────────────────────────────────
              LEFT PANEL — editorial narrative, 42% width
              Stage panels animate in from translateZ depth on chapter change.
              ──────────────────────────────────────────────────────────────── */}
          <div
            style={{
              width: '42%',
              height: '100%',
              position: 'relative',
              borderRight: `1px solid ${T.border}`,
              perspective: '1200px',
              overflow: 'hidden',
            }}
          >
            {/* Vertical calibration line */}
            <div
              style={{
                position: 'absolute',
                left: 32,
                top: '54px',
                bottom: '40px',
                width: 1,
                background: `linear-gradient(180deg, transparent 0%, ${T.tealDim}40 20%, ${T.tealDim}40 80%, transparent 100%)`,
                zIndex: 1,
              }}
            />

            <AnimatePresence mode="wait">
              <ChapterPanel
                key={chapterIndex}
                chapter={currentChapter}
                onHoverRegion={handleHoverRegion}
                onViewChange={handleViewChange}
              />
            </AnimatePresence>

            {/* Chapter dot navigation */}
            <ChapterDotNav chapterIndex={chapterIndex} onChapterClick={scrollToChapter} />

            {/* Bottom chapter counter */}
            <div
              style={{
                position: 'absolute',
                bottom: 28,
                left: 48,
                fontSize: 10,
                color: T.fg3,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {chapterIndex + 1} / {CHAPTERS.length}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────
              RIGHT PANEL — live AppWorld viewport, 58% width
              AppWorldSurface stays MOUNTED throughout — never replaced.
              Region glows appear on bullet hover.
              Stage lift (rotateX + scale) fires on chapter transition.
              ──────────────────────────────────────────────────────────────── */}
          <div
            style={{
              width: '58%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '66px 24px 28px 20px',
              position: 'relative',
            }}
          >
            {/* Background chapter glow */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  chapterIndex === 3
                    ? 'radial-gradient(ellipse at 60% 50%, rgba(124,92,255,0.06) 0%, transparent 60%)'
                    : chapterIndex === 2
                      ? 'radial-gradient(ellipse at 60% 50%, rgba(20,184,166,0.05) 0%, transparent 60%)'
                      : 'radial-gradient(ellipse at 60% 50%, rgba(20,184,166,0.04) 0%, transparent 60%)',
                transition: 'background 0.8s ease',
                pointerEvents: 'none',
              }}
            />

            {/* AppWorld container with stage lift animation */}
            <motion.div
              animate={
                prefersReducedMotion
                  ? {}
                  : {
                      rotateX: isTransitioning ? 4 : 0,
                      scale: isTransitioning ? 0.975 : 1,
                      y: isTransitioning ? 10 : 0,
                    }
              }
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: '100%',
                maxWidth: 840,
                position: 'relative',
                perspective: '2000px',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* The ONE AppWorldSurface — never unmounted, always synced to desktop UI */}
              {/* source: packages/ixos-ui/src/components/AppWorldSurface.tsx */}
              <AppWorldSurface
                view={appView}
                onViewChange={setAppView}
                title="Ixos Desktop"
                subtitle="Local-first search cockpit"
                interactive
                search={{
                  query: demoQuery,
                  directoryLabel: '~/Documents',
                  mode: demoMode,
                  onModeChange: setDemoMode,
                  stageLabel,
                  isSearching,
                  results: SEARCH_RESULTS,
                  selectedIndex: selectedResult,
                  onSelectResult: setSelectedResult,
                  allowResultsScroll: true,
                  showInlineRunButton: chapterIndex === 0,
                  hideSearchChrome: false,
                  resultLimit: 7,
                  pipelineStats: activePipelineStats,
                  onQueryChange: setDemoQuery,
                  presets: [
                    'Q1 revenue variance',
                    'product roadmap enterprise',
                    'CFO reconciliation',
                    'board deck November',
                  ],
                  sourcePath: 'src-tauri/src/commands/search.rs',
                }}
                today={{
                  dateLabel: 'Friday, Nov 29',
                  signals: TODAY_SIGNALS,
                  resumeRows: TODAY_RESUME,
                  recentRows: TODAY_RECENT,
                  suggestedRows: TODAY_SUGGESTED,
                  sourcePath: 'ui/src/components/today/',
                }}
                workstreams={{
                  rows: WORKSTREAM_ROWS,
                  selectedId: selectedWorkstream,
                  onSelectRow: setSelectedWorkstream,
                  summary: WORKSTREAM_SUMMARY,
                  sourcePath: 'ui/src/components/workstreams/',
                }}
              />

              {/* Region glow overlay — activates on bullet hover */}
              <AnimatePresence>
                {hoveredRegion && (
                  <RegionOverlay key={hoveredRegion} region={hoveredRegion} tone={hoveredTone} />
                )}
              </AnimatePresence>

              {/* Chapter transition flash — stage lift visual cue */}
              <AnimatePresence>
                {isTransitioning && !prefersReducedMotion && (
                  <TransitionFlash key={`flash-${flashKey}`} tone={hoveredTone} />
                )}
              </AnimatePresence>
            </motion.div>

            {/* Scroll cue arrow (chapter 0 only) */}
            <AnimatePresence>
              {chapterIndex === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    bottom: 28,
                    right: 32,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 10,
                    color: T.fg3,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  <motion.span
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    ↓
                  </motion.span>
                  Scroll to explore
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer
        style={{
          padding: '52px 48px',
          background: T.bg1,
          borderTop: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 24,
          fontFamily: 'var(--font-ixo-mono, monospace)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: T.teal, fontSize: 18, lineHeight: 1 }}>◈</span>
          <span style={{ fontSize: 13, color: T.fg2, letterSpacing: '-0.02em', fontWeight: 600 }}>
            Ixos Protocol
          </span>
        </div>

        <nav style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {([['Privacy', '/privacy'], ['Terms', '/terms'], ['Docs', '/docs'], ['Support', '/support']] as [string, string][]).map(([label, href]) => (
            <Link
              key={label}
              href={href}
              style={{
                fontSize: 11,
                color: T.fg3,
                textDecoration: 'none',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <p style={{ margin: 0, fontSize: 11, color: T.fg3, letterSpacing: '0.06em' }}>
          Local-first. Privacy by design.
        </p>
      </footer>
    </div>
  );
}
