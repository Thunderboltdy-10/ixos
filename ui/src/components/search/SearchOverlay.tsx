import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from '@/hooks/useSearch';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { SearchDeck } from './SearchDeck';
import { JournalistBadge } from './JournalistBadge';
import { KeyboardHints } from './KeyboardHints';
import { SearchCorridor } from '@/components/visualization/SearchCorridor';
import { useSearchBarLayout } from '@/hooks/useLayoutSync';
import * as tauri from '@/lib/tauri';

export function SearchOverlay() {
  const search = useSearch();
  const searchBarRef = useSearchBarLayout();

  // Click outside to close
  const handleBackdropClick = async (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      search.reset();
      await tauri.hideOverlay();
    }
  };

  // Focus input on mount
  useEffect(() => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[12vh] bg-black/70 backdrop-blur-overlay"
      onClick={handleBackdropClick}
    >
      <SearchCorridor />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl bg-surface rounded-xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with journalist badge */}
        {search.journalistMode && (
          <div className="flex items-center justify-end px-4 py-2 border-b border-border bg-base/50">
            <JournalistBadge />
          </div>
        )}

        {/* Search Input */}
        <div ref={searchBarRef} className="w-full">
          <SearchInput
            value={search.query}
            onChange={search.setQuery}
            directory={search.directory}
            onDirectoryChange={search.setDirectory}
            isSearching={search.phase === 'lexical' || search.phase === 'semantic' || search.phase === 'refining'}
            onCancel={search.cancelSearch}
            mode={search.journalistMode ? 'journalist' : 'jit'}
            onModeChange={() => { }}
          />
        </div>

        {/* Search Deck - Status panel */}
        {(search.query.trim().length >= 2 || search.phase !== 'idle') && (
          <div className="px-2">
            <SearchDeck />
          </div>
        )}

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {search.errorMessage ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 text-center"
              >
                <p className="text-danger">{search.errorMessage}</p>
              </motion.div>
            ) : search.hasResults ? (
              <SearchResults
                results={search.currentResults}
                selectedIndex={search.selectedIndex}
                onSelect={search.setSelectedIndex}
                onOpen={search.openSelected}
                onReveal={search.revealSelected}
                phase={search.phase}
              />
            ) : search.query.length > 0 && search.phase === 'complete' ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 text-center"
              >
                <p className="text-text-secondary">No results found</p>
                <p className="text-text-muted text-sm mt-1">Try a different search term</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Footer with keyboard hints */}
        <KeyboardHints />
      </motion.div>
    </div>
  );
}
