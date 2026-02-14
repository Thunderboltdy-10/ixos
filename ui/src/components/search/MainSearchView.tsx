import { useCallback } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/searchStore';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { LateInsightBadge } from './LateInsightBadge';
import { SearchDeck } from './SearchDeck';
import { GhostScaffold } from './GhostScaffold';
import { useSearchBarLayout } from '@/hooks/useLayoutSync';
import { SearchCorridor } from '@/components/visualization/SearchCorridor';
import { cn } from '@/lib/utils';
import { type SearchMode } from './ModeSwitcher';

export function MainSearchView() {
  // Use useSearch hook for core data

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

  // Store access for specific modes and late insights
  const {
    cacheMode,
    setCacheMode,
    deepSearchMode,
    setDeepSearchMode,
    lateResults,
    hasLateInsights,
    revealLateResults,
    hasSearchIntent,
  } = useSearchStore();

  const searchBarRef = useSearchBarLayout();

  // Derived state
  const isSearching = searchPhase === 'lexical' || searchPhase === 'semantic' || searchPhase === 'refining';
  const hasActiveSearch = hasSearchIntent || isSearching || results.length > 0 || searchPhase === 'complete';
  const showResults = results.length > 0;
  const showGhostScaffold = hasSearchIntent && !showResults && searchPhase !== 'complete';
  const showDeck = hasSearchIntent || isSearching || searchPhase === 'complete';

  // Mode handling
  const mode: SearchMode = deepSearchMode ? 'journalist' : cacheMode;
  const modeGlow = mode === 'journalist'
    ? 'rgba(124, 92, 255, 0.12)'
    : mode === 'native-cache'
      ? 'rgba(13, 148, 136, 0.12)'
      : 'rgba(246, 185, 76, 0.12)';
  const handleModeChange = useCallback((newMode: SearchMode) => {
    if (newMode === 'journalist') {
      setDeepSearchMode(true);
    } else {
      setDeepSearchMode(false);
      setCacheMode(newMode);
    }
  }, [setDeepSearchMode, setCacheMode]);

  return (
    <div className="relative w-full h-full bg-graphite-0 text-porcelain overflow-hidden flex flex-col">
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-gradient-noise-teal" />
      <div className="pointer-events-none absolute inset-0 opacity-60 bg-gradient-noise-violet" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 8%, ${modeGlow} 0%, transparent 65%)`,
        }}
      />

      <SearchCorridor />

      <div className="relative z-10 flex flex-col w-full h-full">
        <div
          ref={searchBarRef}
          className={cn(
            "w-full max-w-4xl mx-auto px-6 transition-all duration-300 ease-out z-50",
            hasActiveSearch ? "pt-6" : "pt-[26vh]"
          )}
        >
          <div className="w-full">
            <SearchInput
              value={query}
              onChange={setQuery}
              onSearch={startSearch}
              directory={directory}
              onDirectoryChange={setDirectory}
              isSearching={isSearching}
              onCancel={cancelSearch}
              mode={mode}
              onModeChange={handleModeChange}
              centered={!hasActiveSearch}
            />
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center">
              {errorMessage}
            </div>
          )}

          {showDeck && <SearchDeck />}
        </div>

        <div className="flex-1 overflow-hidden relative w-full">
          <GhostScaffold visible={showGhostScaffold} count={8} />

          {showResults && (
            <div className="absolute inset-0 overflow-y-auto px-8 py-6">
              <SearchResults
                results={results}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onOpen={openSelected}
                onReveal={revealSelected}
                phase={searchPhase}
              />

              {hasLateInsights && (
                <div className="fixed bottom-6 right-6 z-50">
                  <LateInsightBadge
                    count={lateResults.length}
                    onReveal={revealLateResults}
                  />
                </div>
              )}
            </div>
          )}

          {!showResults && query.length > 0 && searchPhase === 'complete' && (
            <div className="w-full max-w-3xl mx-auto px-6 py-10 text-center">
              <p className="text-fg-muted">No results found</p>
              <p className="text-fg-dim text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
