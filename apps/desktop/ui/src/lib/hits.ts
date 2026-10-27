import type { Hit } from "@ixos/ui";
import type { SearchState } from "./useSearch";
import { relativeDir } from "./format";

export function toHits(state: SearchState, locations: string[]): Hit[] {
  return state.results.map((result, index) => {
    const [keyword, meaning] = state.parts[index] ?? [0, Math.min(1, result.score)];
    const snippet = result.snippet;
    return {
      key: result.path,
      file: result.filename,
      dir: relativeDir(result.path, locations),
      lines: snippet ? `${snippet.start_line}–${snippet.end_line}` : undefined,
      keyword,
      meaning,
    };
  });
}

/** Numbered lines from a search result or a file read. */
export function snippetLines(result: { snippet?: { text: string; start_line: number } }) {
  const snippet = result.snippet;
  if (!snippet) return [];
  return snippet.text.split("\n").map((text, index) => ({ n: snippet.start_line + index, text }));
}
