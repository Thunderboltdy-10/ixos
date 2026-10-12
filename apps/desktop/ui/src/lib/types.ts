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
  personal?: number;
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

export interface ModelStatus {
  ixosFlashV2Available: boolean;
  ixosFlashV2Path: string | null;
  ixosProV2Available: boolean;
  ixosProV2Path: string | null;
  ixosFlashV1Available: boolean;
  ixosFlashV1Path: string | null;
  ixosProV1Available: boolean;
  ixosProV1Path: string | null;
  anyAvailable: boolean;
  recommended: string | null;
  loadedModel: string | null;
}

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
  cacheMode?: 'native-cache' | 'ephemeral' | 'local' | 'memory';
  deepSearch?: boolean;
  secureTiming?: boolean;
  modelType?: ModelType;
  proModelType?: ModelType;
  searchMode?: SearchMode;
  isAskMode?: 'off' | 'auto' | 'on';
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
  | 'ixos-flash-v1'
  | 'ixos-flash-v2'
  | 'ixos-flash-v4-int8-512'
  | 'ixos-flash-v4-int8-192'
  | 'ixos-pro-v1'
  | 'ixos-pro-v2';

export type SearchMode = 'flash' | 'pro' | 'auto';

export type AskMode = 'off' | 'auto' | 'always';

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
  askMode: AskMode;
  personalRankingEnabled?: boolean;
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


export type DoctorStatus = 'PASS' | 'WARN' | 'FAIL' | 'INFO';

export interface DoctorCheck {
  id: string;
  name: string;
  status: DoctorStatus;
  message: string;
  details?: string | null;
}

export interface DoctorSummary {
  pass: number;
  warn: number;
  fail: number;
  info: number;
}

export interface DoctorReport {
  generatedAtUnixS: number;
  checks: DoctorCheck[];
  summary: DoctorSummary;
}

export interface PersonalSignals {
  openScore: number;
  lastOpenTs: number;
  pinned: boolean;
  ignored: boolean;
}

// ============================================================================
// Phase 2: Second Brain Types
// ============================================================================

/**
 * Activity action types
 */
export type ActivityAction =
  | 'search_query'
  | 'result_shown'
  | 'result_clicked'
  | 'file_opened'
  | 'file_revealed'
  | 'file_modified'
  | 'file_moved'
  | 'file_renamed'
  | 'file_pinned'
  | 'file_unpinned';

/**
 * Activity event from the ledger
 */
export interface ActivityEvent {
  id: string;
  fileId: string;
  filePath: string;
  timestamp: number;
  actionType: ActivityAction;
  queryHash?: string | null;
  workstreamId?: string | null;
}

/**
 * Time range for activity queries
 */
export interface TimeRange {
  start?: number;
  end?: number;
}

/**
 * Co-occurrence data for related files
 */
export interface CoOccurrence {
  fileId: string;
  /** File path resolved from file_id - populated by backend for UI display */
  filePath: string | null;
  count: number;
  lastSeen: number;
  avgGapMs: number;
  reason: 'co_open' | 'co_edit' | 'frequent';
}

/**
 * Recently touched file
 */
export interface RecentFile {
  path: string;
  fileId: string;
  lastTouched: number;
  touchCount: number;
  actions: ActivityAction[];
}

/**
 * Ranked file candidate for resuming work.
 */
export interface ResumeCandidate extends RecentFile {
  score: number;
  reasons: string[];
}

/**
 * Activity statistics
 */
export interface ActivityStats {
  eventCount: number;
  isDirty: boolean;
}

/**
 * Pro recommendation for moving a file to a better-matching folder.
 */
export interface MoveRecommendation {
  filePath: string;
  currentFolder: string;
  suggestedFolder: string;
  confidence: number;
  evidenceCount: number;
  reason: string;
}

/**
 * Workstream (auto-clustered or manual session)
 */
export interface Workstream {
  id: string;
  name: string;
  createdAt: number;
  lastActive: number;
  topFolders: [string, number][];
  topFiles: [string, number][];
  topQueries: [string, number][];
  eventCount: number;
  isAuto: boolean;
  description?: string | null;
  isPinned: boolean;
  durationMs: number;
}

/**
 * Workstreams statistics
 */
export interface WorkstreamsStats {
  totalCount: number;
  pinnedCount: number;
  autoCount: number;
  isDirty: boolean;
}

/**
 * Combined Today/resumption payload.
 */
export interface ResumptionData {
  recentlyTouched: RecentFile[];
  resumeCandidates: ResumeCandidate[];
  suggestedNext: SuggestedFile[];
}

/**
 * Workstream graph node.
 */
export interface WorkstreamGraphNode {
  id: string;
  name: string;
  lastActive: number;
  eventCount: number;
  isPinned: boolean;
  isAuto: boolean;
}

/**
 * Workstream graph edge.
 */
export interface WorkstreamGraphEdge {
  sourceId: string;
  targetId: string;
  weight: number;
  sharedFiles: string[];
  sharedFolders: string[];
  sharedQueryCount: number;
  reason: string;
}

/**
 * Workstream relationship graph.
 */
export interface WorkstreamGraph {
  focusWorkstreamId?: string | null;
  nodes: WorkstreamGraphNode[];
  edges: WorkstreamGraphEdge[];
}

/**
 * Detailed workstream payload including graph data.
 */
export interface WorkstreamDetail {
  workstream: Workstream;
  graph: WorkstreamGraph;
}

/**
 * Today Tab data structure
 */
export interface TodayTabData {
  resume: {
    workstream: Workstream | null;
    topFiles: RecentFile[];
    lastActive: number;
  };
  recentlyTouched: RecentFile[];
  suggestedNext: SuggestedFile[];
  moveRecommendations: MoveRecommendation[];
  pinned: PinnedItem[];
}

/**
 * Suggested file based on co-occurrence
 */
export interface SuggestedFile {
  path: string;
  name: string;
  score: number;
  reason: 'co-open' | 'co-edit' | 'frequent';
  coOccurredWith: string;
}

/**
 * Pinned item (file or workstream)
 */
export interface PinnedItem {
  id: string;
  type: 'file' | 'workstream';
  path?: string;
  name: string;
  pinnedAt: number;
}

