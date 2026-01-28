/**
 * Search phase state
 */
export type SearchPhase = 'idle' | 'lexical' | 'semantic' | 'refining' | 'complete' | 'error' | 'cancelled';

/**
 * Search event from backend
 */
export type SearchEvent =
  | { type: 'lexicalResults'; results: LexicalResult[]; count: number }
  | { type: 'lexicalBatch'; results: LexicalResult[]; count: number; batchNumber: number; isFinal: boolean }
  | { type: 'status'; message: string }
  | { type: 'semanticResults'; results: RankedResult[]; count: number }
  | { type: 'lateResult'; result: RankedResult; discoveryTimeMs: number }
  | { type: 'streamUpdate'; stage: StreamStage; stats: StreamStats; events: StreamEvent[] }
  | { type: 'complete' }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

export type StreamStage = 'echo' | 'lexical' | 'semantic' | 'refining' | 'tail';

export type StreamEventKind = 'lexical' | 'semantic' | 'scan';

export interface StreamStats {
  filesScanned: number;
  candidates: number;
  embedded: number;
  cacheHits: number;
}

export interface StreamEvent {
  id: string;
  kind: StreamEventKind;
  score: number;
  slotIndex: number;
  path?: string;
}

/**
 * Lexical search result (quick, keyword-based)
 */
export interface LexicalResult {
  path: string;
  filename: string;
  directory: string;
  score: number;
  snippet: string;
  termMatches: number;
  totalTerms: number;
}

/**
 * Alias for LexicalResult for consistency
 */
export type LexicalMatch = LexicalResult;

/**
 * Ranked search result (final, with integrity verification)
 */
export interface RankedResult {
  path: string;
  filename: string;
  directory: string;
  score: number;
  integrityVerified: boolean;
  scoreBreakdown: ScoreBreakdown;
  context: ContextSnippet | null;
  evidence?: Evidence | null;
  /** File size in bytes */
  fileSize?: number;
  /** File modification time as Unix timestamp (seconds since epoch) */
  modifiedAt?: number;
  /** File extension (without the dot) */
  fileExtension?: string;
}

/**
 * Score breakdown showing individual components
 */
export interface ScoreBreakdown {
  semantic: number;
  integrity: number;
  temporal: number;
  behavior: number;
}

/**
 * Context snippet showing match location
 */
export interface ContextSnippet {
  lineNumber: number;
  before: string[];
  matched: string[];
  after: string[];
}

export interface TagObject {
  tagType: string;
  label: string;
  tooltip?: string;
  strength?: number;
  color?: string;
}

export type EvidenceTag = string | TagObject;

export interface Evidence {
  tags: EvidenceTag[];
  explanation?: string | null;
  lexicalHitCount?: number | null;
  matchedTerms: string[];
  semanticPassage?: string | null;
  pathTags: string[];
  fileType?: string | null;
}

/**
 * Search options
 */
export interface SearchOptions {
  limit?: number;
  secureRanking?: boolean;
  contextLines?: number;
  cacheMode?: 'jit' | 'cache';
  journalistMode?: boolean;
  secureTiming?: boolean;
  modelType?: ModelType;
  proModelType?: ModelType;
  searchMode?: SearchMode;
  timeoutSeconds?: number;
}

/**
 * Application configuration
 */
export interface IxosConfig {
  search: SearchConfig;
  output: OutputConfig;
  security: SecurityConfig;
}

/**
 * P1.3: Model type for embedding selection
 */
export type ModelType =
  | 'potion'
  | 'qwen'
  | 'ixos-flash-v2'
  | 'ixos-flash-v4-int8-512'
  | 'ixos-flash-v4-int8-192'
  | 'ixos-pro-v1';

export type SearchMode = 'flash' | 'pro' | 'auto';

export interface SearchConfig {
  defaultLimit: number;
  defaultDirectory: string | null;
  timeoutSeconds: number;
  enableSecureRanking: boolean;
  progressiveByDefault: boolean;
  cacheMode: string;
  modelType: ModelType;
  proModelType: ModelType;
  searchMode: SearchMode;
  useStubModel: boolean;
  secureTiming: boolean;
  contextLines: number;
  minScoreThreshold: number;
}

export interface OutputConfig {
  defaultFormat: string;
  color: boolean;
  showScores: boolean;
  exitOnClose: boolean;
}

export interface SecurityConfig {
  sandboxEnabled: boolean;
  sandboxDirectories: string[];
  verifyIntegrity: boolean;
  telemetryOptIn: boolean;
}

/**
 * Consent status
 */
export interface ConsentStatus {
  hasConsent: boolean;
  consentType: string;
  grantedAt: string | null;
}

/**
 * Keyboard shortcut configuration
 */
export interface ShortcutConfig {
  modifiers: string[];
  key: string;
}

