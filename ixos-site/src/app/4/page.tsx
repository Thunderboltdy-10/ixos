"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion';
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

type LensTone = 'teal' | 'amber' | 'slate';
type LensToy = 'stream' | 'mode' | 'evidence' | 'session' | 'today' | 'workstreams' | 'trust' | 'cli';

interface LensItem {
  id: string;
  title: string;
  claim: string;
  source: string;
  view: IxosView;
  coverage: string[];
  tone: LensTone;
  toy: LensToy;
  hotspot: { x: string; y: string; label: string };
}

interface PipelineState {
  stage: string;
  filesScanned: number;
  candidates: number;
  embedded: number;
  cacheHits: number;
  scanTrail: string[];
}

interface CameraPose {
  x: number;
  y: number;
  scale: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
}

const BASE_RESULTS: IxosSearchResult[] = [
  {
    id: 'r1',
    title: 'Q1-financial-report.md',
    path: 'dataset/docs/Q1-financial-report.md',
    score: 0.96,
    snippet: 'Revenue variance was attributed to delayed enterprise renewals and support seat consolidation.',
    rationale: 'Lexical candidate in title, semantic alignment in financial section, integrity-safe context extraction.',
  },
  {
    id: 'r2',
    title: 'meeting_notes_2024-11-15.txt',
    path: 'dataset/docs/meeting_notes_2024-11-15.txt',
    score: 0.94,
    snippet: 'Action item: draft deployment checklist and update CLI reliability quickcheck procedure.',
    rationale: 'Strong co-occurrence with deployment and checklist terms in recent workstream activity.',
  },
  {
    id: 'r3',
    title: 'CLI_RELIABILITY_QUICKCHECK.md',
    path: 'docs/product/CLI_RELIABILITY_QUICKCHECK.md',
    score: 0.93,
    snippet: 'Use ixos doctor and release-check sequence before shipping desktop binaries.',
    rationale: 'Direct lexical match and high semantic overlap with release preparation intent.',
  },
  {
    id: 'r4',
    title: 'search.rs',
    path: 'src-tauri/src/commands/search.rs',
    score: 0.91,
    snippet: 'Ask mode resolves intent while preserving selected mode and preventing forced Pro fallback.',
    rationale: 'Evidence block references ask_mode_active and resolve_search_mode behavior.',
  },
  {
    id: 'r5',
    title: 'TodayTab.tsx',
    path: 'ui/src/components/today/TodayTab.tsx',
    score: 0.9,
    snippet: 'Today view combines resume context, recently touched files, and suggested next actions.',
    rationale: 'Matched by Today workflow terms and proximity to workstream reconstruction logic.',
  },
  {
    id: 'r6',
    title: 'WorkstreamsList.tsx',
    path: 'ui/src/components/workstreams/WorkstreamsList.tsx',
    score: 0.89,
    snippet: 'Workstreams are auto-clustered from search and file-open events with re-cluster controls.',
    rationale: 'High lexical density around workstream/recluster terms and event pipeline alignment.',
  },
  {
    id: 'r7',
    title: 'commands.rs',
    path: 'src/cli/commands.rs',
    score: 0.87,
    snippet: 'CLI exposes search, index, cache, compliance, doctor, model, and update command groups.',
    rationale: 'Query intent references command surface inventory and direct enum definitions.',
  },
  {
    id: 'r8',
    title: 'config.rs',
    path: 'src/cli/config.rs',
    score: 0.86,
    snippet: 'Config migration normalizes cache and model naming to canonical v2 identifiers.',
    rationale: 'Strong match for mode normalization and naming policy checks.',
  },
  {
    id: 'r9',
    title: 'workstreams.rs',
    path: 'src-tauri/src/commands/workstreams.rs',
    score: 0.85,
    snippet: 'Encrypted persistence for workstreams is enabled only with Pro capability.',
    rationale: 'Privacy and persistence terms map directly to command implementation.',
  },
  {
    id: 'r10',
    title: 'activity.rs',
    path: 'src-tauri/src/commands/activity.rs',
    score: 0.84,
    snippet: 'Activity ledger drives co-occurrence suggestions and move recommendations for Today.',
    rationale: 'Co-occurrence and suggestion phrasing matches activity command payload definitions.',
  },
];

const TODAY_SIGNALS: IxosTodaySignal[] = [
  { label: 'Signals Today', value: '18', hint: 'recently touched files' },
  { label: 'Suggested Next', value: '6', hint: 'predicted follow-ups' },
  { label: 'Move Hints', value: '3', hint: 'folder reorganizations' },
];

const TODAY_RESUME: IxosTodayRow[] = [
  {
    id: 't-resume-1',
    title: 'Release hardening sprint',
    meta: 'Workstream - 47 actions - 12 minutes ago',
    detail: 'Continue from diagnostics + benchmark pass with preloaded flash model context.',
  },
  {
    id: 't-resume-2',
    title: 'search.rs',
    meta: 'src-tauri/src/commands/search.rs',
    detail: 'Intent detection and mode routing edits were last touched in this stream.',
  },
];

const TODAY_RECENT: IxosTodayRow[] = [
  {
    id: 't-recent-1',
    title: 'FEATURE_INVENTORY.md',
    meta: 'repo root',
    detail: 'Feature coverage map updated for landing lens contract.',
  },
  {
    id: 't-recent-2',
    title: 'TodayTab.tsx',
    meta: 'ui/src/components/today',
    detail: 'Shared surface integration for desktop Today pass.',
  },
  {
    id: 't-recent-3',
    title: 'WorkstreamsList.tsx',
    meta: 'ui/src/components/workstreams',
    detail: 'Operational density and metrics layout pass.',
  },
];

