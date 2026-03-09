import { useEffect, useMemo, useState } from 'react';
import { Lock, Plus, RefreshCw } from 'lucide-react';
import { WorkstreamsSurface, type IxosWorkstreamRow } from '@ixos/ixos-ui';
import { useWorkstreamStore } from '@/stores/workstreamStore';
import { useAuthStore } from '@/stores/authStore';
import { CreateWorkstreamModal } from './CreateWorkstreamModal';
import { cn, formatRelativeTime } from '@/lib/utils';
import { hasProAccess } from '@/lib/proAccess';
import * as tauri from '@/lib/tauri';

interface WorkstreamsListProps {
  onSelectWorkstream?: (id: string) => void;
  onOpenFile?: (path: string) => void;
}

export function WorkstreamsList({ onSelectWorkstream }: WorkstreamsListProps) {
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

  useEffect(() => {
    if (isPro) {
      void loadWorkstreams();
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
        ['file_opened', 'result_clicked', 'result_shown', 'file_revealed', 'file_modified'],
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

  const summary = useMemo(() => {
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

    return [
      { label: 'Workstreams', value: String(workstreams.length), hint: `${autoCount} auto clusters` },
      { label: 'Activity', value: String(actionCount), hint: 'Search + open actions' },
      { label: 'Files Linked', value: String(uniqueFiles.size), hint: 'Unique files across streams' },
      { label: 'Active 24h', value: String(activeLast24h), hint: 'Recently active streams' },
    ];
  }, [workstreams]);

  const rows = useMemo<IxosWorkstreamRow[]>(
    () =>
      workstreams.map((ws) => {
        const hoursAgo = Math.max(1, Math.round((Date.now() - ws.lastActive) / (1000 * 60 * 60)));
        const status: IxosWorkstreamRow['status'] = hoursAgo <= 6 ? 'active' : hoursAgo <= 24 ? 'warm' : 'cold';
        return {
          id: ws.id,
          name: ws.name,
          status,
          files: ws.topFiles.length,
          actions: ws.eventCount,
          lastActive: formatRelativeTime(ws.lastActive / 1000),
          detail: ws.description || `${ws.topFolders.length} folders · ${ws.durationMs > 0 ? Math.round(ws.durationMs / 60000) : 0} min tracked`,
        };
      }),
    [workstreams],
  );

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <Lock className="w-12 h-12 mx-auto mb-4 text-accent-amber" />
          <h2 className="text-xl font-semibold text-porcelain mb-2">Workstreams</h2>
          <p className="text-fg-muted mb-6">
            Upgrade to Pro to automatically track your work sessions and recover clustered context.
          </p>
          <button
            type="button"
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

  if (error && !workstreams.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-fg-muted mb-2">Unable to load workstreams</p>
        <p className="text-xs text-fg-dim">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void handleRecluster()}
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
          type="button"
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

      <WorkstreamsSurface
        rows={rows}
        selectedId={currentWorkstream?.id}
        onSelectRow={(id) => onSelectWorkstream?.(id)}
        summary={summary}
        sourcePath="source: ui/src/components/workstreams/WorkstreamsList.tsx + src-tauri/src/commands/workstreams.rs"
      />

      {isLoading && (
        <p className="mt-3 text-xs text-fg-dim">Refreshing workstreams...</p>
      )}

      <CreateWorkstreamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateWorkstream}
        recentFiles={recentFiles}
      />
    </div>
  );
}
