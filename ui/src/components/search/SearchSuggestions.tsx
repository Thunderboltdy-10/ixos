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
  if (!isOpen || suggestions.length === 0) return null;

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
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className="absolute top-full left-0 right-0 mt-2 bg-graphite-1 border border-stroke-hairline rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-stroke-hairline/50 bg-graphite-2/50">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-fg-dim">
            Recent Searches
          </span>
        </div>

        {/* Suggestions List */}
        <div className="py-1.5 max-h-[280px] overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => onSelect(suggestion)}
              className={cn(
                'w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-150',
                'hover:bg-graphite-2/70',
                index === selectedIndex && 'bg-graphite-2/70'
              )}
            >
              {/* Icon */}
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                suggestion.starred ? 'bg-accent-amber/10' : 'bg-graphite-3'
              )}>
                {suggestion.starred ? (
                  <Star className="w-4 h-4 text-accent-amber fill-accent-amber" />
                ) : (
                  <Clock className="w-4 h-4 text-fg-dim" />
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
                <div className="text-[11px] text-fg-muted mb-1">
                  Folder: <span className="text-porcelain">{getFolderTail(suggestion.directory)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-fg-dim">
                  <FolderOpen className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[180px]">{suggestion.directory}</span>
                  <span className="text-fg-ghost">|</span>
                  <span className="shrink-0">{suggestion.resultCount} results</span>
                  <span className="text-fg-ghost">|</span>
                  <span className="shrink-0">{formatTime(suggestion.timestamp)}</span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className={cn(
                'w-4 h-4 shrink-0 transition-all',
                index === selectedIndex ? 'text-porcelain opacity-100' : 'text-fg-dim opacity-0 group-hover:opacity-50'
              )} />
            </motion.button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-stroke-hairline/50 bg-graphite-2/30">
          <div className="flex items-center justify-between text-[10px] text-fg-dim">
            <span>
              <kbd className="px-1.5 py-0.5 bg-graphite-3 rounded text-fg-muted mr-1">↑↓</kbd>
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-graphite-3 rounded text-fg-muted mr-1">Enter</kbd>
              Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-graphite-3 rounded text-fg-muted mr-1">Esc</kbd>
              Dismiss
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