const TODAY_SUGGESTED: IxosTodayRow[] = [
  {
    id: 't-suggest-1',
    title: 'src-tauri/src/commands/activity.rs',
    meta: 'co-occurrence source',
    detail: 'Supports suggested-next chain and recent signals used in Today.',
  },
  {
    id: 't-suggest-2',
    title: 'src/activity_ledger/mod.rs',
    meta: 'ledger core',
    detail: 'Local event ledger powering recommendation confidence.',
  },
];

const WORKSTREAM_ROWS: IxosWorkstreamRow[] = [
  {
    id: 'w-1',
    name: 'Release Safety Sweep',
    status: 'active',
    files: 14,
    actions: 51,
    lastActive: '12m ago',
    detail: 'Doctor + release-check + docs alignment before build cut.',
  },
  {
    id: 'w-2',
    name: 'Search Pipeline Tuning',
    status: 'warm',
    files: 9,
    actions: 33,
    lastActive: '3h ago',
    detail: 'Ask mode routing and progressive stage messaging updates.',
  },
  {
    id: 'w-3',
    name: 'Landing Proof Pass',
    status: 'warm',
    files: 11,
    actions: 29,
    lastActive: '5h ago',
    detail: 'Truthful claim audit and source-path citation hardening.',
  },
  {
    id: 'w-4',
    name: 'Model Registry Cleanup',
    status: 'cold',
    files: 6,
    actions: 18,
    lastActive: '1d ago',
    detail: 'Canonical v2 naming consistency across docs and config.',
  },
];

const WORKSTREAM_SUMMARY = [
  { label: 'Workstreams', value: '4', hint: 'active clusters' },
  { label: 'Activity', value: '131', hint: 'tracked actions' },
  { label: 'Files Linked', value: '40', hint: 'unique files' },
  { label: 'Active 24h', value: '3', hint: 'recent streams' },
];

const LENSES: LensItem[] = [
  {
    id: 'speed-stream',
    title: 'Speed You Can Feel',
    claim: 'Progressive streaming starts lexical first, then stabilizes semantically as evidence arrives.',
    source: 'src-tauri/src/commands/search.rs - ui/src/stores/searchStore.ts',
    view: 'search',
    coverage: ['D-01', 'D-02', 'D-03', 'D-04'],
    tone: 'teal',
    toy: 'stream',
    hotspot: { x: '37%', y: '58%', label: 'Result stream' },
  },
  {
    id: 'model-control',
    title: 'Model and Ask Control',
    claim: 'Mode and Ask behavior are explicit, and Ask follows intent without silently forcing slow Pro routing.',
    source: 'src-tauri/src/commands/search.rs - docs/product/DESKTOP_APP.md - ui/src/components/search/AskModeSwitcher.tsx',
    view: 'search',
    coverage: ['D-05', 'D-06'],
    tone: 'slate',
    toy: 'mode',
    hotspot: { x: '27%', y: '34%', label: 'Mode controls' },
  },
  {
    id: 'evidence-actions',
    title: 'Evidence and File Actions',
    claim: 'Each selected match exposes rationale and supports direct open/reveal actions.',
    source: 'ui/src/components/search/WhyMatched.tsx - ui/src/lib/tauri.ts - src/ixos_rank/evidence/mod.rs',
    view: 'search',
    coverage: ['D-07', 'D-08'],
    tone: 'teal',
    toy: 'evidence',
    hotspot: { x: '77%', y: '50%', label: 'Evidence rail' },
  },
  {
    id: 'session-flow',
    title: 'Session Flow',
    claim: 'History, starring, command palette, and overlay search keep navigation continuous across sessions.',
    source: 'ui/src/components/layout/Sidebar.tsx - ui/src/components/search/CommandPalette.tsx - ui/src/components/search/SearchOverlay.tsx',
    view: 'search',
    coverage: ['D-09', 'D-10', 'D-11'],
    tone: 'slate',
    toy: 'session',
    hotspot: { x: '8%', y: '48%', label: 'Session rail' },
  },
  {
    id: 'today-lens',
    title: 'Today Board',
    claim: 'Today consolidates resume context, recency signals, and recommendation paths from local activity.',
    source: 'ui/src/components/today/TodayTab.tsx - ui/src/stores/todayStore.ts - src-tauri/src/commands/activity.rs',
    view: 'today',
    coverage: ['D-12', 'D-14'],
    tone: 'amber',
    toy: 'today',
    hotspot: { x: '52%', y: '35%', label: 'Today focus board' },
  },
  {
    id: 'workstreams-lens',
    title: 'Workstreams Loop',
    claim: 'Workstreams cluster events into operational task threads with encrypted Pro persistence and quick recovery.',
    source: 'ui/src/components/workstreams/WorkstreamsList.tsx - src-tauri/src/commands/workstreams.rs',
    view: 'workstreams',
    coverage: ['D-13'],
    tone: 'amber',
    toy: 'workstreams',
    hotspot: { x: '55%', y: '63%', label: 'Cluster inspector' },
  },
  {
    id: 'trust-controls',
    title: 'Trust and Controls',
    claim: 'Entitlements, diagnostics, compliance, and privacy controls stay explicit.',
    source: 'ui/src/components/layout/AppShell.tsx - ui/src/components/settings/SettingsPanel.tsx - src/compliance/mod.rs - src/diagnostics.rs',
    view: 'search',
    coverage: ['D-15', 'D-16', 'D-17', 'D-18', 'D-19', 'D-20'],
    tone: 'slate',
    toy: 'trust',
    hotspot: { x: '80%', y: '21%', label: 'Trust controls' },
  },
  {
    id: 'cli-lens',
    title: 'CLI Workflow Surface',
    claim: 'Desktop and CLI share one retrieval core, with real command groups for search, cache, compliance, models, and updates.',
    source: 'src/cli/commands.rs - src/main.rs - src/cli/config.rs - src/cli/self_update.rs',
    view: 'search',
    coverage: ['C-01', 'C-02', 'C-03', 'C-04', 'C-05', 'C-06', 'C-07', 'C-08', 'C-09', 'C-10', 'C-11', 'C-12', 'C-13'],
    tone: 'teal',
    toy: 'cli',
    hotspot: { x: '34%', y: '24%', label: 'Command bridge' },
  },
];

