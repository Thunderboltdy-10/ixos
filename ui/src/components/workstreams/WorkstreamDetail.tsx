/**
 * WorkstreamDetail - Full view of a single workstream
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  FolderOpen,
  FileText,
  Search,
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

interface WorkstreamDetailProps {
  workstreamId: string;
  onBack?: () => void;
  onOpenFile?: (path: string) => void;
}

export function WorkstreamDetail({ workstreamId, onBack, onOpenFile }: WorkstreamDetailProps) {
  const [workstream, setWorkstream] = useState<Workstream | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const { getWorkstream, renameWorkstream, deleteWorkstream, pinWorkstream } = useWorkstreamStore();
  const { pinWorkstream: pinInToday, unpinWorkstream: unpinInToday, isPinned } = useTodayStore();

  // Load workstream
  useEffect(() => {
    const load = async () => {
      const ws = await getWorkstream(workstreamId);
      if (ws) {
        setWorkstream(ws);
        setEditName(ws.name);
      }
    };
    load();
  }, [workstreamId, getWorkstream]);

  if (!workstream) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-fg-dim">Loading...</div>
      </div>
    );
  }

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

  const handleSaveRename = async () => {
    if (editName.trim() && editName !== workstream.name) {
      await renameWorkstream(workstream.id, editName.trim());
      setWorkstream({ ...workstream, name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleTogglePin = async () => {
    const newPinned = !isPinnedItem;
    await pinWorkstream(workstream.id, newPinned);
    if (newPinned) {
      pinInToday(workstream.id, workstream.name);
    } else {
      unpinInToday(workstream.id);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this workstream? The activity events will be preserved.')) {
      await deleteWorkstream(workstream.id);
      onBack?.();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-stroke-hairline">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className={cn(
              'p-2 rounded-md text-fg-dim',
              'hover:bg-graphite-2 hover:text-porcelain transition-colors'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') {
                    setEditName(workstream.name);
                    setIsEditing(false);
                  }
                }}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg bg-graphite-2 border border-stroke-hairline',
                  'text-porcelain text-lg font-semibold',
                  'focus:outline-none focus:border-accent-teal'
                )}
                autoFocus
              />
              <button
                onClick={handleSaveRename}
                className="p-2 text-success hover:bg-success/10 rounded-md"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditName(workstream.name);
                  setIsEditing(false);
                }}
                className="p-2 text-fg-dim hover:bg-graphite-2 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-porcelain">{workstream.name}</h1>
                {workstream.isPinned && <Pin className="w-4 h-4 text-accent-magenta" />}
                {workstream.isAuto && (
                  <span className="text-2xs text-fg-ghost uppercase tracking-wider">Auto</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-fg-dim">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(workstream.lastActive / 1000)}
                </span>
                <span>{workstream.eventCount} actions</span>
                <span>{formatDuration(workstream.durationMs)}</span>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
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
                title={isPinnedItem ? 'Unpin' : 'Pin'}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className={cn(
                  'p-2 rounded-md text-fg-dim',
                  'hover:bg-error/10 hover:text-error transition-colors'
                )}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {workstream.description && (
          <p className="text-sm text-fg-muted mt-2">{workstream.description}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Top Folders */}
        {workstream.topFolders.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-accent-amber" />
              Top Folders
            </h2>
            <div className="space-y-2">
              {workstream.topFolders.map(([folder, count]) => {
                const folderName = folder.split(/[/\\]/).pop() || folder;
                return (
                  <div
                    key={folder}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg',
                      'bg-graphite-1 border border-stroke-hairline'
                    )}
                  >
                    <FolderOpen className="w-4 h-4 text-accent-amber shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg-muted truncate">{folderName}</p>
                      <p className="text-xs text-fg-ghost truncate">{folder}</p>
                    </div>
                    <span className="text-sm text-fg-dim">{count}x</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top Files */}
        {workstream.topFiles.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-accent-teal" />
              Top Files
            </h2>
            <div className="space-y-1">
              {workstream.topFiles.map(([path, count]) => {
                const filename = path.split(/[/\\]/).pop() || path;
                const directory = path.split(/[/\\]/).slice(0, -1).join('/');
                return (
                  <button
                    key={path}
                    onClick={() => onOpenFile?.(path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                      'hover:bg-graphite-1 transition-colors group'
                    )}
                  >
                    <FileText className="w-4 h-4 text-fg-dim group-hover:text-accent-teal shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg-muted group-hover:text-porcelain truncate">
                        {filename}
                      </p>
                      <p className="text-xs text-fg-ghost truncate">{directory}</p>
                    </div>
                    <span className="text-sm text-fg-dim">{count}x</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Top Queries */}
        {workstream.topQueries.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-accent-violet" />
              Top Queries
            </h2>
            <div className="flex flex-wrap gap-2">
              {workstream.topQueries.map(([queryHash, count]) => (
                <span
                  key={queryHash}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                    'bg-accent-violet/10 text-accent-violet border border-accent-violet/20'
                  )}
                >
                  <Search className="w-3.5 h-3.5" />
                  Query #{queryHash.slice(0, 6)}
                  <span className="text-accent-violet/70">({count}x)</span>
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
