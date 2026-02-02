/**
 * Resume Section - Continue where you left off
 */

import { motion } from 'framer-motion';
import { Play, Clock, FolderOpen, FileText } from 'lucide-react';
import type { Workstream, RecentFile } from '@/lib/types';
import { cn, formatRelativeTime } from '@/lib/utils';

interface ResumeSectionProps {
  workstream: Workstream;
  topFiles: RecentFile[];
  onOpenFile?: (path: string) => void;
  onSelectWorkstream?: (id: string) => void;
}

export function ResumeSection({
  workstream,
  topFiles,
  onOpenFile,
  onSelectWorkstream,
}: ResumeSectionProps) {
  const handleResumeClick = () => {
    onSelectWorkstream?.(workstream.id);
  };

  // Format duration
  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-2">
          <Play className="w-4 h-4 text-accent-teal" />
          Resume
        </h2>
        <button
          onClick={handleResumeClick}
          className={cn(
            'text-xs font-medium px-3 py-1.5 rounded-md',
            'bg-accent-teal/10 text-accent-teal border border-accent-teal/30',
            'hover:bg-accent-teal/20 transition-colors'
          )}
        >
          Open Workstream
        </button>
      </div>

      {/* Workstream card */}
      <div
        className={cn(
          'p-4 rounded-lg',
          'bg-graphite-1 border border-stroke-hairline',
          'hover:border-accent-teal/30 transition-colors cursor-pointer'
        )}
        onClick={handleResumeClick}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-porcelain">{workstream.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-fg-dim">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(workstream.lastActive / 1000)}
              </span>
              <span>{workstream.eventCount} actions</span>
              <span>{formatDuration(workstream.durationMs)}</span>
            </div>
          </div>
          {workstream.isAuto && (
            <span className="text-2xs text-fg-ghost uppercase tracking-wider">Auto</span>
          )}
        </div>

        {/* Top folders */}
        {workstream.topFolders.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {workstream.topFolders.slice(0, 3).map(([folder, count]) => {
              const folderName = folder.split(/[/\\]/).pop() || folder;
              return (
                <span
                  key={folder}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs',
                    'bg-graphite-2 text-fg-muted'
                  )}
                >
                  <FolderOpen className="w-3 h-3" />
                  {folderName}
                  <span className="text-fg-ghost">({count})</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Top files quick access */}
        {topFiles.length > 0 && (
          <div className="space-y-1">
            <p className="text-2xs text-fg-ghost uppercase tracking-wider mb-2">Quick Access</p>
            {topFiles.slice(0, 5).map((file) => {
              const filename = file.path.split(/[/\\]/).pop() || file.path;
              return (
                <button
                  key={file.path}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFile?.(file.path);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left',
                    'hover:bg-graphite-2 transition-colors group'
                  )}
                >
                  <FileText className="w-3.5 h-3.5 text-fg-dim group-hover:text-accent-teal" />
                  <span className="text-sm text-fg-muted group-hover:text-porcelain truncate">
                    {filename}
                  </span>
                  <span className="text-xs text-fg-ghost ml-auto">
                    {file.touchCount}x
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