function buildResults(query: string): IxosSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return BASE_RESULTS;

  const preferred = BASE_RESULTS.filter((item) =>
    `${item.title} ${item.path} ${item.snippet}`.toLowerCase().includes(q)
  );
  const remaining = BASE_RESULTS.filter((item) => !preferred.includes(item));
  return [...preferred, ...remaining].map((item, index) => ({
    ...item,
    score: Math.max(0.7, item.score - index * 0.01),
  }));
}

function lensPipelineSeed(index: number): PipelineState {
  return {
    stage: index <= 1 ? 'lexical' : index <= 3 ? 'semantic' : index <= 5 ? 'refining' : 'locked',
    filesScanned: 46 + index * 21,
    candidates: 12 + index * 2,
    embedded: 8 + index * 2,
    cacheHits: 3 + (index % 4),
    scanTrail: BASE_RESULTS.slice(0, 4).map((item) => item.path),
  };
}

function toneClass(tone: LensTone): { panel: string; chip: string; glow: string } {
  if (tone === 'amber') {
    return {
      panel: 'border-accent-amber/38 bg-accent-amber/10',
      chip: 'text-accent-amber border-accent-amber/35 bg-accent-amber/12',
      glow: 'rgba(246, 185, 76, 0.16)',
    };
  }
  if (tone === 'slate') {
    return {
      panel: 'border-white/22 bg-white/[0.07]',
      chip: 'text-fg-secondary border-white/26 bg-white/8',
      glow: 'rgba(210, 220, 232, 0.12)',
    };
  }
  return {
    panel: 'border-accent-teal/34 bg-accent-teal/12',
    chip: 'text-accent-teal border-accent-teal/35 bg-accent-teal/16',
    glow: 'rgba(20, 184, 166, 0.16)',
  };
}

const BASE_CAMERA_POSE: CameraPose = {
  x: 0,
  y: 0,
  scale: 1,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
};

const LENS_CAMERA_POSE: Record<string, CameraPose> = {
  'speed-stream': { x: -112, y: 52, scale: 1.26, rotateX: 9.2, rotateY: 13, rotateZ: -2.4 },
  'model-control': { x: 150, y: -52, scale: 1.2, rotateX: 7.1, rotateY: -15, rotateZ: 1.8 },
  'evidence-actions': { x: -196, y: 20, scale: 1.3, rotateX: 9, rotateY: 17, rotateZ: -1.8 },
  'session-flow': { x: 222, y: 30, scale: 1.21, rotateX: 7.1, rotateY: -18, rotateZ: 2.2 },
  'today-lens': { x: -36, y: -84, scale: 1.18, rotateX: 6.3, rotateY: 4, rotateZ: -1.2 },
  'workstreams-lens': { x: -62, y: 86, scale: 1.23, rotateX: 8.8, rotateY: 6, rotateZ: -0.5 },
  'trust-controls': { x: -176, y: -92, scale: 1.24, rotateX: 6.8, rotateY: 15, rotateZ: 1.3 },
  'cli-lens': { x: 106, y: -72, scale: 1.23, rotateX: 7.5, rotateY: -9, rotateZ: -1.4 },
};

const LENS_WORLD_LAYOUT: Record<
  string,
  {
    header: { left: string; top: string; width: string };
    panel: { left: string; top: string; width: string };
    focus: { left: string; top: string; width: string; height: string };
  }
> = {
  'speed-stream': {
    header: { left: '4%', top: '8%', width: '34%' },
    panel: { left: '64%', top: '70%', width: '30%' },
    focus: { left: '26%', top: '35%', width: '48%', height: '16%' },
  },
  'model-control': {
    header: { left: '6%', top: '9%', width: '36%' },
    panel: { left: '63%', top: '10%', width: '28%' },
    focus: { left: '25%', top: '20%', width: '47%', height: '10%' },
  },
  'evidence-actions': {
    header: { left: '6%', top: '9%', width: '38%' },
    panel: { left: '46%', top: '70%', width: '26%' },
    focus: { left: '73%', top: '33%', width: '20%', height: '45%' },
  },
  'session-flow': {
    header: { left: '62%', top: '8%', width: '32%' },
    panel: { left: '23%', top: '70%', width: '26%' },
    focus: { left: '3%', top: '14%', width: '17%', height: '72%' },
  },
  'today-lens': {
    header: { left: '5%', top: '7%', width: '38%' },
    panel: { left: '65%', top: '12%', width: '28%' },
    focus: { left: '24%', top: '24%', width: '56%', height: '52%' },
  },
  'workstreams-lens': {
    header: { left: '5%', top: '8%', width: '38%' },
    panel: { left: '63%', top: '66%', width: '30%' },
    focus: { left: '21%', top: '22%', width: '66%', height: '62%' },
  },
  'trust-controls': {
    header: { left: '5%', top: '8%', width: '37%' },
    panel: { left: '52%', top: '72%', width: '28%' },
    focus: { left: '76%', top: '2%', width: '17%', height: '20%' },
  },
  'cli-lens': {
    header: { left: '5%', top: '8%', width: '38%' },
    panel: { left: '22%', top: '68%', width: '38%' },
    focus: { left: '22%', top: '68%', width: '50%', height: '18%' },
  },
};

