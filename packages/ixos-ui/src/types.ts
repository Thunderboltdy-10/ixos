export type IxosView = 'search' | 'today' | 'workstreams';

export interface IxosSearchResult {
  id: string;
  title: string;
  path: string;
  /** Normalized confidence score in [0..1] for UI display */
  score: number;
  /** Optional raw ranking score from backend (can exceed 1.0) */
  rawScore?: number;
  lexicalScore?: number;
  semanticScore?: number;
  boostScore?: number;
  snippet: string;
  matchedLineNumber?: number;
  contextBefore?: string[];
  contextMatch?: string[];
  contextAfter?: string[];
  rationale?: string;
}

export interface IxosTodaySignal {
  label: string;
  value: string;
  hint: string;
}

export interface IxosTodayRow {
  id: string;
  title: string;
  meta: string;
  detail: string;
}

export interface IxosWorkstreamRow {
  id: string;
  name: string;
  status: 'active' | 'warm' | 'cold';
  files: number;
  actions: number;
  lastActive: string;
  detail: string;
}
