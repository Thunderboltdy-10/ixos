/**
 * Smart Collection Card - Phase 3 Smart Features
 *
 * Displays a saved search collection with:
 * - Name and query preview
 * - Result count and last refreshed
 * - Quick actions (run, pin, delete)
 */

import { motion } from 'framer-motion';
import { FolderSearch, Pin, PinOff, Trash2, RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmartCollection } from '@/stores/collectionsStore';

interface SmartCollectionCardProps {
  collection: SmartCollection;
  onRun: (collection: SmartCollection) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  isCompact?: boolean;
}

export function SmartCollectionCard({
  collection,
  onRun,
  onPin,
  onDelete,
  isCompact = false,
}: SmartCollectionCardProps) {
  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Truncate directory path
  const truncatePath = (path: string, maxLen = 30) => {
    if (path.length <= maxLen) return path;
    const parts = path.split(/[/\\]/);
    if (parts.length <= 2) return path.slice(-maxLen);
    return `.../${parts.slice(-2).join('/')}`;
  };

  if (isCompact) {
    return (
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onRun(collection)}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg',
          'bg-graphite-2/50 hover:bg-graphite-2',
          'border border-transparent hover:border-border/50',
          'transition-all text-left group'
        )}
      >
        <FolderSearch className="w-4 h-4 text-accent-cyan shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-porcelain truncate">
            {collection.name}
          </div>
          <div className="text-xs text-fg-dim truncate">
            "{collection.query}"
          </div>
        </div>
        {collection.isPinned && (
          <Pin className="w-3 h-3 text-accent-amber shrink-0" />
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-lg',
        'bg-graphite-2/50 border border-border/30',
        'hover:border-border/50 transition-colors'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <FolderSearch className="w-5 h-5 text-accent-cyan shrink-0" />
          <h3 className="font-medium text-porcelain truncate">
            {collection.name}
          </h3>
          {collection.isPinned && (
            <Pin className="w-3 h-3 text-accent-amber shrink-0" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPin(collection.id, !collection.isPinned)}
            className={cn(
              'p-1.5 rounded-md',
              'text-fg-dim hover:text-fg-muted',
              'hover:bg-graphite-1 transition-colors'
            )}
            title={collection.isPinned ? 'Unpin' : 'Pin to sidebar'}
          >
            {collection.isPinned ? (
              <PinOff className="w-4 h-4" />
            ) : (
              <Pin className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(collection.id)}
            className={cn(
              'p-1.5 rounded-md',
              'text-fg-dim hover:text-accent-coral',
              'hover:bg-graphite-1 transition-colors'
            )}
            title="Delete collection"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Query */}
      <div className="mb-3">
        <div className="text-sm text-fg-muted truncate">
          "{collection.query}"
        </div>
        <div className="text-xs text-fg-dim truncate mt-1">
          in {truncatePath(collection.directory)}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-fg-dim">
          <span>{collection.resultCount} results</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(collection.lastRefreshed)}
          </span>
        </div>

        {/* Run button */}
        <button
          onClick={() => onRun(collection)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
            'bg-accent-cyan/10 text-accent-cyan',
            'hover:bg-accent-cyan/20 transition-colors',
            'text-xs font-medium'
          )}
        >
          <RefreshCw className="w-3 h-3" />
          Run
        </button>
      </div>
    </motion.div>
  );
}
