import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "@/hooks/useSearch";
import { SearchInput } from "./SearchInput";
import { SearchResults } from "./SearchResults";
import { SearchDeck } from "./SearchDeck";
import { KeyboardHints } from "./KeyboardHints";
import { useSettingsStore } from "@/stores/settingsStore";
import { listen } from "@tauri-apps/api/event";
import { SearchCorridor } from "@/components/visualization/SearchCorridor";
import { useSearchBarLayout } from "@/hooks/useLayoutSync";
import * as tauri from "@/lib/tauri";

export function SearchOverlay() {
  const search = useSearch();
  const searchBarRef = useSearchBarLayout();
  const { config, setProfile, locations } = useSettingsStore();
  const warming = locations.some(
    (location) => !["ready", "error"].includes(location.stage),
  );
  // Click outside to close
  const handleBackdropClick = async (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      search.reset();
      await tauri.hideOverlay();
    }
  };

  useEffect(() => {
    const focus = () => {
      search.reset();
      document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
    };
    const unlisten = listen("shortcut-triggered", focus);
    document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[10vh] bg-black/70 backdrop-blur-overlay"
      onClick={handleBackdropClick}
    >
      <SearchCorridor />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl bg-graphite-1/95 rounded-2xl shadow-lift border border-stroke-hairline overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={searchBarRef} className="w-full">
          <SearchInput
            value={search.query}
            onChange={search.setQuery}
            directory={search.directory}
            onDirectoryChange={search.setDirectory}
            isSearching={
              search.phase === "lexical" ||
              search.phase === "semantic" ||
              search.phase === "discover"
            }
            onCancel={search.cancelSearch}
            onSearch={() => void search.startSearch()}
            profile={config?.search.profile ?? "code"}
            onProfileChange={setProfile}
          />
        </div>

        {(warming ||
          search.query.trim().length >= 2 ||
          search.phase !== "idle") && (
          <div className="px-3">
            <SearchDeck />
          </div>
        )}

        {search.noticeMessage && (
          <p role="status" className="px-5 py-3 text-sm text-fg-muted">
            {search.noticeMessage}
          </p>
        )}
        {!config?.search.locations.length && (
          <p className="px-5 py-3 text-sm text-fg-muted">
            Add a location with the folder button to begin.
          </p>
        )}
        <div className="max-h-[420px] overflow-y-auto scrollbar-hide">
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
                profile={config?.search.profile ?? "code"}
                resultMode={search.resultMode}
              />
            ) : search.query.length > 0 && search.phase === "complete" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 text-center"
              >
                <p className="text-fg-muted">No results found</p>
                <p className="text-fg-dim text-sm mt-1">
                  Try a different search term
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <KeyboardHints />
      </motion.div>
    </div>
  );
}
