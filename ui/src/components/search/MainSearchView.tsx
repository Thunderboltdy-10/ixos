import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useMemo } from 'react';
import { AmbientIxosField, SearchSurface, type IxosSearchResult } from '@ixos/ixos-ui';
import { useSearch } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/searchStore';
import { SearchInput } from './SearchInput';
import { type SearchMode } from './ModeSwitcher';

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
  } = useSearchStore();

  const isSearching = searchPhase === 'lexical' || searchPhase === 'semantic' || searchPhase === 'refining';
  const inputMode: SearchMode = deepSearchMode ? 'journalist' : cacheMode;

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

  const mappedResults = useMemo<IxosSearchResult[]>(
    () =>
      results.map((result) => ({
        id: result.path,
        title: result.filename,
        path: `${result.directory}/${result.filename}`,
        score: Number.isFinite(result.score) ? result.score : 0,
        snippet:
          'context' in result && result.context?.matched?.length
            ? result.context.matched.join(' ').slice(0, 220)
            : 'snippet' in result
              ? String(result.snippet).slice(0, 220)
              : 'Result matched by lexical and semantic relevance.',
        rationale:
          'evidence' in result && result.evidence?.explanation
            ? result.evidence.explanation
            : 'Rank stabilized by relevance, recency, and integrity-safe retrieval.',
      })),
    [results],
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
        snippet: `Streaming lexical candidate while semantic rerank is warming for "${query || 'current query'}".`,
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

  const canSearch = query.trim().length > 0 && directory.trim().length > 0;
  const showLowerPanels = searchPhase !== 'idle' || liveResults.length > 0 || hasLateInsights;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-graphite-0 p-6 text-porcelain">
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

      <div className="relative mt-4 min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {showLowerPanels && (
            <motion.div
              key="search-panels"
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl border border-white/8">
                <AmbientIxosField mode="contained" className="opacity-55" />
                <div className="absolute inset-0 bg-gradient-to-b from-graphite-0/30 via-graphite-0/22 to-graphite-0/50" />
              </div>

              <div className="relative h-full p-1">
                <SearchSurface
                  query={query}
                  stageLabel={stageLabel}
                  isSearching={isSearching || (hasSearchIntent && searchPhase !== 'complete')}
                  errorMessage={errorMessage}
                  results={liveResults}
                  selectedIndex={resolvedSelectedIndex}
                  onSelectResult={canInteractWithResults ? setSelectedIndex : undefined}
                  onOpenResult={canInteractWithResults ? handleOpenResult : undefined}
                  onRevealResult={canInteractWithResults ? handleRevealResult : undefined}
                  hideSearchChrome
                  resultLimit={9}
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
