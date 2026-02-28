export type IxosView = 'search' | 'today' | 'workstreams';

export interface IxosSearchResult {
  id: string;
  title: string;
  path: string;
  score: number;
  lexicalScore?: number;
  semanticScore?: number;
  boostScore?: number;
  snippet: string;
  matchedLineNumber?: number;
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