interface InWorldLensOverlayProps {
  lens: LensItem;
  index: number;
  onRunDemo: () => void;
  onModeChange: (mode: 'flash' | 'auto' | 'pro') => void;
}

const LENS_STORY: Record<string, { kicker: string; lineA: string; lineB: string; subline: string }> = {
  'speed-stream': {
    kicker: 'Process Topology',
    lineA: 'One query,',
    lineB: 'four stages.',
    subline: 'Lexical first response, semantic lock-in, then evidence refinement.',
  },
  'model-control': {
    kicker: 'Mode Governance',
    lineA: 'Model choice',
    lineB: 'stays explicit.',
    subline: 'Ask behavior follows intent but keeps selected routing constraints.',
  },
  'evidence-actions': {
    kicker: 'Evidence Rail',
    lineA: 'Every result has',
    lineB: 'traceable rationale.',
    subline: 'Open and reveal actions stay coupled to ranked context.',
  },
  'session-flow': {
    kicker: 'Session Continuity',
    lineA: 'History becomes',
    lineB: 'navigation memory.',
    subline: 'Recent, starred, command palette, and overlay all stay in one flow.',
  },
  'today-lens': {
    kicker: 'Today View',
    lineA: 'Your day,',
    lineB: 'organized.',
    subline: 'Resume state, recents, and next actions from local activity.',
  },
  'workstreams-lens': {
    kicker: 'Workstream History',
    lineA: 'Every action,',
    lineB: 'threaded.',
    subline: 'Clusters preserve context with fast recovery across sessions.',
  },
  'trust-controls': {
    kicker: 'Trust Layer',
    lineA: 'Controls stay',
    lineB: 'auditable.',
    subline: 'Entitlement, compliance, diagnostics, and local-first boundaries.',
  },
  'cli-lens': {
    kicker: 'CLI Parity',
    lineA: 'Desktop and CLI',
    lineB: 'share one core.',
    subline: 'Command surfaces map to the same retrieval pipeline.',
  },
};

