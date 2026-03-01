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

// ─── Deterministic Scoring ───────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function computeScores(
  query: string,
  path: string,
  snippet: string,
  mode: SearchMode
) {
  const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const pathTokens = path.toLowerCase().split(/[\/\-_.]+/).filter(Boolean);
  const snippetTokens = snippet.toLowerCase().split(/[\s()_.,;:{}\[\]]+/).filter(Boolean);

  let lexMatches = 0;
  for (const qt of queryTokens) {
    if (pathTokens.includes(qt) || snippetTokens.includes(qt)) {
      lexMatches++;
    }
  }

  const baseLex = queryTokens.length ? lexMatches / queryTokens.length : 0.1;
  const lexicalScore = Math.min(0.99, baseLex + pseudoRandom(hashString(query + path + "lex")) * 0.3);

  const seed = hashString(query + path + "sem");
  const baseSem = pseudoRandom(seed);
  // Semantic score should feel related to the query's conceptual depth, but here it's purely deterministic
  const semanticScore = 0.5 + baseSem * 0.45;

  let finalScore = 0;
  if (mode === "flash") {
    // Flash relies heavily on lexical speed
    finalScore = lexicalScore * 0.8 + semanticScore * 0.2;
  } else if (mode === "pro") {
    // Pro uses deep semantic + boosts
    finalScore = lexicalScore * 0.3 + semanticScore * 0.7;
  } else {
    // Auto balances
    finalScore = lexicalScore * 0.5 + semanticScore * 0.5;
  }

  return {
    lexicalScore: Number(lexicalScore.toFixed(3)),
    semanticScore: Number(semanticScore.toFixed(3)),
    finalScore: Number(finalScore.toFixed(3)),
  };
}

// ─── Stub Data ────────────────────────────────────────────────────────────────

