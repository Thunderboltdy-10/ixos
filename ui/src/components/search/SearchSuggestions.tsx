import { motion, AnimatePresence } from 'framer-motion';
import type { HistorySuggestion } from '@/stores/starredStore';
import { Clock, FolderOpen, Star, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchSuggestionsProps {
  isOpen: boolean;
  onSelect: (suggestion: HistorySuggestion) => void;
  selectedIndex: number;
  suggestions: HistorySuggestion[];
}

export function SearchSuggestions({ isOpen, onSelect, selectedIndex, suggestions }: SearchSuggestionsProps) {
  // Always render to allow exit animations, but control visibility via opacity/pointer-events
  // or rely on AnimatePresence (which we do here)

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'jit': return 'text-accent-amber';
      case 'journalist': return 'text-accent-violet';
      default: return 'text-accent-teal';
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'jit': return 'JIT';
      case 'journalist': return 'PRIV';
      default: return 'CACHE';
    }
  };

  const getFolderTail = (path: string) => {
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : path;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.99, y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full left-0 right-0 z-50 overflow-hidden bg-graphite-1 border-x border-b border-stroke-hairline rounded-b-xl shadow-2xl -mt-[1px]"
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-stroke-hairline/50 bg-graphite-2/30">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-fg-dim">
              Recent Searches
            </span>
          </div>

          {/* Suggestions List */}
          <div className="py-0 max-h-[320px] overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onSelect(suggestion)}
                className={cn(
                  'w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-150 relative group',
                  'hover:bg-graphite-2/50',
                  index === selectedIndex && 'bg-graphite-2/70'
                )}
              >
                {/* Active indicator line */}
                {index === selectedIndex && (
                  <motion.div
                    layoutId="active-recent"
                    className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent-teal"
                  />
                )}

                {/* Icon */}
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  suggestion.starred ? 'bg-accent-amber/10' : 'bg-graphite-3 group-hover:bg-graphite-3/80'
                )}>
                  {suggestion.starred ? (
                    <Star className="w-4 h-4 text-accent-amber fill-accent-amber" />
                  ) : (
                    <Clock className="w-4 h-4 text-fg-dim group-hover:text-fg-muted" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate text-porcelain">
                      {suggestion.query}
                    </span>
                    <span className={cn(
                      'text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded',
                      getModeColor(suggestion.mode),
                      'bg-current/10'
                    )}>
                      {getModeLabel(suggestion.mode)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-fg-dim">
                    <div className="flex items-center gap-1 text-fg-muted hover:text-porcelain transition-colors">
                      <FolderOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[200px]">{getFolderTail(suggestion.directory)}</span>
                    </div>
                    <span className="text-fg-ghost">|</span>
                    <span className="shrink-0">{formatTime(suggestion.timestamp)}</span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className={cn(
                  'w-4 h-4 shrink-0 transition-all',
                  index === selectedIndex || 'marker:group-hover:opacity-100',
                  index === selectedIndex ? 'text-porcelain opacity-100' : 'text-fg-dim opacity-0 group-hover:opacity-50'
                )} />
              </motion.button>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-1.5 border-t border-stroke-hairline/50 bg-graphite-2/50">
            <div className="flex items-center justify-between text-[10px] text-fg-dim">
              <span>
                <kbd className="font-sans px-1 py-px bg-graphite-3 rounded text-fg-muted mr-1.5 text-[9px]">↑↓</kbd>
                Navigate
              </span>
              <span>
                <kbd className="font-sans px-1 py-px bg-graphite-3 rounded text-fg-muted mr-1.5 text-[9px]">Enter</kbd>
                Select
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
