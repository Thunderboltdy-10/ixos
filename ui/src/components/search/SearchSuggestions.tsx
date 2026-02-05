import { AnimatePresence, motion } from 'framer-motion';
import { Clock3, Search } from 'lucide-react';
import type { HistorySuggestion } from '@/stores/starredStore';
import { cn } from '@/lib/utils';

interface SearchSuggestionsProps {
  isOpen: boolean;
  onSelect: (suggestion: HistorySuggestion) => void;
  selectedIndex: number;
  suggestions: HistorySuggestion[];
}

function formatRelativeTime(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 60_000) return 'Just now';
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
  const items = suggestions.slice(0, 5);

  return (
    <AnimatePresence>
      {isOpen && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-0 right-0 top-full z-50 -mt-[1px] overflow-hidden rounded-b-md border-x border-b border-stroke-hairline bg-graphite-1 shadow-xl"
        >
          <div className="max-h-[260px] overflow-y-auto py-1">
            {items.map((suggestion, index) => (
              <button
                type="button"
                key={suggestion.id}
                onClick={() => onSelect(suggestion)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-graphite-2/70 text-porcelain'
                    : 'text-fg-muted hover:bg-graphite-2/45 hover:text-porcelain'
                )}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-graphite-3/70">
                  {suggestion.starred ? (
                    <Search className="h-3.5 w-3.5 text-accent-amber" />
                  ) : (
                    <Clock3 className="h-3.5 w-3.5 text-fg-dim" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{suggestion.query}</div>
                </div>
                <div className="shrink-0 text-[10px] text-fg-dim">
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
