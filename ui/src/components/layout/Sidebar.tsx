import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Star, FileText, Zap, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStatsStore } from '@/stores/statsStore';
import { useStarredStore, type SearchThread } from '@/stores/starredStore';
import { useSearchStore } from '@/stores/searchStore';

interface SidebarProps {
  onNewSearch?: () => void;
  onOpenGuide?: () => void;
  className?: string;
}

export function Sidebar({ onNewSearch, onOpenGuide, className }: SidebarProps) {
  const [statsCollapsed, setStatsCollapsed] = useState(false);

  // Use real store data
  const stats = useStatsStore();
  const starred = useStarredStore();
  const searchStore = useSearchStore();

  // Get starred threads
  const starredThreads = starred.getStarredThreads();

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleHistoryClick = (thread: SearchThread) => {
    // Restore search from history
    searchStore.setQuery(thread.query);
    searchStore.setDirectory(thread.directory);
    // Set mode based on history
    if (thread.mode === 'journalist') {
      searchStore.setJournalistMode(true);
      searchStore.setCacheMode('jit');
    } else {
      searchStore.setJournalistMode(false);
      searchStore.setCacheMode(thread.mode);
    }
    // Trigger search
    searchStore.startSearch();
  };

  const handleDeleteThread = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    starred.deleteThread(id);
  };

  const handleUnstar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    starred.toggleStar(id);
  };

  const cacheHitRate = stats.getCacheHitRate() * 100;

  return (
    <div className={cn('w-[280px] h-full flex flex-col bg-graphite-1 border-r border-stroke-hairline', className)}>
      {/* New Search Button */}
      <div className="p-4 border-b border-stroke-hairline">
        <button
          type="button"
          onClick={onNewSearch}
          className={cn(
            'w-full py-2.5 px-4 rounded-lg',
            'bg-gradient-teal text-graphite-0 font-medium text-sm',
            'flex items-center justify-center gap-2',
            'hover:opacity-90 transition-opacity duration-150',
            'shadow-glow-teal cursor-pointer'
          )}
        >
          <Search className="w-4 h-4" />
          New Search
        </button>

        <button
          type="button"
          onClick={() => onOpenGuide?.()}
          className={cn(
            'w-full mt-3 py-2.5 px-4 rounded-lg',
            'bg-graphite-2 text-porcelain font-medium text-sm',
            'flex items-center justify-center gap-2',
            'hover:bg-graphite-3 transition-colors duration-150',
            'border border-stroke-hairline'
          )}
        >
          <Info className="w-4 h-4 text-accent-teal" />
          Guide & Features
        </button>
      </div>

      {/* Stats Panel */}
      <div className="border-b border-stroke-hairline">
        <button
          type="button"
          onClick={() => setStatsCollapsed(!statsCollapsed)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3',
            'hover:bg-graphite-2 transition-colors duration-150 cursor-pointer'
          )}
        >
          <span className="text-sm font-medium text-porcelain">Statistics</span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-fg-dim transition-transform duration-200',
              statsCollapsed && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {!statsCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-muted">Total Searches</span>
                  <span className="font-mono text-porcelain">{stats.totalSearches}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-muted">Files Indexed</span>
                  <span className="font-mono text-porcelain">{stats.filesIndexed}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-muted">Cache Hit Rate</span>
                  <span className="font-mono text-accent-teal">
                    {stats.totalSearches > 0 ? `${cacheHitRate.toFixed(1)}%` : '—'}
                  </span>
                </div>
                {stats.currentStreak > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-fg-muted">Current Streak</span>
                    <span className="font-mono text-accent-amber">{stats.currentStreak} days 🔥</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Starred Searches */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 border-b border-stroke-hairline">
          <h3 className="text-sm font-medium text-porcelain flex items-center gap-2">
            <Star className="w-4 h-4 text-accent-amber fill-accent-amber" />
            Starred Searches
            {starredThreads.length > 0 && (
              <span className="text-2xs text-fg-dim">({starredThreads.length})</span>
            )}
          </h3>
        </div>

        <div className="space-y-1 p-2">
          {starredThreads.length === 0 ? (
            <div className="px-3 py-6 text-center text-fg-dim text-sm">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No starred searches</p>
              <p className="text-xs mt-1">Star a search result to save it here</p>
            </div>
          ) : (
            starredThreads.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => handleHistoryClick(item)}
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg text-left',
                  'hover:bg-graphite-2 transition-colors duration-150',
                  'group cursor-pointer relative'
                )}
              >
                {/* Query */}
                <div className="flex items-start gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-fg-dim mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-porcelain truncate group-hover:text-accent-teal transition-colors">
                      {item.query}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 ml-5 text-2xs text-fg-dim">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {item.resultCount} results
                  </span>
                  <span>•</span>
                  <span>{formatTime(item.timestamp)}</span>
                  {item.mode === 'journalist' && (
                    <>
                      <span>•</span>
                      <span className="text-accent-magenta">🔒</span>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150">
                  <button
                    type="button"
                    onClick={(e) => handleUnstar(e, item.id)}
                    className={cn(
                      'p-1.5 rounded',
                      'hover:bg-graphite-3 text-accent-amber',
                      'transition-all duration-150'
                    )}
                    title="Remove from starred"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteThread(e, item.id)}
                    className={cn(
                      'p-1.5 rounded',
                      'hover:bg-graphite-3 text-fg-dim hover:text-error',
                      'transition-all duration-150'
                    )}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-stroke-hairline">
        <div className="flex items-center justify-center gap-2 text-2xs text-fg-dim">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>Ixos Protocol v1.0</span>
        </div>
      </div>
    </div>
  );
}
