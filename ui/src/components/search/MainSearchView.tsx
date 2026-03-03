import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useMemo } from 'react';
import { AmbientIxosField, SearchSurface, type IxosSearchResult } from '@ixos/ixos-ui';
import { useSearch } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/searchStore';
import { SearchInput } from './SearchInput';
import { SearchIdleDashboard } from './SearchIdleDashboard';
import { type SearchMode } from './ModeSwitcher';
import type { LexicalResult, RankedResult } from '@/lib/types';
import type { SearchThread } from '@/stores/starredStore';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function stripAnsiAndControl(raw: string): string {
  return raw
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function normalizeConfidence(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value <= 1) return clamp(value, 0, 1);
  if (value <= 4.2) return clamp(value / 4, 0, 1);
  if (value <= 100) return clamp(value / 100, 0, 1);
  return clamp(value / (value + 100), 0, 1);
}

function toSurfaceResult(result: RankedResult | LexicalResult, queryTerms: string[]): IxosSearchResult {
  if ('scoreBreakdown' in result) {
    const scoreParts = [
      result.scoreBreakdown.semantic,
      result.scoreBreakdown.integrity,
      result.scoreBreakdown.temporal,
      result.scoreBreakdown.behavior,
      result.scoreBreakdown.personal,
    ]
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      .map((value) => normalizeConfidence(value));

    const confidence = scoreParts.length > 0
      ? scoreParts.reduce((sum, value) => sum + value, 0) / scoreParts.length
      : normalizeConfidence(result.score);

    const contextBefore = (result.context?.before ?? []).map(stripAnsiAndControl);
    const contextMatch = (result.context?.matched ?? []).map(stripAnsiAndControl);
    const contextAfter = (result.context?.after ?? []).map(stripAnsiAndControl);
    const matchPreview = contextMatch.find((line) => line.trim().length > 0);
    const snippet = (
      matchPreview ||
      stripAnsiAndControl(result.evidence?.semanticPassage || '').split(/\r?\n/)[0] ||
      'Result matched by semantic relevance.'
    ).slice(0, 260);

    const lexicalScore = queryTerms.length > 0 && result.evidence?.matchedTerms
      ? clamp(result.evidence.matchedTerms.length / queryTerms.length, 0, 1)
      : undefined;

    const boostParts = [
      result.scoreBreakdown.integrity,
      result.scoreBreakdown.temporal,
      result.scoreBreakdown.behavior,
      result.scoreBreakdown.personal,
    ]
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      .map((value) => normalizeConfidence(value));

    return {
      id: result.path,
      title: result.filename,
      path: result.path,
      score: confidence,
      rawScore: Number.isFinite(result.score) ? result.score : undefined,
      lexicalScore,
      semanticScore: normalizeConfidence(result.scoreBreakdown.semantic),
      boostScore: boostParts.length > 0
        ? boostParts.reduce((sum, value) => sum + value, 0) / boostParts.length
        : undefined,
      snippet:
        snippet,
      matchedLineNumber: result.context?.lineNumber,
      contextBefore,
      contextMatch,
      contextAfter,
      rationale:
        stripAnsiAndControl(result.evidence?.explanation || 'Rank stabilized by relevance, recency, and integrity-safe retrieval.'),
    };
  }

  const lexicalConfidence = result.totalTerms > 0
    ? clamp(result.termMatches / result.totalTerms, 0, 1)
    : normalizeConfidence(result.score);

  return {
    id: result.path,
    title: result.filename,
    path: result.path,
    score: lexicalConfidence,
    rawScore: Number.isFinite(result.score) ? result.score : undefined,
    lexicalScore: lexicalConfidence,
    snippet: stripAnsiAndControl(String(result.snippet ?? '')).split(/\r?\n/)[0].slice(0, 260),
    rationale: 'Lexical candidate while semantic ranking finalizes.',
  };
}

