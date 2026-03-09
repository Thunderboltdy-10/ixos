/**
 * Pinned Section - User-curated quick access items
 */

import { motion } from 'framer-motion';
import { Pin, FileText, Layers, X } from 'lucide-react';
import type { PinnedItem } from '@/lib/types';
import { useTodayStore } from '@/stores/todayStore';
import { cn } from '@/lib/utils';

interface PinnedSectionProps {
  items: PinnedItem[];
  onOpenFile?: (path: string) => void;
  onSelectWorkstream?: (id: string) => void;
}

export function PinnedSection({ items, onOpenFile, onSelectWorkstream }: PinnedSectionProps) {
  const { unpinFile, unpinWorkstream } = useTodayStore();

  if (items.length === 0) return null;

  const handleClick = (item: PinnedItem) => {
    if (item.type === 'file' && item.path) {
      onOpenFile?.(item.path);
    } else if (item.type === 'workstream') {
      // Extract workstream ID from the item ID (format: "workstream:uuid")
      const wsId = item.id.replace('workstream:', '');
      onSelectWorkstream?.(wsId);
    }
  };

  const handleUnpin = (e: React.MouseEvent, item: PinnedItem) => {
    e.stopPropagation();
    if (item.type === 'file' && item.path) {
      unpinFile(item.path);
    } else if (item.type === 'workstream') {
      const wsId = item.id.replace('workstream:', '');
      unpinWorkstream(wsId);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="space-y-3"
    >
      {/* Section header */}
      <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-2">
        <Pin className="w-4 h-4 text-accent-magenta" />
        Pinned
      </h2>

      {/* Pinned items grid */}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, index) => {
          const Icon = item.type === 'file' ? FileText : Layers;

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 + index * 0.02 }}
              onClick={() => handleClick(item)}
              className={cn(
                'relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-left',
                'bg-graphite-1 border border-stroke-hairline',
                'hover:bg-graphite-2 hover:border-accent-magenta/30',
                'transition-all group'
              )}
            >
              <Icon className="w-4 h-4 text-accent-magenta shrink-0" />

              <span className="text-sm text-fg-muted group-hover:text-porcelain truncate flex-1">
                {item.name}
              </span>

              {/* Unpin button */}
              <button
                onClick={(e) => handleUnpin(e, item)}
                className={cn(
                  'absolute -top-1 -right-1 p-1 rounded-full',
                  'bg-graphite-2 border border-stroke-hairline',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-error/20 hover:border-error/30 hover:text-error',
                  'transition-all'
                )}
              >
                <X className="w-3 h-3" />
              </button>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
