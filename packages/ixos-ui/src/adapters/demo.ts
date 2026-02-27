/**
 * Demo adapters — stub implementations for landing page interactive demos.
 * - No network calls
 * - Canned fixtures + scripted progressive streaming
 * - Deterministic interactions
 * - Believable delays via setTimeout
 */

import type {
  SearchAdapter,
  TodayAdapter,
  WorkstreamsAdapter,
  AppAdapter,
  SearchMode,
  SearchStreamEvent,
  SearchProgress,
} from "./types";
import type {
  IxosSearchResult,
  IxosTodayRow,
  IxosTodaySignal,
  IxosWorkstreamRow,
} from "../types";

// ─── Stub Data ────────────────────────────────────────────────────────────────

const DEMO_RESULTS: Record<string, IxosSearchResult[]> = {
  default: [
    {
      id: "result-jwt",
      title: "middleware/jwt.ts",
      path: "src/middleware/jwt.ts",
      score: 0.94,
      snippet:
        "export function refreshToken(token: string): Promise<TokenPair> {\n  const decoded = verify(token, process.env.JWT_SECRET);\n  return generatePair(decoded.sub);\n}",
      rationale:
        "Direct match: token refresh function with JWT verification pattern at line 42.",
    },
    {
      id: "result-auth",
      title: "auth/token-manager.ts",
      path: "src/auth/token-manager.ts",
      score: 0.87,
      snippet:
        "class TokenManager {\n  async rotate(userId: string): Promise<void> {\n    const current = await this.store.get(userId);\n    await this.invalidate(current);\n  }",
      rationale:
        "Semantic match: token rotation logic with invalidation and re-issuance.",
    },
    {
      id: "result-config",
      title: "config/auth.config.ts",
      path: "src/config/auth.config.ts",
      score: 0.81,
      snippet:
        "export const authConfig = {\n  tokenExpiry: 3600,\n  refreshExpiry: 86400,\n  algorithm: 'RS256',\n};",
      rationale:
        "Configuration match: token expiry and algorithm settings.",
    },
    {
      id: "result-test",
      title: "tests/auth.test.ts",
      path: "src/tests/auth.test.ts",
      score: 0.76,
      snippet:
        "it('should refresh expired tokens', async () => {\n  const expired = generateExpiredToken();\n  const result = await refreshToken(expired);\n  expect(result.accessToken).toBeDefined();\n});",
      rationale:
        "Test coverage: expired token refresh scenario with assertion.",
    },
    {
      id: "result-api",
      title: "api/auth/refresh.ts",
      path: "src/api/auth/refresh.ts",
      score: 0.71,
      snippet:
        "export async function POST(req: Request) {\n  const { refreshToken } = await req.json();\n  return Response.json(await tokenService.refresh(refreshToken));\n}",
      rationale:
        "API endpoint: POST handler for token refresh with response formatting.",
    },
    {
      id: "result-hook",
      title: "hooks/useAuth.ts",
      path: "src/hooks/useAuth.ts",
      score: 0.67,
      snippet:
        "const { data: session } = useSession();\nuseEffect(() => {\n  if (isExpired(session?.token)) scheduleRefresh();\n}, [session]);",
      rationale:
        "React hook: token expiry detection with scheduled refresh side effect.",
    },
  ],
  ask: [
    {
      id: "result-ask",
      title: "middleware/jwt.ts",
      path: "src/middleware/jwt.ts",
      score: 0.96,
      snippet:
        "// Token refresh occurs at line 42\nexport function refreshToken(token: string): Promise<TokenPair> {\n  const decoded = verify(token, process.env.JWT_SECRET);\n  return generatePair(decoded.sub);\n}",
      rationale:
        "Primary evidence: refreshToken() is the main entry point for token renewal. Located at src/middleware/jwt.ts:42.",
    },
    {
      id: "result-flow",
      title: "auth/refresh-flow.ts",
      path: "src/auth/refresh-flow.ts",
      score: 0.91,
      snippet:
        "export const REFRESH_FLOW = [\n  'validate_signature',\n  'check_blacklist',\n  'generate_new_pair',\n  'invalidate_old',\n];",
      rationale:
        "Supporting evidence: The refresh flow is a 4-step process with blacklist checking.",
    },
  ],
};

const DEMO_SIGNALS: IxosTodaySignal[] = [
  { label: "Sessions today", value: "4", hint: "2 active, 2 warm" },
  { label: "Files touched", value: "31", hint: "across 3 workstreams" },
  { label: "Searches", value: "18", hint: "12 fast, 6 deep" },
  { label: "Cache efficiency", value: "94%", hint: "embeddings reused" },
];

const DEMO_TODAY_ROWS: IxosTodayRow[] = [
  {
    id: "today-1",
    title: "Auth system refactor",
    meta: "48 min ago · src/auth/ · 12 files",
    detail:
      "Left off at token-manager.ts. Next: implement rotation cleanup.",
  },
  {
    id: "today-2",
    title: "API rate limiting",
    meta: "2 hr ago · src/api/ · 8 files",
    detail: "Added sliding window. Need to test burst scenarios.",
  },
  {
    id: "today-3",
    title: "Database migration v3",
    meta: "Yesterday · db/migrations/ · 4 files",
    detail:
      "Migration 003_add_refresh_tokens.sql ready for review.",
  },
  {
    id: "today-4",
    title: "Frontend search integration",
    meta: "Yesterday · ui/components/ · 7 files",
    detail: "SearchBar connected. Progressive states not yet styled.",
  },
];

