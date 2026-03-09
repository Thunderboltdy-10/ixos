/**
 * WorkstreamCard - Individual workstream display
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  FolderOpen,
  FileText,
  ChevronDown,
  Pin,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { useWorkstreamStore } from '@/stores/workstreamStore';
import { useTodayStore } from '@/stores/todayStore';
import type { Workstream } from '@/lib/types';
import { cn, formatRelativeTime } from '@/lib/utils';

interface WorkstreamCardProps {
  workstream: Workstream;
  onSelect?: () => void;
  onOpenFile?: (path: string) => void;
  isActive?: boolean;
}

export function WorkstreamCard({ workstream, onSelect, onOpenFile, isActive = false }: WorkstreamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(workstream.name);

  const { renameWorkstream, deleteWorkstream, pinWorkstream } = useWorkstreamStore();
  const { pinWorkstream: pinInToday, unpinWorkstream: unpinInToday, isPinned } = useTodayStore();

  const isPinnedItem = isPinned(`workstream:${workstream.id}`);

  // Format duration
  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSaveRename = async () => {
    if (editName.trim() && editName !== workstream.name) {
      await renameWorkstream(workstream.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditName(workstream.name);
    setIsEditing(false);
  };

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !isPinnedItem;
    await pinWorkstream(workstream.id, newPinned);
    if (newPinned) {
      pinInToday(workstream.id, workstream.name);
    } else {
      unpinInToday(workstream.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this workstream? The activity events will be preserved.')) {
      await deleteWorkstream(workstream.id);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        'bg-graphite-1 border border-stroke-hairline',
        'hover:border-accent-teal/30 transition-colors',
        isActive && 'border-accent-teal/45 shadow-[0_0_18px_rgba(20,184,166,0.18)]'
      )}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={handleToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename();
                    if (e.key === 'Escape') handleCancelRename();
                  }}
                  onBlur={handleSaveRename}
                  className={cn(
                    'flex-1 px-2 py-1 rounded bg-graphite-2 border border-stroke-hairline',
                    'text-porcelain text-sm focus:outline-none focus:border-accent-teal'
                  )}
                  autoFocus
                />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSaveRename}
                  className="p-1 text-success hover:bg-success/10 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCancelRename}
                  className="p-1 text-fg-dim hover:bg-graphite-2 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-porcelain truncate">{workstream.name}</h3>
                {workstream.isPinned && (
                  <Pin className="w-3.5 h-3.5 text-accent-magenta shrink-0" />
                )}
                {workstream.isAuto && (
                  <span className="text-2xs text-fg-ghost uppercase tracking-wider shrink-0">
                    Auto
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-1 text-xs text-fg-dim">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(workstream.lastActive / 1000)}
              </span>
              <span>{workstream.eventCount} actions</span>
              <span>{formatDuration(workstream.durationMs)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <ChevronDown
              className={cn(
                'w-4 h-4 text-fg-dim transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </div>

        {/* Top folders preview (always visible) */}
        {workstream.topFolders.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {workstream.topFolders.slice(0, 3).map(([folder]) => {
              const folderName = folder.split(/[/\\]/).pop() || folder;
              return (
                <span
                  key={folder}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                    'bg-graphite-2 text-fg-muted'
                  )}
                >
                  <FolderOpen className="w-3 h-3" />
                  {folderName}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-stroke-hairline/50">
              {/* Description */}
              {workstream.description && (
                <p className="text-sm text-fg-muted mb-3">{workstream.description}</p>
              )}

              {/* Top files */}
              {workstream.topFiles.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-2xs text-fg-ghost">
                    Top files
                  </p>
                  <div className="space-y-1">
                    {workstream.topFiles.slice(0, 5).map(([path, fileCount]) => {
                      const filename = path.split(/[/\\]/).pop() || path;
                      return (
                        <button
                          key={path}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFile?.(path);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left',
                            'hover:bg-graphite-2 transition-colors group'
                          )}
                        >
                          <FileText className="w-3.5 h-3.5 text-fg-dim group-hover:text-accent-teal" />
                          <span className="text-sm text-fg-muted group-hover:text-porcelain truncate flex-1">
                            {filename}
                          </span>
                          <span className="text-xs text-fg-ghost">{fileCount}x</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-stroke-hairline/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isActive) return;
                    onSelect?.();
                  }}
                  disabled={!onSelect || isActive}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium',
                    'bg-accent-teal/10 text-accent-teal border border-accent-teal/30',
                    'hover:bg-accent-teal/20 transition-colors',
                    (!onSelect || isActive) && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {isActive ? 'Viewing' : 'Open Workstream'}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className={cn(
                    'p-2 rounded-md text-fg-dim',
                    'hover:bg-graphite-2 hover:text-fg-muted transition-colors'
                  )}
                  title="Rename"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={handleTogglePin}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    isPinnedItem
                      ? 'text-accent-magenta hover:bg-accent-magenta/10'
                      : 'text-fg-dim hover:bg-graphite-2 hover:text-fg-muted'
                  )}
                  title={isPinnedItem ? 'Unpin' : 'Pin to Today'}
                >
                  <Pin className="w-4 h-4" />
                </button>

                <button
                  onClick={handleDelete}
                  className={cn(
                    'p-2 rounded-md text-fg-dim ml-auto',
                    'hover:bg-error/10 hover:text-error transition-colors'
                  )}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