const BASE_RESULTS: Omit<IxosSearchResult, "score" | "id">[] = [
  {
    title: "middleware/jwt.ts",
    path: "src/middleware/jwt.ts",
    matchedLineNumber: 42,
    snippet:
      "export function refreshToken(token: string): Promise<TokenPair> {\n  const decoded = verify(token, process.env.JWT_SECRET);\n  return generatePair(decoded.sub);\n}",
    rationale: "Direct match: token refresh function with JWT verification pattern at line 42.",
  },
  {
    title: "auth/token-manager.ts",
    path: "src/auth/token-manager.ts",
    matchedLineNumber: 15,
    snippet:
      "class TokenManager {\n  async rotate(userId: string): Promise<void> {\n    const current = await this.store.get(userId);\n    await this.invalidate(current);\n  }",
    rationale: "Semantic match: token rotation logic with invalidation and re-issuance.",
  },
  {
    title: "config/auth.config.ts",
    path: "src/config/auth.config.ts",
    matchedLineNumber: 8,
    snippet:
      "export const authConfig = {\n  tokenExpiry: 3600,\n  refreshExpiry: 86400,\n  algorithm: 'RS256',\n};",
    rationale: "Configuration match: token expiry and algorithm settings.",
  },
  {
    title: "tests/auth.test.ts",
    path: "src/tests/auth.test.ts",
    matchedLineNumber: 112,
    snippet:
      "it('should refresh expired tokens', async () => {\n  const expired = generateExpiredToken();\n  const result = await refreshToken(expired);\n  expect(result.accessToken).toBeDefined();\n});",
    rationale: "Test coverage: expired token refresh scenario with assertion.",
  },
  {
    title: "api/auth/refresh.ts",
    path: "src/api/auth/refresh.ts",
    matchedLineNumber: 22,
    snippet:
      "export async function POST(req: Request) {\n  const { refreshToken } = await req.json();\n  return Response.json(await tokenService.refresh(refreshToken));\n}",
    rationale: "API endpoint: POST handler for token refresh with response formatting.",
  },
  {
    title: "hooks/useAuth.ts",
    path: "src/hooks/useAuth.ts",
    matchedLineNumber: 64,
    snippet:
      "const { data: session } = useSession();\nuseEffect(() => {\n  if (isExpired(session?.token)) scheduleRefresh();\n}, [session]);",
    rationale: "React hook: token expiry detection with scheduled refresh side effect.",
  },
  {
    title: "auth/refresh-flow.ts",
    path: "src/auth/refresh-flow.ts",
    matchedLineNumber: 12,
    snippet:
      "export const REFRESH_FLOW = [\n  'validate_signature',\n  'check_blacklist',\n  'generate_new_pair',\n  'invalidate_old',\n];",
    rationale: "Supporting evidence: The refresh flow is a 4-step process with blacklist checking.",
  }
];

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
    detail: "Left off at token-manager.ts. Next: implement rotation cleanup.",
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
    detail: "Migration 003_add_refresh_tokens.sql ready for review.",
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
    detail: "JWT refresh, token rotation, blacklist management. 3 PRs open.",
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
    mode: SearchMode,
    onEvent: (e: SearchStreamEvent) => void
  ): Promise<void> {
    this._cancelled = false;

    // Filter and score results dynamically
    let results: IxosSearchResult[] = BASE_RESULTS.map((base) => {
      const scores = computeScores(query, base.path, base.snippet, mode);
      return {
        ...base,
        id: `result-${base.path}`,
        score: scores.finalScore,
        lexicalScore: scores.lexicalScore,
        semanticScore: scores.semanticScore,
        boostScore: mode === "pro" ? 0.05 : 0, // simple deterministic boost
      };
    });

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    // Filter out completely irrelevant stuff
    results = results.filter(r => r.score > 0.1);

    const delay = (ms: number) =>
      new Promise<void>((res) => setTimeout(res, ms));

    // Phase 1 — Scanning
    onEvent({ type: "progress", progress: buildProgress("scan", 0, 0, 0, 0, 0) });
    for (let i = 0; i <= 312; i += 52) {
      if (this._cancelled) return;
      await delay(40);
      onEvent({ type: "progress", progress: buildProgress("scan", i, 0, 0, 0, i * 1.2) });
    }
    
    await delay(100);

    // Phase 2 — Lexical
    onEvent({ type: "progress", progress: buildProgress("lexical", 312, 24, 0, 0, 340) });
    const lexicalResults = results.slice(0, Math.floor(results.length / 2));
    for (let i = 0; i < lexicalResults.length; i++) {
      if (this._cancelled) return;
      // "first results appear in 200–800ms, then one new result every 120–300ms"
      // the first result here will appear after the scan time (~240ms + 100ms = 340ms)
      await delay(150 + pseudoRandom(i) * 100); 
      onEvent({ type: "result", result: lexicalResults[i] });
    }

    // Phase 3 — Semantic
    onEvent({ type: "progress", progress: buildProgress("semantic", 312, 47, 0, 0, 500) });
    for (let i = 0; i <= 47; i += 8) {
      if (this._cancelled) return;
      await delay(60);
      onEvent({
        type: "progress",
        progress: buildProgress("semantic", 312, 47, i, Math.floor(i * 0.6), 500 + i * 8),
      });
    }

    const semanticResults = results.slice(Math.floor(results.length / 2));
    for (let i = 0; i < semanticResults.length; i++) {
      if (this._cancelled) return;
      await delay(150 + pseudoRandom(i + 10) * 100);
      onEvent({ type: "result", result: semanticResults[i] });
    }

    await delay(100);
    if (this._cancelled) return;

    // Phase 4 — Refining / Locked
    onEvent({
      type: "progress",
      progress: buildProgress("refine", 312, 47, 47, 28, 790),
    });
    await delay(200);
    onEvent({
      type: "progress",
      progress: buildProgress("locked", 312, 47, 47, 28, 990),
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

export function createDemoAdapter(): AppAdapter {
  return {
    search: new DemoSearchAdapter(),
    today: new DemoTodayAdapter(),
    workstreams: new DemoWorkstreamsAdapter(),
  };
}

let _singleton: AppAdapter | null = null;
export function getDemoAdapter(): AppAdapter {
  if (!_singleton) _singleton = createDemoAdapter();
  return _singleton;
}
