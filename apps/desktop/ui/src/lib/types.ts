export type Profile = "code" | "documents";
export type SearchPhase =
  | "idle"
  | "discover"
  | "lexical"
  | "semantic"
  | "complete"
  | "cancelled"
  | "error";
export interface SearchResult {
  path: string;
  filename: string;
  score: number;
  snippet?: { text: string; start_line: number; end_line: number };
}
export interface Config {
  search: {
    locations: string[];
    profile: Profile;
    limit: number;
    context: number;
    cache: boolean;
    model_dir: string;
  };
  quitOnClose: boolean;
}
export interface LocationStatus {
  directory: string;
  fileCount: number;
  skippedFiles: number;
  sourceBytes: number;
  budgetBytes: number;
  stage: "discover" | "lexical" | "semantic" | "ready" | "error";
  error?: string;
}
export interface ModelStatus {
  profile: Profile;
  installed: boolean;
  downloading: boolean;
  error: string | null;
}
export interface DoctorReport {
  profile: Profile;
  dimensions: number;
  cacheWritable: boolean;
  searchWorks: boolean;
}
export interface ShortcutConfig {
  modifiers: string[];
  key: string;
}
export interface RecentSearch {
  query: string;
  directory: string | null;
  timestamp: number;
}
export interface SearchStats {
  discoveredFiles: number;
  searchableFiles: number;
  skippedFiles: number;
  passagesEmbedded: number;
  memoryCacheHits: number;
  nativeCacheHits: number;
  applicationCacheHits: number;
  lexicalCandidates: number;
  semanticCandidates: number;
}
export type SearchEvent =
  | { type: "phase"; stage: "discover" | "semantic" }
  | {
      type: "lexicalResults" | "semanticResults";
      results: SearchResult[];
      stats: SearchStats;
    }
  | { type: "warning"; message: string }
  | { type: "complete" };
