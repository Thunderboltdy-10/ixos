/**
 * SECTION_MAP — Single source of truth for all landing page sections.
 * Used by /5 (SearchResultStack), /1 (KineticQueryThread), /2 (PipelineRibbon), /3 (MinimalCalibration).
 * Each section appears once. See FEATURE_INVENTORY.md for feature assignments.
 */

export interface DemoState {
  /** What the app surface shows when this section is active */
  view: "search" | "today" | "workstreams" | "none";
  /** Pre-loaded query text */
  query?: string;
  /** Which stage to show in the pipeline (0=scanning, 1=reranking, 2=locked) */
  stage?: 0 | 1 | 2;
  /** Selected result ID (for evidence panel) */
  selectedResult?: string;
  /** Mode button active */
  mode?: "flash" | "auto" | "pro";
  /** Extra context specific to this section */
  context?: Record<string, unknown>;
}

export interface SectionInteraction {
  /** What the user can do in this section */
  type:
    | "type-query"
    | "toggle-mode"
    | "expand-evidence"
    | "scrub-stages"
    | "switch-tab"
    | "open-panel"
    | "hover-node";
  /** Human-readable description */
  label: string;
}

export interface LandingSection {
  id: string;
  rank: string; // "01" .. "15"
  title: string;
  /** One-line claim — used in section header */
  claim: string;
  /** Feature IDs from FEATURE_INVENTORY.md */
  feature_refs: string[];
  /** Source file path displayed in the result node header */
  source_file: string;
  /** Color tone for this section */
  tone: "cyan" | "amber" | "violet";
  demo_state: DemoState;
  interactions: SectionInteraction[];
  /**
   * Where ripples should originate when this section is active.
   * 'center' = middle of viewport, 'search-box' = top-center (search input),
   * 'left-panel' = left 30%, 'right-panel' = right 70%, 'bottom' = lower third.
   */
  ripple_origin_hint:
    | "center"
    | "search-box"
    | "left-panel"
    | "right-panel"
    | "bottom"
    | "top-left"
    | "top-right";
}

