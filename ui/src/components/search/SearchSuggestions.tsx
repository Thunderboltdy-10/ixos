import { motion, AnimatePresence } from 'framer-motion';
import type { HistorySuggestion } from '@/stores/starredStore';
import { Clock, Search, FolderOpen } from 'lucide-react';

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="absolute top-full left-0 right-0 mt-3 bg-graphite-2 border border-stroke-hairline rounded-xl shadow-lift overflow-hidden z-50"
      >
        <div className="py-2">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelect(suggestion)}
              className={`w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-graphite-3 transition-colors ${
                index === selectedIndex ? 'bg-graphite-3' : ''
              }`}
            >
              <Clock className="w-4 h-4 text-fg-dim shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3 text-fg-dim" />
                  <span className="font-medium truncate text-porcelain">{suggestion.query}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-fg-dim">
                  <FolderOpen className="w-3 h-3" />
                  <span className="truncate">{suggestion.directory}</span>
                  <span>-</span>
                  <span>{suggestion.resultCount} results</span>
                  <span>-</span>
                  <span>{formatTime(suggestion.timestamp)}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
