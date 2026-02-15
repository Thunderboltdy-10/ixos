/**
 * WorkstreamsList - Display all workstreams
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, RefreshCw, Lock, Plus } from 'lucide-react';
import { useWorkstreamStore } from '@/stores/workstreamStore';
import { useAuthStore } from '@/stores/authStore';
import { WorkstreamCard } from './WorkstreamCard';
import { CreateWorkstreamModal } from './CreateWorkstreamModal';
import { cn, formatRelativeTime } from '@/lib/utils';
import { hasProAccess } from '@/lib/proAccess';
import * as tauri from '@/lib/tauri';

interface WorkstreamsListProps {
  onSelectWorkstream?: (id: string) => void;
  onOpenFile?: (path: string) => void;
}

export function WorkstreamsList({ onSelectWorkstream, onOpenFile }: WorkstreamsListProps) {
  const {
    workstreams,
    currentWorkstream,
    isLoading,
    error,
    loadWorkstreams,
    recluster,
    createWorkstream,
  } = useWorkstreamStore();

  const entitlement = useAuthStore((s) => s.entitlement);
  const entitlementToken = useAuthStore((s) => s.entitlementToken);
  const proStatus = useAuthStore((s) => s.proStatus);
  const isPro = hasProAccess(entitlement, entitlementToken, proStatus);

  const [isReclustering, setIsReclustering] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recentFiles, setRecentFiles] = useState<Array<{ path: string; name: string; lastTouchedLabel: string }>>([]);
  const workstreamMetrics = useMemo(() => {
    let actionCount = 0;
    let autoCount = 0;
    let activeLast24h = 0;
    const uniqueFiles = new Set<string>();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    for (const ws of workstreams) {
      actionCount += ws.eventCount;
      if (ws.isAuto) autoCount += 1;
      if (ws.lastActive >= cutoff) activeLast24h += 1;
      for (const [path] of ws.topFiles) {
        uniqueFiles.add(path);
      }
    }

    return {
      actionCount,
      autoCount,
      manualCount: Math.max(0, workstreams.length - autoCount),
      activeLast24h,
      uniqueFiles: uniqueFiles.size,
    };
  }, [workstreams]);

  // Load workstreams on mount
  useEffect(() => {
    if (isPro) {
      loadWorkstreams();
    }
  }, [isPro, loadWorkstreams]);

  useEffect(() => {
    if (!showCreateModal || !isPro) return;
    tauri
      .getRecentlyTouched(16)
      .then((files) => {
        setRecentFiles(
          files.map((file) => ({
            path: file.path,
            name: file.path.split(/[/\\]/).pop() || file.path,
            lastTouchedLabel: formatRelativeTime(Math.floor(file.lastTouched / 1000)),
          }))
        );
      })
      .catch(() => setRecentFiles([]));
  }, [showCreateModal, isPro]);

  const handleRecluster = async () => {
    setIsReclustering(true);
    try {
      await recluster(30);
    } finally {
      setIsReclustering(false);
    }
  };

  const handleCreateWorkstream = async (name: string, description?: string, selectedFilePaths: string[] = []) => {
    let eventIds: string[] | undefined;
    if (selectedFilePaths.length > 0) {
      const events = await tauri.getActivity(
        { start: Date.now() - 7 * 24 * 60 * 60 * 1000 },
        ['file_opened', 'result_clicked', 'result_shown', 'file_revealed'],
        2000
      );
      const pathToEventId = new Map<string, string>();
      for (const event of events) {
        if (!pathToEventId.has(event.filePath)) {
          pathToEventId.set(event.filePath, event.id);
        }
      }
      eventIds = selectedFilePaths
        .map((path) => pathToEventId.get(path))
        .filter((id): id is string => Boolean(id));
    }

    const result = await createWorkstream(name, description, eventIds);
    if (!result) {
      throw new Error('Failed to create workstream');
    }
    onSelectWorkstream?.(result.id);
  };

  // Non-Pro users see locked state
  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <Lock className="w-12 h-12 mx-auto mb-4 text-accent-amber" />
          <h2 className="text-xl font-semibold text-porcelain mb-2">
            Workstreams
          </h2>
          <p className="text-fg-muted mb-6">
            Upgrade to Pro to automatically track your work sessions and discover
            patterns in how you navigate your files.
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-pricing'))}
            className={cn(
              'px-6 py-3 rounded-lg font-semibold',
              'bg-accent-amber text-graphite-0',
              'hover:bg-accent-amber/90 transition-colors'
            )}
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stroke-hairline">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent-teal" />
            <h2 className="text-lg font-semibold text-porcelain">Workstreams</h2>
            <span className="text-xs text-fg-dim bg-graphite-2 px-2 py-0.5 rounded-full">
              {workstreams.length}
            </span>
          </div>
          <p className="text-2xs text-fg-ghost">
            Auto-clustered sessions from your searches and file opens. Use them to jump back into a task in one click.
          </p>
          {currentWorkstream && (
            <p className="text-2xs text-accent-teal">
              Viewing: {currentWorkstream.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecluster}
            disabled={isReclustering}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
              'bg-graphite-2 text-fg-muted border border-stroke-hairline',
              'hover:bg-graphite-3 hover:text-porcelain transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isReclustering && 'animate-spin')} />
            Re-cluster
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
              'bg-accent-teal text-graphite-0',
              'hover:bg-accent-teal/90 transition-colors'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            New from Recent
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-white/8 bg-graphite-1/45 p-3">
            <p className="text-2xs text-fg-ghost uppercase tracking-[0.12em]">Workstreams</p>
            <p className="mt-1 text-lg font-semibold text-porcelain">{workstreams.length}</p>
            <p className="text-2xs text-fg-dim">{workstreamMetrics.autoCount} auto, {workstreamMetrics.manualCount} manual</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-graphite-1/45 p-3">
            <p className="text-2xs text-fg-ghost uppercase tracking-[0.12em]">Activity Signals</p>
            <p className="mt-1 text-lg font-semibold text-porcelain">{workstreamMetrics.actionCount}</p>
            <p className="text-2xs text-fg-dim">Search + open actions grouped</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-graphite-1/45 p-3">
            <p className="text-2xs text-fg-ghost uppercase tracking-[0.12em]">Files Linked</p>
            <p className="mt-1 text-lg font-semibold text-porcelain">{workstreamMetrics.uniqueFiles}</p>
            <p className="text-2xs text-fg-dim">Unique files across clusters</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-graphite-1/45 p-3">
            <p className="text-2xs text-fg-ghost uppercase tracking-[0.12em]">Active (24h)</p>
            <p className="mt-1 text-lg font-semibold text-porcelain">{workstreamMetrics.activeLast24h}</p>
            <p className="text-2xs text-fg-dim">Recently active workstreams</p>
          </div>
        </div>

        <div className="mb-4 grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-white/8 bg-graphite-1/45 p-3">
            <p className="text-xs font-semibold text-fg-secondary mb-1">How Files Get Added</p>
            <p className="text-2xs text-fg-dim">
              Every opened result and file action is tracked locally. Re-cluster regenerates sessions, while New from Recent lets you seed your own stream.
            </p>
          </div>
          <div className="rounded-lg border border-white/8 bg-graphite-1/45 p-3">
            <p className="text-xs font-semibold text-fg-secondary mb-1">Connections + Recommendations</p>
            <p className="text-2xs text-fg-dim">
              Today view shows connection maps, suggested next files, and folder-move recommendations inferred from repeated behavior.
            </p>
          </div>
        </div>

        {isLoading && workstreams.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-fg-dim">Loading workstreams...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-fg-muted mb-2">Unable to load workstreams</p>
            <p className="text-xs text-fg-dim">{error}</p>
          </div>
        ) : workstreams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="w-10 h-10 text-fg-ghost mb-3" />
            <p className="text-fg-muted mb-1">No workstreams yet</p>
            <p className="text-xs text-fg-dim">
              Start searching and opening files to create workstreams automatically
            </p>
            <p className="mt-2 text-2xs text-fg-ghost max-w-md">
              Tip: run several searches, open 3+ files, then click <span className="text-fg-secondary">Re-cluster</span> or create one from recent files.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {workstreams.map((workstream, index) => (
                <motion.div
                  key={workstream.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <WorkstreamCard
                    workstream={workstream}
                    onSelect={() => onSelectWorkstream?.(workstream.id)}
                    onOpenFile={onOpenFile}
                    isActive={currentWorkstream?.id === workstream.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateWorkstreamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateWorkstream}
        recentFiles={recentFiles}
      />
    </div>
  );
}
