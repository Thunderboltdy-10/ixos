export interface Hit {
  /** Stable identity, usually the full path. */
  key: string;
  file: string;
  dir: string;
  /** For example "10–14". */
  lines?: string;
  /** Keyword half of the hybrid score, 0 to 0.5. */
  keyword: number;
  /** Meaning half of the hybrid score, 0 to 0.5. */
  meaning: number;
}

export interface SourceLine {
  n: number;
  text: string;
}

export interface Passage {
  title: string;
  detail?: string;
  lines: SourceLine[];
  /** First and last line of the matched passage. */
  from: number;
  to: number;
  terms?: string[];
}
