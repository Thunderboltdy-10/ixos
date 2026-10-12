export interface IxosSearchResult {
  id: string;
  title: string;
  path: string;
  /** Ranking score, not a probability. */
  score: number;
  snippet: string;
  matchedLineNumber?: number;
  contextBefore?: string[];
  contextMatch?: string[];
  contextAfter?: string[];
}
