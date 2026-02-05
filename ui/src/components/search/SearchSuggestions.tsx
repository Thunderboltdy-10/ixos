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
          exit={{ opacity: 0, scale: 0.99, y: -4, transition: { duration: 0.15, ease: "easeOut" } }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full left-0 right-0 z-50 overflow-hidden bg-graphite-1 border-x border-b border-stroke-hairline rounded-b-md shadow-xl -mt-[1px]"
        >
          {/* Minimal Suggestions List - no header */}
          <div className="py-1 max-h-[280px] overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onSelect(suggestion)}
                className={cn(
                  'w-full px-3 py-2 flex items-center gap-2.5 text-left transition-all duration-100 relative group',
                  'hover:bg-graphite-2/40',
                  index === selectedIndex && 'bg-graphite-2/60'
                )}
              >
                {/* Active indicator line - minimal */}
                {index === selectedIndex && (
                  <motion.div
                    layoutId="active-recent"
                    className="absolute left-0 top-1 bottom-1 w-[2px] bg-accent-teal rounded-full"
                  />
                )}

                {/* Icon - smaller */}
                <div className={cn(
                  'w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors',
                  suggestion.starred ? 'bg-accent-amber/10' : 'bg-graphite-3/60 group-hover:bg-graphite-3/80'
                )}>
                  {suggestion.starred ? (
                    <Star className="w-3 h-3 text-accent-amber fill-accent-amber" />
                  ) : (
                    <Clock className="w-3 h-3 text-fg-dim group-hover:text-fg-muted" />
                  )}
                </div>

                {/* Content - more compact */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[13px] truncate text-porcelain">
                      {suggestion.query}
                    </span>
                    <span className={cn(
                      'text-[8px] font-mono uppercase tracking-wider px-1 py-px rounded',
                      getModeColor(suggestion.mode),
                      'bg-current/10'
                    )}>
                      {getModeLabel(suggestion.mode)}
                    </span>
                    <span className="text-[10px] text-fg-ghost ml-auto shrink-0">{formatTime(suggestion.timestamp)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-fg-dim mt-0.5">
                    <FolderOpen className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate max-w-[200px]">{getFolderTail(suggestion.directory)}</span>
                  </div>
                </div>

                {/* Arrow - only on hover/selected */}
                <ChevronRight className={cn(
                  'w-3.5 h-3.5 shrink-0 transition-opacity duration-100',
                  index === selectedIndex ? 'text-porcelain opacity-100' : 'text-fg-dim opacity-0 group-hover:opacity-40'
                )} />
              </motion.button>
            ))}
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
