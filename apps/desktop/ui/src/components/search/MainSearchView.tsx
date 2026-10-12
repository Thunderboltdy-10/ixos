import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useMemo } from "react";
import {
  AmbientIxosField,
  SearchSurface,
  type IxosSearchResult,
} from "@ixos/ixos-ui";
import { useSearch } from "@/hooks/useSearch";
import { useSearchStore } from "@/stores/searchStore";
import { SearchInput } from "./SearchInput";
import { SearchIdleDashboard } from "./SearchIdleDashboard";
import { useSettingsStore } from "@/stores/settingsStore";
import { SearchDeck } from "./SearchDeck";

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

  const { noticeMessage, streamStats, resume } = useSearchStore();
  const { config, locations, setProfile } = useSettingsStore();
  const profile = config?.search.profile ?? "code";
  const isSearching = ["discover", "lexical", "semantic"].includes(searchPhase);
  const warming = locations.some(
    (location) => !["ready", "error"].includes(location.stage),
  );
  const surfaceTone = profile === "code" ? "teal" : "amber";
  const ambientAccentRgb =
    surfaceTone === "amber" ? "245, 158, 11" : "20, 184, 166";
  const ambientAccentAltRgb =
    surfaceTone === "amber" ? "252, 211, 77" : "94, 234, 212";
  const stageLabel =
    warming && searchPhase === "idle"
      ? "Warming"
      : searchPhase === "idle"
        ? "Ready"
        : searchPhase;
  const liveResults = useMemo<IxosSearchResult[]>(
    () =>
      results.map((result) => ({
        id: result.path,
        title: result.filename,
        path: result.path,
        score: result.score,
        snippet: result.snippet?.text ?? "",
        matchedLineNumber: result.snippet?.start_line,
        contextMatch: result.snippet?.text.split(/\r?\n/),
      })),
    [results],
  );
  const canInteractWithResults = liveResults.length > 0;
  const resolvedSelectedIndex = Math.min(
    selectedIndex,
    Math.max(0, liveResults.length - 1),
  );

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

  const canSearch =
    query.trim().length > 0 && !!config?.search.locations.length;
  const showIdleDashboard = searchPhase === "idle" && !query.trim() && !warming;
  const showLowerPanels = !showIdleDashboard;

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
        profile={profile}
        onProfileChange={setProfile}
        centered={false}
        showControls
      />

      {noticeMessage && (
        <p role="status" className="mt-3 text-sm text-fg-muted">
          {noticeMessage}
        </p>
      )}
      {warming && <SearchDeck />}
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
                onResumeThread={resume}
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
                  isSearching={isSearching || warming}
                  errorMessage={errorMessage}
                  results={liveResults}
                  selectedIndex={resolvedSelectedIndex}
                  onSelectResult={
                    canInteractWithResults ? setSelectedIndex : undefined
                  }
                  onOpenResult={
                    canInteractWithResults ? handleOpenResult : undefined
                  }
                  onRevealResult={
                    canInteractWithResults ? handleRevealResult : undefined
                  }
                  hideSearchChrome
                  allowResultsScroll
                  pipelineStats={{
                    stage: searchPhase,
                    filesScanned: streamStats?.searchableFiles ?? 0,
                    candidates:
                      streamStats?.lexicalCandidates ?? liveResults.length,
                    embedded: streamStats?.passagesEmbedded ?? 0,
                    cacheHits: streamStats?.memoryCacheHits ?? 0,
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
