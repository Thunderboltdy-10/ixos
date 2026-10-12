import { AnimatePresence, motion } from "framer-motion";
import { Clock3 } from "lucide-react";
import type { RecentSearch } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SearchSuggestionsProps {
  isOpen: boolean;
  onSelect: (suggestion: RecentSearch) => void;
  selectedIndex: number;
  suggestions: RecentSearch[];
}

function formatRelativeTime(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 60_000) return "Just now";
  if (deltaMs < 3_600_000) return `${Math.floor(deltaMs / 60_000)}m ago`;
  if (deltaMs < 86_400_000) return `${Math.floor(deltaMs / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function SearchSuggestions({
  isOpen,
  onSelect,
  selectedIndex,
  suggestions,
}: SearchSuggestionsProps) {
  const items = suggestions.slice(0, 4);

  return (
    <AnimatePresence>
      {isOpen && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-stroke-hairline bg-graphite-1/95 backdrop-blur-md shadow-lift"
        >
          <div className="max-h-[220px] overflow-y-auto py-1.5">
            {items.map((suggestion, index) => (
              <button
                type="button"
                key={`${suggestion.query}-${suggestion.timestamp}`}
                onClick={() => onSelect(suggestion)}
                className={cn(
                  "group relative flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-graphite-2/60 text-porcelain"
                    : "text-fg-muted hover:bg-graphite-2/60 hover:text-porcelain",
                )}
              >
                <div
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent-amber transition-opacity",
                    index === selectedIndex
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  )}
                />
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-graphite-2/50">
                  <Clock3 className="h-3.5 w-3.5 text-fg-dim" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">
                    {suggestion.query}
                  </div>
                </div>
                <div className="shrink-0 text-[10px] text-fg-ghost">
                  {formatRelativeTime(suggestion.timestamp)}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
