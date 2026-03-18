/**
 * Hardcoded demo data for the Ixos hero film.
 * Every render must produce identical output — no randomization.
 */

// ── Scene 1: Generic frustration ────────────────────────────────────────────
export const SCENE1_QUERY = "that doc about token refresh...";

export const SCENE1_FILES = [
  "README.md",
  "config.yml",
  "auth_v2_FINAL.md",
  "notes_march.md",
  "session_tokens_old.bak",
  "draft_2024.md",
  "misc_notes.txt",
];

// ── Scene 2: Ixos search query ──────────────────────────────────────────────
export const IXOS_QUERY = "that doc about token refresh";

export const PIPELINE_STAGES = ["Scan", "Embed", "Rank"] as const;

// ── Scene 3: Search results ─────────────────────────────────────────────────
export interface DemoResult {
  filename: string;
  directory: string;
  score: number;
  snippet: string;
  extension: string;
  modifiedAt: string;
  isBestMatch: boolean;
}

export const DEMO_RESULTS: DemoResult[] = [
  {
    filename: "auth_api_reference.md",
    directory: "Projects/ixos/docs",
    score: 0.94,
    snippet:
      "Use JWT tokens for API authentication. Include token in Authorization header...",
    extension: "md",
    modifiedAt: "2 days ago",
    isBestMatch: true,
  },
  {
    filename: "team_standup_notes.md",
    directory: "Notes/Work",
    score: 0.81,
    snippet:
      "Sprint progress: 70% complete. Blockers: Waiting on design review...",
    extension: "md",
    modifiedAt: "1 day ago",
    isBestMatch: false,
  },
  {
    filename: "ci_pipeline.yml",
    directory: "Projects/ixos/.github/workflows",
    score: 0.68,
    snippet:
      "name: CI — on: [push, pull_request] — jobs: build: runs-on: ubuntu-latest...",
    extension: "yml",
    modifiedAt: "1 week ago",
    isBestMatch: false,
  },
];

// ── Scene 3: Evidence / score breakdown ─────────────────────────────────────
export interface ScoreSignal {
  label: string;
  icon: "brain" | "shield" | "clock" | "activity";
  color: string;
  percentage: number;
}

export const SCORE_SIGNALS: ScoreSignal[] = [
  { label: "Semantic", icon: "brain", color: "#14B8A6", percentage: 62 },
  { label: "Integrity", icon: "shield", color: "#10B981", percentage: 20 },
  { label: "Temporal", icon: "clock", color: "#F6B94C", percentage: 12 },
  { label: "Behavior", icon: "activity", color: "#7C5CFF", percentage: 6 },
];

// ── Scene 4: Trust blocks ───────────────────────────────────────────────────
export interface TrustItem {
  icon: "shield" | "lock" | "eye";
  title: string;
  subtitle: string;
}

export const TRUST_ITEMS: TrustItem[] = [
  {
    icon: "shield",
    title: "Runs on your device",
    subtitle: "No cloud index. No API keys.",
  },
  {
    icon: "lock",
    title: "Zero telemetry",
    subtitle: "Nothing phoned home. Ever.",
  },
  {
    icon: "eye",
    title: "Ephemeral mode",
    subtitle: "Search leaves no trace on disk.",
  },
];

// ── Scene 5: Mode labels ────────────────────────────────────────────────────
export const QUALITY_MODES = [
  { label: "Flash", color: "#F6B94C" },
  { label: "Auto", color: "#14B8A6" },
  { label: "Pro", color: "#7C5CFF" },
] as const;

export const CLI_OUTPUT = `$ ixos search "token refresh" --json
{
  "results": [
    {
      "file": "auth_api_reference.md",
      "score": 0.94,
      "signal": "semantic"
    }
  ],
  "elapsed_ms": 127
}`;

// ── Scene 6: Closing ────────────────────────────────────────────────────────
export const TAGLINE = "Search what you remember.";
export const CTA = "Download free at ixos.dev";