function InWorldLensOverlay({
  lens,
  index,
  onRunDemo,
  onModeChange,
}: InWorldLensOverlayProps) {
  const tone = toneClass(lens.tone);
  const story = LENS_STORY[lens.id] ?? LENS_STORY['speed-stream'];
  const layout = LENS_WORLD_LAYOUT[lens.id] ?? LENS_WORLD_LAYOUT['speed-stream'];
  const [privacyLock, setPrivacyLock] = useState(true);
  const toy = (() => {
    if (lens.toy === 'stream') {
      const stages = ['Input Parser', 'Ralph Embedder', 'JIT Sweep', 'Fusion Ranker'];
      return (
        <div className="grid gap-2">
          <button type="button" onClick={onRunDemo} className="justify-self-start rounded-md border border-accent-teal/35 bg-accent-teal/15 px-2.5 py-1 text-[10px] text-accent-teal">
            Replay stream
          </button>
          <div className="grid gap-1.5">
            {stages.map((stage, idx) => (
              <div key={stage} className="relative rounded-md border border-white/12 bg-graphite-2/45 px-2.5 py-1.5 text-[10px] text-fg-secondary">
                <span className="text-[9px] uppercase tracking-[0.14em] text-fg-ghost">stage 0{idx + 1}</span>{' '}
                {stage}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (lens.toy === 'mode') {
      return (
        <div className="grid gap-2">
          <div className="flex gap-1.5 text-[10px]">
            <button type="button" onClick={() => onModeChange('flash')} className="rounded-md border border-white/20 px-2 py-1">Flash</button>
            <button type="button" onClick={() => onModeChange('auto')} className="rounded-md border border-white/20 px-2 py-1">Auto</button>
            <button type="button" onClick={() => onModeChange('pro')} className="rounded-md border border-white/20 px-2 py-1">Pro</button>
          </div>
          <p className="text-[10px] text-fg-secondary">Selected mode persists while Ask intent toggles only interpretation depth.</p>
        </div>
      );
    }

    if (lens.toy === 'evidence') {
      const bars = [
        { label: 'Lexical', value: 100 },
        { label: 'Semantic', value: 84 },
        { label: 'Refining', value: 62 },
        { label: 'Locked', value: 38 },
      ];
      return (
        <div className="space-y-1.5">
          {bars.map((bar, idx) => (
            <div key={bar.label} className="space-y-1">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-fg-ghost">
                <span>{bar.label}</span>
                <span>{bar.value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8">
                <motion.div
                  className="h-full rounded-full bg-accent-teal"
                  initial={{ width: '16%' }}
                  animate={{ width: `${bar.value}%` }}
                  transition={{ duration: 0.42, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (lens.toy === 'session') {
      return (
        <div className="grid gap-1 text-[10px] text-fg-secondary">
          <div className="rounded-md border border-white/12 bg-graphite-2/45 px-2 py-1">recent → starred → restore</div>
          <div className="rounded-md border border-white/12 bg-graphite-2/45 px-2 py-1">Cmd+K command palette</div>
          <div className="rounded-md border border-white/12 bg-graphite-2/45 px-2 py-1">overlay continuity</div>
        </div>
      );
    }

    if (lens.toy === 'today') {
      return (
        <div className="grid grid-cols-3 gap-1.5 text-[9px]">
          <div className="rounded-md border border-white/12 bg-graphite-2/45 p-1.5">
            <p className="text-fg-ghost uppercase tracking-[0.12em]">Upcoming</p>
            <p className="mt-1 text-fg-secondary">Review auth PR</p>
          </div>
          <div className="rounded-md border border-accent-amber/28 bg-accent-amber/10 p-1.5">
            <p className="text-accent-amber uppercase tracking-[0.12em]">Focus</p>
            <p className="mt-1 text-fg-secondary">Investigate OOM</p>
          </div>
          <div className="rounded-md border border-white/12 bg-graphite-2/45 p-1.5 opacity-70">
            <p className="text-fg-ghost uppercase tracking-[0.12em]">Done</p>
            <p className="mt-1 text-fg-secondary">Deploy hotfix</p>
          </div>
        </div>
      );
    }

    if (lens.toy === 'workstreams') {
      return (
        <div className="grid gap-1.5 text-[10px] text-fg-secondary">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-amber" />
            <span>09:42 Searched auth methods</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-teal" />
            <span>10:15 Modified token.ts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-amber" />
            <span>11:05 PR created</span>
          </div>
        </div>
      );
    }

    if (lens.toy === 'trust') {
      return (
        <div className="grid gap-2 text-[10px]">
          <button
            type="button"
            onClick={() => setPrivacyLock((v) => !v)}
            className="justify-self-start rounded-md border border-white/20 px-2 py-1"
          >
            Privacy lock: {privacyLock ? 'on-device only' : 'controls visible'}
          </button>
          <div className="grid grid-cols-2 gap-1.5 text-fg-secondary">
            <p className="rounded-md border border-white/12 bg-graphite-2/45 px-2 py-1">Entitlement verify</p>
            <p className="rounded-md border border-white/12 bg-graphite-2/45 px-2 py-1">Compliance checks</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1 font-mono text-[9px]">
        <p className="rounded-md border border-white/10 bg-black/35 px-2 py-1">ixos search "deployment checklist" --progressive</p>
        <p className="rounded-md border border-white/10 bg-black/35 px-2 py-1">ixos cache stats --json</p>
        <p className="rounded-md border border-white/10 bg-black/35 px-2 py-1">ixos doctor --verbose</p>
      </div>
    );
  })();

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <motion.div
        key={`${lens.id}-heading`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="absolute"
        style={{
          left: layout.header.left,
          top: layout.header.top,
          width: layout.header.width,
        }}
      >
        <p className="text-[9px] uppercase tracking-[0.2em] text-fg-ghost">{story.kicker}</p>
        <h2 className="mt-1 text-[28px] font-semibold leading-[1.02] text-porcelain">
          {story.lineA}
          <br />
          <span className="italic text-accent-amber">{story.lineB}</span>
        </h2>
        <p className="mt-2 text-[11px] text-fg-secondary">{story.subline}</p>
      </motion.div>

      <motion.div
        className="absolute rounded-lg border border-accent-teal/45 bg-accent-teal/8"
        style={{
          left: layout.focus.left,
          top: layout.focus.top,
          width: layout.focus.width,
          height: layout.focus.height,
        }}
        animate={{
          boxShadow: ['0 0 0 0 rgba(20,184,166,0.32)', '0 0 0 8px rgba(20,184,166,0)', '0 0 0 0 rgba(20,184,166,0.32)'],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
      />

      <motion.div
        key={lens.id}
        initial={{ opacity: 0, y: 14, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.995 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className={`pointer-events-auto absolute rounded-lg border ${tone.panel} bg-graphite-0/86 p-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]`}
        style={{
          left: layout.panel.left,
          top: layout.panel.top,
          width: layout.panel.width,
        }}
      >
        <p className="mb-1 text-[8px] uppercase tracking-[0.16em] text-fg-ghost">Lens {String(index + 1).padStart(2, '0')} · {lens.title}</p>

        <div className="mt-2 flex flex-wrap gap-1">
          {lens.coverage.slice(0, 6).map((id) => (
            <span key={id} className={`rounded-full border px-1.5 py-0.5 text-[7px] ${tone.chip}`}>
              {id}
            </span>
          ))}
          {lens.coverage.length > 6 && (
            <span className="rounded-full border border-white/20 px-1.5 py-0.5 text-[7px] text-fg-ghost">
              +{lens.coverage.length - 6}
            </span>
          )}
        </div>

        <div className="mt-2 rounded-md border border-white/12 bg-graphite-2/50 p-1.5">{toy}</div>
        <p className="mt-2 text-[8px] text-fg-dim">source: {lens.source}</p>
      </motion.div>
    </div>
  );
}

interface LensAnchorProps {
  lens: LensItem;
  index: number;
  onActive: (index: number) => void;
  onFocusLens: (lens: LensItem, index: number) => void;
}

function LensAnchor({ lens, index, onActive, onFocusLens }: LensAnchorProps) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { margin: '-34% 0px -34% 0px' });

  useEffect(() => {
    if (inView) {
      onActive(index);
      onFocusLens(lens, index);
    }
  }, [inView, index, lens, onActive, onFocusLens]);

  return (
    <section
      ref={ref}
      id={lens.id}
      className="relative z-[12] h-[82vh] scroll-mt-24"
      aria-label={`Lens ${index + 1}: ${lens.title}`}
    />
  );
}

export default function Variant4Page() {
  const reducedMotion = useReducedMotion();
  const [booting, setBooting] = useState(true);
  const [entryAnimating, setEntryAnimating] = useState(false);
  const [activeLens, setActiveLens] = useState(-1);
  const [view, setView] = useState<IxosView>('search');
  const [mode, setMode] = useState<'flash' | 'auto' | 'pro'>('auto');
  const [query, setQuery] = useState('where is the deployment checklist?');
  const [allResults, setAllResults] = useState<IxosSearchResult[]>(BASE_RESULTS);
  const [visibleCount, setVisibleCount] = useState(8);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [stageLabel, setStageLabel] = useState('Locked');
  const [pipeline, setPipeline] = useState<PipelineState>(lensPipelineSeed(0));
  const [currentWorkstreamId, setCurrentWorkstreamId] = useState(WORKSTREAM_ROWS[0]?.id);
  const [cameraPose, setCameraPose] = useState<CameraPose>(BASE_CAMERA_POSE);
  const [enteredWorld, setEnteredWorld] = useState(false);
  const [flashZoom, setFlashZoom] = useState(false);
  const [lensWhip, setLensWhip] = useState<{ key: number; dir: 1 | -1 } | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const whipTimerRef = useRef<number | null>(null);
  const enteredWorldRef = useRef(false);
  const lastLensIndexRef = useRef(-1);

  useEffect(() => {
    const waitMs = reducedMotion ? 120 : 980;
    const id = window.setTimeout(() => {
      setBooting(false);
      if (!reducedMotion) {
        setEntryAnimating(true);
      }
    }, waitMs);
    return () => window.clearTimeout(id);
  }, [reducedMotion]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
      if (whipTimerRef.current) {
        window.clearTimeout(whipTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    enteredWorldRef.current = enteredWorld;
  }, [enteredWorld]);

  const triggerFlashZoom = useCallback(() => {
    if (reducedMotion) return;
    setFlashZoom(true);
    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setFlashZoom(false);
      flashTimerRef.current = null;
    }, 280);
  }, [reducedMotion]);

  const runStream = useCallback((nextQuery?: string) => {
    const q = (nextQuery ?? query).trim();
    const nextResults = buildResults(q);
    setQuery(q);
    setAllResults(nextResults);
    setSelectedIndex(0);
    setVisibleCount(2);
    setIsSearching(true);
    setStageLabel('Lexical scan');
    setPipeline({
      stage: 'lexical',
      filesScanned: 18,
      candidates: 4,
      embedded: 0,
      cacheHits: 1,
      scanTrail: nextResults.slice(0, 2).map((item) => item.path),
    });

    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
    }

    let ticks = 0;
    streamTimerRef.current = window.setInterval(() => {
      ticks += 1;
      setVisibleCount((count) => Math.min(nextResults.length, count + 2));

      setPipeline((prev) => ({
        stage: ticks <= 1 ? 'lexical' : ticks <= 3 ? 'semantic' : ticks <= 4 ? 'refining' : 'locked',
        filesScanned: prev.filesScanned + 24,
        candidates: Math.min(44, prev.candidates + 4),
        embedded: Math.min(40, prev.embedded + 6),
        cacheHits: Math.min(18, prev.cacheHits + 1),
        scanTrail: [...nextResults.slice(0, Math.min(4 + ticks, nextResults.length)).map((item) => item.path)].slice(-4),
      }));

      if (ticks === 2) setStageLabel('Semantic rerank');
      if (ticks === 4) setStageLabel('Refining evidence');
      if (ticks >= 5) {
        setStageLabel('Locked evidence');
        setIsSearching(false);
        if (streamTimerRef.current) {
          window.clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
      }
    }, reducedMotion ? 250 : 185);
  }, [query, reducedMotion]);

  const activeResults = useMemo(() => allResults.slice(0, Math.max(1, visibleCount)), [allResults, visibleCount]);
  const { scrollYProgress } = useScroll();
  const worldScale = useTransform(scrollYProgress, [0, 0.08, 0.16, 1], [1.0, 1.14, 2.75, 2.35]);
  const worldWidth = useTransform(scrollYProgress, [0, 0.1, 0.18], ['94vw', '128vw', '230vw']);
  const worldY = useTransform(scrollYProgress, [0, 0.08, 0.2, 1], [48, -40, -116, -158]);
  const worldRotateX = useTransform(scrollYProgress, [0, 0.14, 0.2], ['-4deg', '8deg', '0deg']);
  const worldRotateY = useTransform(scrollYProgress, [0, 0.18, 0.26], ['9deg', '0deg', '-2deg']);
  const worldOpacity = useTransform(scrollYProgress, [0, 0.16, 0.95], [0.98, 1, 0.94]);
  const ambientOpacity = useTransform(scrollYProgress, [0, 0.08, 0.16], [1, 0.45, 0.03]);
  const worldBleedOpacity = useTransform(scrollYProgress, [0.06, 0.12, 0.2], [0, 0.75, 1]);

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (value > 0.12 && !enteredWorldRef.current) {
      setEnteredWorld(true);
      triggerFlashZoom();
    }
  });

  const focusLens = useCallback((lens: LensItem, index: number) => {
    const previous = lastLensIndexRef.current;
    const dir: 1 | -1 = previous <= index ? 1 : -1;
    lastLensIndexRef.current = index;

    setEnteredWorld(true);
    setView(lens.view);
    const seededPipeline = lensPipelineSeed(index);
    setPipeline(seededPipeline);
    setCameraPose(LENS_CAMERA_POSE[lens.id] ?? BASE_CAMERA_POSE);

    if (!reducedMotion) {
      setLensWhip({ key: Date.now(), dir });
      if (whipTimerRef.current) {
        window.clearTimeout(whipTimerRef.current);
      }
      whipTimerRef.current = window.setTimeout(() => {
        setLensWhip(null);
        whipTimerRef.current = null;
      }, 420);
    }

    if (lens.view === 'search') {
      const queryByLens: Record<string, string> = {
        'speed-stream': 'where is the deployment checklist?',
        'model-control': 'show ask mode behavior',
        'evidence-actions': 'financial report variance rationale',
        'session-flow': 'restore starred recent context',
        'trust-controls': 'entitlement compliance diagnostics',
        'cli-lens': 'ixos doctor cache stats commands',
      };
      const nextQuery = queryByLens[lens.id] ?? query;
      const nextResults = buildResults(nextQuery);
      setQuery(nextQuery);
      setAllResults(nextResults);
      setSelectedIndex(Math.min(index % 3, Math.max(0, nextResults.length - 1)));
      setVisibleCount(lens.id === 'speed-stream' ? Math.min(4, nextResults.length) : Math.min(8, nextResults.length));
      setStageLabel(
        lens.id === 'speed-stream'
          ? 'Lexical scan'
          : lens.id === 'evidence-actions'
            ? 'Refining evidence'
            : lens.id === 'cli-lens'
              ? 'CLI parity'
              : 'Semantic rerank'
      );
      setPipeline({
        ...seededPipeline,
        scanTrail: nextResults.slice(0, 4).map((item) => item.path),
      });
      setIsSearching(lens.id === 'speed-stream');
    }

    if (lens.id === 'speed-stream' || lens.id === 'evidence-actions' || lens.id === 'workstreams-lens') {
      triggerFlashZoom();
    }

    if (lens.id === 'workstreams-lens') {
      setCurrentWorkstreamId(WORKSTREAM_ROWS[1]?.id ?? WORKSTREAM_ROWS[0]?.id);
      setStageLabel('Workstream clustering');
      setIsSearching(false);
    }

    if (lens.id === 'today-lens') {
      setIsSearching(false);
      setStageLabel('Today context');
    }
  }, [query, reducedMotion, triggerFlashZoom]);

  const activeLensItem = activeLens >= 0 ? LENSES[activeLens] : LENSES[0];

  return (
    <main data-theme="landing" className="relative min-h-screen overflow-x-clip bg-graphite-0 text-porcelain">
      <motion.div style={{ opacity: ambientOpacity }}>
        <AmbientIxosField reducedMotion={Boolean(reducedMotion)} energy="dynamic" />
      </motion.div>

      {!reducedMotion && (
        <>
          <motion.div
            className="pointer-events-none fixed inset-0 z-[6]"
            style={{
              background:
                'radial-gradient(44% 36% at 26% 24%, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 72%)',
              mixBlendMode: 'screen',
            }}
            animate={{ x: [-24, 22, -24], y: [0, -18, 0], opacity: [0.52, 0.74, 0.52] }}
            transition={{ duration: 14, ease: 'easeInOut', repeat: Infinity }}
          />
          <motion.div
            className="pointer-events-none fixed inset-0 z-[6]"
            style={{
              background:
                'radial-gradient(38% 32% at 76% 68%, rgba(246,185,76,0.12) 0%, rgba(246,185,76,0) 70%)',
              mixBlendMode: 'screen',
            }}
            animate={{ x: [18, -20, 18], y: [10, -8, 10], opacity: [0.42, 0.62, 0.42] }}
            transition={{ duration: 16, ease: 'easeInOut', repeat: Infinity }}
          />
        </>
      )}

      <motion.div
        className="pointer-events-none fixed inset-0 z-[20] bg-[radial-gradient(120%_95%_at_50%_58%,rgba(8,11,15,0.88)_0%,rgba(8,11,15,0.96)_58%,rgba(8,11,15,1)_100%)]"
        style={{ opacity: worldBleedOpacity }}
      />

      {booting && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-graphite-0/94 backdrop-blur-sm">
          <PixelRingLoader />
        </div>
      )}

      <AnimatePresence>
        {flashZoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 1, 0.3, 1] }}
            className="pointer-events-none fixed inset-0 z-[62]"
            style={{
              background:
                'radial-gradient(circle at 50% 48%, rgba(20,184,166,0.3) 0%, rgba(20,184,166,0.1) 28%, rgba(8,11,15,0) 56%), linear-gradient(180deg, rgba(243,245,247,0.18), rgba(243,245,247,0))',
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lensWhip && (
          <motion.div
            key={lensWhip.key}
            initial={{ opacity: 0, x: `${lensWhip.dir * 22}%`, rotate: lensWhip.dir * 3 }}
            animate={{ opacity: [0, 0.28, 0], x: `${lensWhip.dir * -20}%`, rotate: lensWhip.dir * -2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.2, 1, 0.3, 1] }}
            className="pointer-events-none fixed inset-0 z-[61]"
            style={{
              background:
                lensWhip.dir > 0
                  ? 'linear-gradient(112deg, rgba(20,184,166,0) 20%, rgba(20,184,166,0.24) 44%, rgba(20,184,166,0) 70%)'
                  : 'linear-gradient(68deg, rgba(20,184,166,0) 24%, rgba(20,184,166,0.24) 50%, rgba(20,184,166,0) 76%)',
            }}
          />
        )}
      </AnimatePresence>

      <div className={`pointer-events-none fixed inset-0 z-[24] flex items-center justify-center ${enteredWorld ? 'px-0 py-0' : 'px-4 py-8 sm:px-8'}`}>
        <motion.div
          layoutId="app-world-shell"
          onAnimationEnd={() => setEntryAnimating(false)}
          style={{
            scale: worldScale,
            width: worldWidth,
            y: worldY,
            rotateX: worldRotateX,
            rotateY: worldRotateY,
            opacity: worldOpacity,
            transformPerspective: 2100,
            pointerEvents: 'auto',
            filter: enteredWorld ? 'saturate(0.96) brightness(0.9)' : 'saturate(1) brightness(1)',
          }}
          className={entryAnimating && !reducedMotion ? 'ixos-woosh-entry' : undefined}
        >
          <motion.div
            className="relative"
            animate={reducedMotion ? BASE_CAMERA_POSE : cameraPose}
            transition={reducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 96, damping: 20, mass: 0.86 }}
            style={{ transformPerspective: 2200 }}
          >
            <AppWorldSurface
              className={enteredWorld ? 'ixos-world-cinematic' : undefined}
              view={view}
              onViewChange={setView}
              title="Ixos App-World"
              subtitle="Desktop shell mirrored on landing"
              search={{
                query,
                directoryLabel: 'C:\\Users\\pablo\\Downloads\\Ixos',
                onQueryChange: setQuery,
                onSubmit: () => runStream(query),
                presets: [
                  'where is the release checklist?',
                  'show ask mode behavior',
                  'workstream clustering flow',
                  'cli cache audit commands',
                ],
                onPresetSelect: (preset) => runStream(preset),
                mode,
                onModeChange: setMode,
                stageLabel,
                isSearching,
                results: activeResults,
                selectedIndex,
                onSelectResult: setSelectedIndex,
                onOpenResult: setSelectedIndex,
                onRevealResult: setSelectedIndex,
                allowResultsScroll: false,
                showInlineRunButton: true,
                hideSearchChrome: true,
                resultLimit: 8,
                pipelineStats: pipeline,
                sourcePath: 'source: src-tauri/src/commands/search.rs',
              }}
              today={{
                dateLabel: new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                }),
                signals: TODAY_SIGNALS,
                resumeRows: TODAY_RESUME,
                recentRows: TODAY_RECENT,
                suggestedRows: TODAY_SUGGESTED,
                sourcePath: 'source: ui/src/components/today/TodayTab.tsx',
              }}
              workstreams={{
                rows: WORKSTREAM_ROWS,
                selectedId: currentWorkstreamId,
                onSelectRow: setCurrentWorkstreamId,
                summary: WORKSTREAM_SUMMARY,
                sourcePath: 'source: ui/src/components/workstreams/WorkstreamsList.tsx',
              }}
            />

            <AnimatePresence mode="wait">
              <InWorldLensOverlay
                key={activeLensItem.id}
                lens={activeLensItem}
                index={Math.max(activeLens, 0)}
                onRunDemo={() => runStream(query)}
                onModeChange={setMode}
              />
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      <section id="hero" className="relative z-[36] flex min-h-screen items-end px-4 pb-16 pt-24 sm:px-8 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: booting ? 0 : 1, y: booting ? 26 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl rounded-2xl border border-white/18 bg-graphite-1/88 p-6 backdrop-blur-md"
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-fg-ghost">Ixos /4 App-World</p>
          <h1 className="mt-2 text-4xl font-semibold leading-[1.03] text-porcelain sm:text-5xl">
            Speed you can feel,
            <br />
            accuracy you can trust.
          </h1>
          <p className="mt-3 text-sm text-fg-secondary">
            One living app surface. Scroll through real product states with source-backed claims.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runStream('where is the deployment checklist?')}
              className="rounded-md border border-accent-teal/35 bg-accent-teal/18 px-4 py-2 text-xs font-semibold text-accent-teal"
            >
              Start Interactive Demo
            </button>
            <Link href="/download" className="rounded-md border border-white/20 px-4 py-2 text-xs font-semibold text-fg-secondary hover:text-porcelain">
              Download Desktop
            </Link>
            <Link href="/docs/cli-reference" className="rounded-md border border-white/20 px-4 py-2 text-xs font-semibold text-fg-secondary hover:text-porcelain">
              CLI Docs
            </Link>
          </div>
        </motion.div>
      </section>

      <div className="relative z-[36] pb-24">
        {LENSES.map((lens, index) => (
          <LensAnchor
            key={lens.id}
            lens={lens}
            index={index}
            onActive={setActiveLens}
            onFocusLens={focusLens}
          />
        ))}
      </div>

      <footer className="relative z-[36] border-t border-white/10 px-4 py-8 text-xs text-fg-dim sm:px-8 lg:px-16">
        <p>All claims are source-mapped in each lens. No fabricated benchmarks or synthetic comparisons.</p>
      </footer>

      <style jsx global>{`
        .ixos-world.ixos-world-cinematic {
          border-radius: 0;
          border-color: rgba(243, 245, 247, 0.06);
          box-shadow: 0 0 0 1px rgba(243, 245, 247, 0.02) inset;
        }

        .ixos-woosh-entry {
          offset-position: 50% 50%;
          offset-anchor: 50% 50%;
          offset-path: path('M -960 -560 C -720 -520 -260 -190 0 0');
          offset-rotate: 0deg;
          animation: ixosWooshPath 1.16s cubic-bezier(0.2, 0.94, 0.22, 1) forwards;
          will-change: transform, filter, opacity, offset-distance;
        }

        @keyframes ixosWooshPath {
          0% {
            opacity: 0;
            offset-distance: 0%;
            transform: perspective(2100px) rotateY(-18deg) rotateZ(5deg) scale(0.92);
            filter: blur(7px) saturate(0.86);
          }
          74% {
            opacity: 1;
            offset-distance: 93%;
            transform: perspective(2100px) rotateY(5deg) rotateZ(-1.5deg) scale(1.035);
            filter: blur(1px) saturate(1.05);
          }
          100% {
            opacity: 1;
            offset-distance: 100%;
            transform: perspective(2100px) rotateY(0deg) rotateZ(0deg) scale(1);
            filter: blur(0px) saturate(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ixos-woosh-entry {
            animation: none;
            offset-path: none;
            filter: none;
          }
        }
      `}</style>
    </main>
  );
}