export const SECTION_MAP: LandingSection[] = [
  {
    id: "hero",
    rank: "01",
    title: "live search cockpit",
    claim: "Ixos converges from lexical to semantic to locked evidence — in one query.",
    feature_refs: ["hybrid-search", "progressive-search", "flash-mode", "auto-mode", "pro-mode"],
    source_file: "src/ixos_rank/hybrid_engine.rs",
    tone: "cyan",
    demo_state: {
      view: "search",
      query: "authentication token refresh",
      stage: 2,
      mode: "auto",
      selectedResult: "result-jwt",
    },
    interactions: [
      { type: "type-query", label: "Type your own query" },
      { type: "toggle-mode", label: "Switch Flash / Auto / Pro" },
      { type: "expand-evidence", label: "Open evidence lens" },
    ],
    ripple_origin_hint: "search-box",
  },
  {
    id: "filescan",
    rank: "02",
    title: "filesystem sweep",
    claim: "No daemon. No index. Search starts with a parallel JIT scan — fresh every time.",
    feature_refs: ["jit-scan", "parallel-processing", "rayon"],
    source_file: "src/ixos_rank/lexical_engine.rs",
    tone: "amber",
    demo_state: {
      view: "search",
      query: "config files",
      stage: 0,
      mode: "flash",
    },
    interactions: [
      { type: "toggle-mode", label: "Watch scan speed change" },
    ],
    ripple_origin_hint: "left-panel",
  },
  {
    id: "stats",
    rank: "03",
    title: "performance cluster",
    claim: "7ms file load. <800ms full search. Zero background processes.",
    feature_refs: ["7ms-load", "800ms-search", "parallel-processing"],
    source_file: "CLAUDE.md#benchmarks",
    tone: "amber",
    demo_state: {
      view: "none",
      context: { showCounters: true },
    },
    interactions: [
      { type: "hover-node", label: "Hover metrics for source" },
    ],
    ripple_origin_hint: "center",
  },
  {
    id: "progressive",
    rank: "04",
    title: "progressive lock",
    claim: "Three deterministic stages. Each scroll position resolves to exactly one state.",
    feature_refs: ["progressive-search", "lexical-engine", "semantic-engine"],
    source_file: "src/ixos_rank/progressive.rs",
    tone: "violet",
    demo_state: {
      view: "search",
      query: "token expiry handling",
      stage: 1,
      mode: "auto",
    },
    interactions: [
      { type: "scrub-stages", label: "Scrub through pipeline stages" },
    ],
    ripple_origin_hint: "right-panel",
  },
  {
    id: "pipeline",
    rank: "05",
    title: "pipeline map",
    claim: "Four explicit stages. Labeled sources. No black box.",
    feature_refs: ["lexical-engine", "semantic-engine", "hybrid-engine", "jit-scan"],
    source_file: "src/ixos_rank/hybrid_engine.rs",
    tone: "violet",
    demo_state: {
      view: "search",
      query: "rate limiter implementation",
      stage: 2,
      mode: "auto",
    },
    interactions: [
      { type: "hover-node", label: "Hover pipeline node for detail" },
    ],
    ripple_origin_hint: "center",
  },
  {
    id: "benchmarks",
    rank: "06",
    title: "bench board",
    claim: "Flash: 0.8340 MRR@10, 339ms. Pro: 0.9209 MRR@10, 430ms. From canonical runs.",
    feature_refs: ["flash-mode", "pro-mode", "model2vec"],
    source_file: "models/lab/CANONICAL_RESULTS.md",
    tone: "cyan",
    demo_state: {
      view: "none",
      mode: "pro",
      context: { highlightModel: "pro-fusion" },
    },
    interactions: [
      { type: "toggle-mode", label: "Compare Flash vs Pro" },
    ],
    ripple_origin_hint: "right-panel",
  },
  {
    id: "compute",
    rank: "07",
    title: "compute map",
    claim: "Every query picks its budget. Speed, accuracy, RAM — you control the trade-off.",
    feature_refs: ["flash-mode", "auto-mode", "pro-mode", "system-optimization"],
    source_file: "src/ixos_rank/hybrid_engine.rs#auto",
    tone: "cyan",
    demo_state: {
      view: "search",
      mode: "auto",
      context: { showTriangle: true },
    },
    interactions: [
      { type: "toggle-mode", label: "Shift the compute budget" },
    ],
    ripple_origin_hint: "center",
  },
  {
    id: "comparison",
    rank: "08",
    title: "capability matrix",
    claim: "Desktop vs CLI. What each surface can do — without inflating either.",
    feature_refs: ["json-output", "csv-output", "progressive-search", "today-view", "workstreams", "ask-mode"],
    source_file: "docs/product/DESKTOP_APP.md",
    tone: "cyan",
    demo_state: {
      view: "none",
      context: { activeColumn: "desktop" },
    },
    interactions: [
      { type: "switch-tab", label: "Toggle Desktop / CLI view" },
    ],
    ripple_origin_hint: "top-left",
  },
  {
    id: "techbento",
    rank: "09",
    title: "system internals",
    claim: "HMAC-signed cache. ADS on NTFS. Ed25519 attestation. Inspectable by design.",
    feature_refs: ["hmac-signing", "ads-backend", "xattr-backend", "cache-format", "ed25519-attestation"],
    source_file: "src/storage/validator.rs",
    tone: "cyan",
    demo_state: {
      view: "none",
      context: { expandPanel: "cache" },
    },
    interactions: [
      { type: "open-panel", label: "Inspect cache binary layout" },
    ],
    ripple_origin_hint: "right-panel",
  },
  {
    id: "cli",
    rank: "10",
    title: "terminal commands",
    claim: "Scriptable. JSON/CSV/ripgrep output. Journalist mode. Works anywhere Rust runs.",
    feature_refs: ["json-output", "csv-output", "journalist-mode", "context-display", "progressive-flag"],
    source_file: "CLAUDE.md#cli",
    tone: "amber",
    demo_state: {
      view: "none",
      context: { activeCommand: "journalist" },
    },
    interactions: [
      { type: "switch-tab", label: "Cycle through CLI examples" },
    ],
    ripple_origin_hint: "left-panel",
  },
  {
    id: "ask-mode",
    rank: "11",
    title: "ask pathway",
    claim: "Ask without forcing Pro. Intent detection routes your question to evidence first.",
    feature_refs: ["ask-mode", "intent-detection", "evidence-citations"],
    source_file: "src/ixos_rank/ask_mode/intent_detector.rs",
    tone: "violet",
    demo_state: {
      view: "search",
      query: "How does token refresh work in this codebase?",
      stage: 2,
      mode: "auto",
      selectedResult: "result-ask",
    },
    interactions: [
      { type: "expand-evidence", label: "See evidence trail" },
      { type: "type-query", label: "Ask your own question" },
    ],
    ripple_origin_hint: "search-box",
  },
  {
    id: "local",
    rank: "12",
    title: "local privacy",
    claim: "Computation stays on your device. No telemetry, no egress, no exceptions.",
    feature_refs: ["local-first", "ephemeral-mode", "secure-timing", "journalist-mode", "gdpr-compliance"],
    source_file: "CLAUDE.md#architecture",
    tone: "cyan",
    demo_state: {
      view: "none",
      context: { showPrivacyDiagram: true },
    },
    interactions: [
      { type: "toggle-mode", label: "Toggle Ephemeral mode" },
    ],
    ripple_origin_hint: "center",
  },
  {
    id: "pro-value",
    rank: "13",
    title: "pro loop",
    claim: "Today + Workstreams + Ask. Context that persists, sessions that cluster.",
    feature_refs: ["today-view", "workstreams", "ask-mode", "activity-ledger"],
    source_file: "src/activity_ledger/mod.rs",
    tone: "amber",
    demo_state: {
      view: "today",
      context: { animateLoop: true },
    },
    interactions: [
      { type: "switch-tab", label: "Switch Today / Workstreams / Ask" },
    ],
    ripple_origin_hint: "right-panel",
  },
  {
    id: "pricing",
    rank: "14",
    title: "plan split",
    claim: "Free search, forever. Pro adds context, history, and Ask mode.",
    feature_refs: ["today-view", "workstreams", "ask-mode"],
    source_file: "src/app/pricing/page.tsx",
    tone: "violet",
    demo_state: {
      view: "none",
      context: { highlightPlan: "pro" },
    },
    interactions: [
      { type: "switch-tab", label: "Compare Free vs Pro" },
    ],
    ripple_origin_hint: "bottom",
  },
  {
    id: "cta",
    rank: "15",
    title: "launch deck",
    claim: "Download for macOS, Windows, Linux. Docs included.",
    feature_refs: [],
    source_file: "src/lib/downloads.ts",
    tone: "cyan",
    demo_state: {
      view: "none",
    },
    interactions: [
      { type: "open-panel", label: "Select your platform" },
    ],
    ripple_origin_hint: "bottom",
  },
];

/** Map of section ID → section for fast lookup */
export const SECTION_BY_ID = Object.fromEntries(
  SECTION_MAP.map((s) => [s.id, s])
) as Record<string, LandingSection>;

/** Get ripple coordinates from origin hint + viewport dimensions */
export function getRippleCoords(
  hint: LandingSection["ripple_origin_hint"],
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  switch (hint) {
    case "search-box":
      return { x: viewportWidth / 2, y: viewportHeight * 0.22 };
    case "left-panel":
      return { x: viewportWidth * 0.25, y: viewportHeight * 0.5 };
    case "right-panel":
      return { x: viewportWidth * 0.72, y: viewportHeight * 0.5 };
    case "top-left":
      return { x: viewportWidth * 0.25, y: viewportHeight * 0.28 };
    case "top-right":
      return { x: viewportWidth * 0.75, y: viewportHeight * 0.28 };
    case "bottom":
      return { x: viewportWidth / 2, y: viewportHeight * 0.78 };
    case "center":
    default:
      return { x: viewportWidth / 2, y: viewportHeight / 2 };
  }
}