export function MainSearchView() {
  const {
    query,
    setQuery,
    directory,
    setDirectory,
    currentResults: results,
    phase: searchPhase,
    selectedIndex,
    setSelectedIndex,
    openSelected,
    revealSelected,
    startSearch,
    cancelSearch,
    errorMessage,
  } = useSearch();

  const {
    cacheMode,
    setCacheMode,
    deepSearchMode,
    setDeepSearchMode,
    lateResults,
    hasLateInsights,
    revealLateResults,
    hasSearchIntent,
    streamStats,
    streamStage,
    scanTrail,
    restoreFromHistory,
  } = useSearchStore();

  const isSearching = searchPhase === 'lexical' || searchPhase === 'semantic' || searchPhase === 'refining';
  const inputMode: SearchMode = deepSearchMode ? 'journalist' : cacheMode;

  const surfaceTone: 'teal' | 'amber' | 'violet' =
    inputMode === 'ephemeral' ? 'amber' : inputMode === 'journalist' ? 'violet' : 'teal';
  const ambientAccentRgb = surfaceTone === 'amber' ? '245, 158, 11' : surfaceTone === 'violet' ? '167, 139, 250' : '20, 184, 166';
  const ambientAccentAltRgb = surfaceTone === 'amber' ? '252, 211, 77' : surfaceTone === 'violet' ? '196, 181, 253' : '94, 234, 212';

  const handleInputModeChange = useCallback(
    (newMode: SearchMode) => {
      if (newMode === 'journalist') {
        setDeepSearchMode(true);
        return;
      }
      setDeepSearchMode(false);
      setCacheMode(newMode);
    },
    [setCacheMode, setDeepSearchMode],
  );

  const stageLabel =
    searchPhase === 'lexical'
      ? 'Lexical scan'
      : searchPhase === 'semantic'
        ? 'Semantic rerank'
        : searchPhase === 'refining'
          ? 'Refining'
          : searchPhase === 'complete'
            ? 'Locked'
            : 'Ready';

  const queryTerms = useMemo(
    () => query.toLowerCase().split(/\s+/).map((term) => term.trim()).filter((term) => term.length >= 2),
    [query],
  );

  const mappedResults = useMemo<IxosSearchResult[]>(
    () => results.map((result) => toSurfaceResult(result, queryTerms)),
    [results, queryTerms],
  );

  const streamSeedResults = useMemo<IxosSearchResult[]>(() => {
    if (!isSearching) return [];
    const seeds = [...scanTrail].slice(-10).reverse();
    if (seeds.length === 0) return [];

    return seeds.map((path, index) => {
      const file = path.split(/[/\\]/).pop() || path;
      return {
        id: `stream-seed-${path}-${index}`,
        title: file,
        path,
        score: Math.max(0.55, 0.78 - index * 0.03),
        snippet: `Scanning ${file} while semantic rerank warms for "${query || 'current query'}".`,
        rationale: 'Live scan packet from progressive search pipeline.',
      };
    });
  }, [isSearching, query, scanTrail]);

  const liveResults = mappedResults.length > 0 ? mappedResults : streamSeedResults;
  const canInteractWithResults = mappedResults.length > 0;
  const resolvedSelectedIndex =
    liveResults.length > 0 ? Math.min(selectedIndex, liveResults.length - 1) : 0;

  const handleOpenResult = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      setTimeout(() => {
        void openSelected();
      }, 0);
    },
    [openSelected, setSelectedIndex],
  );

  const handleRevealResult = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      setTimeout(() => {
        void revealSelected();
      }, 0);
    },
    [revealSelected, setSelectedIndex],
  );

  const handleResumeThread = useCallback(
    (thread: SearchThread) => {
      restoreFromHistory(thread);
    },
    [restoreFromHistory],
  );

  const canSearch = query.trim().length > 0 && directory.trim().length > 0;
  const showIdleDashboard = searchPhase === 'idle' && query.trim().length === 0 && !hasLateInsights;
  const showLowerPanels = !showIdleDashboard && (searchPhase !== 'idle' || liveResults.length > 0 || hasLateInsights || query.trim().length > 0);

  return (
    <div className="relative flex h-full w-full flex-col bg-graphite-0 p-6 text-porcelain">
      <SearchInput
        value={query}
        onChange={setQuery}
        onSearch={() => {
          if (!canSearch) return;
          void startSearch();
        }}
        directory={directory}
        onDirectoryChange={setDirectory}
        isSearching={isSearching}
        onCancel={() => void cancelSearch()}
        mode={inputMode}
        onModeChange={handleInputModeChange}
        centered={false}
        showControls
      />

      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {showIdleDashboard ? (
            <motion.div
              key="search-idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-full items-center justify-center pb-10 pt-4"
            >
              <SearchIdleDashboard
                directory={directory}
                onApplyQuery={setQuery}
                onResumeThread={handleResumeThread}
              />
            </motion.div>
          ) : null}

          {showLowerPanels && (
            <motion.div
              key="search-panels"
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <AmbientIxosField
                  mode="contained"
                  className="opacity-45"
                  accentRgb={ambientAccentRgb}
                  accentAltRgb={ambientAccentAltRgb}
                  intensity={0.72}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-graphite-0/35 via-graphite-0/20 to-graphite-0/54" />
              </div>

              <div className="relative h-full min-h-0 p-1">
                <SearchSurface
                  query={query}
                  stageLabel={stageLabel}
                  tone={surfaceTone}
                  isSearching={isSearching || (hasSearchIntent && searchPhase !== 'complete' && liveResults.length === 0)}
                  errorMessage={errorMessage}
                  results={liveResults}
                  selectedIndex={resolvedSelectedIndex}
                  onSelectResult={canInteractWithResults ? setSelectedIndex : undefined}
                  onOpenResult={canInteractWithResults ? handleOpenResult : undefined}
                  onRevealResult={canInteractWithResults ? handleRevealResult : undefined}
                  hideSearchChrome
                  allowResultsScroll
                  pipelineStats={{
                    stage: streamStage ?? searchPhase,
                    filesScanned: streamStats?.filesScanned ?? 0,
                    candidates: streamStats?.candidates ?? liveResults.length,
                    embedded: streamStats?.embedded ?? 0,
                    cacheHits: streamStats?.cacheHits ?? 0,
                    scanTrail,
                  }}
                  sourcePath="source: ui/src/stores/searchStore.ts + src-tauri/src/commands/search.rs"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hasLateInsights && lateResults.length > 0 && (
        <div className="mt-3 rounded-lg border border-accent-violet/35 bg-accent-violet/10 px-3 py-2 text-xs text-fg-secondary">
          {lateResults.length} late insights found after lock.
          <button
            type="button"
            onClick={revealLateResults}
            className="ml-2 text-accent-violet hover:text-accent-violet-glow"
          >
            Reveal now
          </button>
        </div>
      )}
    </div>
  );
}
