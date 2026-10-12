import { motion, AnimatePresence } from "framer-motion";
import { ResultCard } from "./ResultCard";
import { ResultCardErrorBoundary } from "./ResultCardErrorBoundary";
import { useClearLayoutOnChange } from "@/hooks/useLayoutSync";
import type { Profile, SearchPhase, SearchResult } from "@/lib/types";
interface SearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onOpen: () => void;
  onReveal: () => void;
  phase: SearchPhase;
  profile: Profile;
  resultMode: "lexical" | "hybrid";
}
export function SearchResults({
  results,
  selectedIndex,
  onSelect,
  onOpen,
  onReveal,
  phase,
  profile,
  resultMode,
}: SearchResultsProps) {
  useClearLayoutOnChange([results.length]);
  return (
    <div>
      <div className="flex items-center justify-between py-4 px-1 border-b border-stroke-hairline/70 mb-2">
        <div>
          <span className="text-xs text-fg-dim">Results</span>
          <div className="text-sm text-porcelain mt-1 flex items-center gap-2">
            <span>
              {results.length} {results.length === 1 ? "result" : "results"}
            </span>
            <span className="text-accent-teal text-xs">
              {resultMode === "hybrid"
                ? "Hybrid ranking"
                : phase === "semantic"
                  ? "Keyword results · refining…"
                  : "Keyword ranking"}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {results.map((result, index) => (
            <motion.div
              key={result.path}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1],
                layout: {
                  type: "spring",
                  stiffness: 240,
                  damping: 30,
                  mass: 1,
                },
              }}
              style={{ originX: 0 }}
            >
              <ResultCardErrorBoundary>
                <ResultCard
                  result={result}
                  index={index}
                  isSelected={index === selectedIndex}
                  profile={profile}
                  onSelect={() => onSelect(index)}
                  onOpen={onOpen}
                  onReveal={onReveal}
                />
              </ResultCardErrorBoundary>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