const DEMO_WORKSTREAMS: IxosWorkstreamRow[] = [
  {
    id: "ws-1",
    name: "Auth System",
    status: "active",
    files: 23,
    actions: 47,
    lastActive: "48 min ago",
    detail:
      "JWT refresh, token rotation, blacklist management. 3 PRs open.",
  },
  {
    id: "ws-2",
    name: "API Layer",
    status: "active",
    files: 18,
    actions: 31,
    lastActive: "2 hr ago",
    detail: "Rate limiting, CORS, versioning. Targeting v2 release.",
  },
  {
    id: "ws-3",
    name: "Database",
    status: "warm",
    files: 9,
    actions: 14,
    lastActive: "1 day ago",
    detail: "Migration scripts, index optimization, refresh token table.",
  },
  {
    id: "ws-4",
    name: "Frontend",
    status: "warm",
    files: 31,
    actions: 22,
    lastActive: "1 day ago",
    detail: "Search UI, auth flows, component library updates.",
  },
  {
    id: "ws-5",
    name: "Tests",
    status: "cold",
    files: 15,
    actions: 8,
    lastActive: "3 days ago",
    detail: "Unit + integration. Coverage at 71%.",
  },
];

// ─── Progress Stages ──────────────────────────────────────────────────────────

function buildProgress(
  stage: SearchProgress["stage"],
  scanned: number,
  candidates: number,
  embedded: number,
  cacheHits: number,
  ms: number
): SearchProgress {
  return { stage, scanned, candidates, embedded, cacheHits, elapsedMs: ms };
}

// ─── Demo Search Adapter ──────────────────────────────────────────────────────

class DemoSearchAdapter implements SearchAdapter {
  private _cancelled = false;

  async search(
    query: string,
    _mode: SearchMode,
    onEvent: (e: SearchStreamEvent) => void
  ): Promise<void> {
    this._cancelled = false;
    const isAsk = query.toLowerCase().startsWith("how") || query.includes("?");
    const results = isAsk ? DEMO_RESULTS.ask : DEMO_RESULTS.default;

    const delay = (ms: number) =>
      new Promise<void>((res) => setTimeout(res, ms));

    // Phase 1 — Scanning
    onEvent({ type: "progress", progress: buildProgress("scanning", 0, 0, 0, 0, 0) });
    for (let i = 0; i <= 312; i += 52) {
      if (this._cancelled) return;
      await delay(40);
      onEvent({ type: "progress", progress: buildProgress("scanning", i, 0, 0, 0, i * 1.2) });
    }
    onEvent({ type: "progress", progress: buildProgress("scanning", 312, 47, 0, 0, 380) });

    await delay(120);
    if (this._cancelled) return;

    // Phase 2 — Reranking
    onEvent({ type: "progress", progress: buildProgress("reranking", 312, 47, 0, 0, 500) });
    for (let i = 0; i <= 47; i += 8) {
      if (this._cancelled) return;
      await delay(60);
      onEvent({
        type: "progress",
        progress: buildProgress("reranking", 312, 47, i, Math.floor(i * 0.6), 500 + i * 8),
      });
    }

    // Emit results progressively
    for (let i = 0; i < results.length; i++) {
      if (this._cancelled) return;
      await delay(80 + i * 40);
      onEvent({ type: "result", result: results[i] });
    }

    await delay(100);
    if (this._cancelled) return;

    // Phase 3 — Locked
    onEvent({
      type: "progress",
      progress: buildProgress("locked", 312, 47, 47, 28, 790),
    });
    onEvent({ type: "complete" });
  }

  cancel(): void {
    this._cancelled = true;
  }

  getModes(): SearchMode[] {
    return ["flash", "auto", "pro"];
  }
}

// ─── Demo Today Adapter ───────────────────────────────────────────────────────

class DemoTodayAdapter implements TodayAdapter {
  async getSignals(): Promise<IxosTodaySignal[]> {
    return DEMO_SIGNALS;
  }
  async getRows(): Promise<IxosTodayRow[]> {
    return DEMO_TODAY_ROWS;
  }
  async resumeRow(_id: string): Promise<void> {
    // no-op in demo
  }
}

// ─── Demo Workstreams Adapter ─────────────────────────────────────────────────

class DemoWorkstreamsAdapter implements WorkstreamsAdapter {
  async getWorkstreams(): Promise<IxosWorkstreamRow[]> {
    return DEMO_WORKSTREAMS;
  }
  async getDetail(id: string): Promise<IxosWorkstreamRow | null> {
    return DEMO_WORKSTREAMS.find((w) => w.id === id) ?? null;
  }
  async activateWorkstream(_id: string): Promise<void> {
    // no-op in demo
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Create a fresh demo app adapter (safe to instantiate per-component) */
export function createDemoAdapter(): AppAdapter {
  return {
    search: new DemoSearchAdapter(),
    today: new DemoTodayAdapter(),
    workstreams: new DemoWorkstreamsAdapter(),
  };
}

/** Singleton demo adapter for cases where one shared instance is fine */
let _singleton: AppAdapter | null = null;
export function getDemoAdapter(): AppAdapter {
  if (!_singleton) _singleton = createDemoAdapter();
  return _singleton;
}
