import type { RankedResult, LexicalResult, ContextSnippet } from './types';

export type StoredResult = RankedResult | LexicalResult;

function sanitizeContext(context: ContextSnippet | null): ContextSnippet | null {
  if (!context) return null;
  return {
    lineNumber: context.lineNumber,
    before: [...context.before],
    matched: [...context.matched],
    after: [...context.after],
  };
}

export function sanitizeResults(results: Array<RankedResult | LexicalResult>): StoredResult[] {
  return results.map((result) => {
    if ('scoreBreakdown' in result) {
      return {
        path: result.path,
        filename: result.filename,
        directory: result.directory,
        score: result.score,
        integrityVerified: result.integrityVerified,
        scoreBreakdown: result.scoreBreakdown,
        context: sanitizeContext(result.context ?? null),
      } satisfies RankedResult;
    }

    return {
      path: result.path,
      filename: result.filename,
      directory: result.directory,
      score: result.score,
      snippet: result.snippet,
      termMatches: result.termMatches,
      totalTerms: result.totalTerms,
    } satisfies LexicalResult;
  });
}
