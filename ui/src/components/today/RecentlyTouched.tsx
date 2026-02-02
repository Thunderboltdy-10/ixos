/**
 * Recently Touched - Files opened/modified today
 */

import { motion } from 'framer-motion';
import { Clock, FileText, ExternalLink } from 'lucide-react';
import type { RecentFile } from '@/lib/types';
import { cn, formatRelativeTime } from '@/lib/utils';

interface RecentlyTouchedProps {
  files: RecentFile[];
  onOpenFile?: (path: string) => void;
}

export function RecentlyTouched({ files, onOpenFile }: RecentlyTouchedProps) {
  if (files.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-3"
    >
      {/* Section header */}
      <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-2">
        <Clock className="w-4 h-4 text-accent-amber" />
        Recently Touched
      </h2>

      {/* File list */}
      <div className="space-y-1">
        {files.map((file, index) => {
          const filename = file.path.split(/[/\\]/).pop() || file.path;
          const directory = file.path.split(/[/\\]/).slice(0, -1).join('/');

          return (
            <motion.button
              key={file.path}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onOpenFile?.(file.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                'bg-graphite-1/50 border border-transparent',
                'hover:bg-graphite-1 hover:border-stroke-hairline',
                'transition-all group'
              )}
            >
              <FileText className="w-4 h-4 text-fg-dim group-hover:text-accent-amber shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg-muted group-hover:text-porcelain truncate">
                  {filename}
                </p>
                <p className="text-xs text-fg-ghost truncate">{directory}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-fg-ghost">
                  {formatRelativeTime(file.lastTouched / 1000)}
                </span>
                {file.touchCount > 1 && (
                  <span className="text-2xs text-fg-ghost bg-graphite-2 px-1.5 py-0.5 rounded">
                    {file.touchCount}x
                  </span>
                )}
                <ExternalLink className="w-3.5 h-3.5 text-fg-ghost opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
