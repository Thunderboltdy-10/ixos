import { useEffect, useState, useCallback, useMemo } from 'react';
import { Sparkles, FolderTree, Pin } from 'lucide-react';
import { TodaySurface, type IxosTodayRow, type IxosTodaySignal } from '@ixos/ixos-ui';
import { useTodayStore } from '@/stores/todayStore';
import { useAuthStore } from '@/stores/authStore';
import { TodayEmptyState } from './TodayEmptyState';
import { DailyBrief } from './DailyBrief';
import { cn } from '@/lib/utils';
import * as tauri from '@/lib/tauri';
import { hasProAccess } from '@/lib/proAccess';

interface TodayTabProps {
  onStartSearch?: () => void;
  onOpenFile?: (path: string) => void;
  onSelectWorkstream?: (id: string) => void;
}

export function TodayTab({ onStartSearch, onOpenFile, onSelectWorkstream }: TodayTabProps) {
  const { data, isLoading, error, initialize, pinnedItems, shouldShowBrief, markBriefSeen } = useTodayStore();
  const entitlement = useAuthStore((s) => s.entitlement);
  const entitlementToken = useAuthStore((s) => s.entitlementToken);
  const proStatus = useAuthStore((s) => s.proStatus);
  const isPro = hasProAccess(entitlement, entitlementToken, proStatus);

  const [showDailyBrief, setShowDailyBrief] = useState(false);
  const [workstreamCount, setWorkstreamCount] = useState(0);
  const [filesTouchedYesterday, setFilesTouchedYesterday] = useState(0);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (isPro && data && shouldShowBrief()) {
      tauri.getWorkstreamsStats().then((stats) => {
        setWorkstreamCount(stats.totalCount);
      }).catch(() => {});

      setFilesTouchedYesterday(data.recentlyTouched?.length || 0);
      setShowDailyBrief(true);
    }
  }, [isPro, data, shouldShowBrief]);

  const handleDismissBrief = useCallback(() => {
    setShowDailyBrief(false);
    markBriefSeen();
  }, [markBriefSeen]);

  const handleResume = useCallback(() => {
    if (data?.resume.workstream && onSelectWorkstream) {
      onSelectWorkstream(data.resume.workstream.id);
    }
  }, [data, onSelectWorkstream]);

  if (!isPro) {
    return (
      <div className="relative flex flex-col items-center justify-center h-full p-8">
        <div className="absolute inset-0 bg-graphite-1/80 backdrop-blur-sm z-10" />
        <div className="relative z-20 text-center max-w-md">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-accent-amber" />
          <h2 className="text-xl font-semibold text-porcelain mb-2">Second Brain</h2>
          <p className="text-fg-muted mb-6">
            Upgrade to Pro to unlock Today: daily resume context, activity-driven recommendations, and workstream continuity.
          </p>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-pricing'));
            }}
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

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-fg-dim">Loading your day...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-fg-muted mb-4">Unable to load Today data</p>
        <p className="text-xs text-fg-dim">{error}</p>
      </div>
    );
  }

  const hasContent = data && (
    data.resume.workstream ||
    data.recentlyTouched.length > 0 ||
    data.suggestedNext.length > 0 ||
    data.moveRecommendations.length > 0 ||
    pinnedItems.length > 0
  );

  if (!hasContent) {
    return <TodayEmptyState onStartSearch={onStartSearch} />;
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const signals = useMemo<IxosTodaySignal[]>(() => ([
    {
      label: 'Signals Today',
      value: String(data?.recentlyTouched.length ?? 0),
      hint: 'Recently touched files',
    },
    {
      label: 'Suggested Next',
      value: String(data?.suggestedNext.length ?? 0),
      hint: 'Predicted follow-up files',
    },
    {
      label: 'Move Hints',
      value: String(data?.moveRecommendations.length ?? 0),
      hint: 'Folder reorganization ideas',
    },
  ]), [data?.moveRecommendations.length, data?.recentlyTouched.length, data?.suggestedNext.length]);

  const resumeRows = useMemo<IxosTodayRow[]>(() => {
    if (!data) return [];
    const rows: IxosTodayRow[] = [];
    if (data.resume.workstream) {
      rows.push({
        id: data.resume.workstream.id,
        title: data.resume.workstream.name,
        meta: `${data.resume.workstream.eventCount} actions · ${new Date(data.resume.workstream.lastActive).toLocaleTimeString()}`,
        detail: 'Jump back to this active stream with full context.',
      });
    }
    for (const file of data.resume.topFiles.slice(0, 3)) {
      rows.push({
        id: file.path,
        title: file.path.split(/[/\\]/).pop() || file.path,
        meta: file.path,
        detail: `${file.touchCount} touches in this stream`,
      });
    }
    return rows;
  }, [data]);

  const recentRows = useMemo<IxosTodayRow[]>(
    () =>
      (data?.recentlyTouched ?? []).slice(0, 5).map((file) => ({
        id: file.path,
        title: file.path.split(/[/\\]/).pop() || file.path,
        meta: file.path,
        detail: `${file.touchCount} touches · ${Math.max(1, file.actions.length)} actions`,
      })),
    [data?.recentlyTouched],
  );

  const suggestedRows = useMemo<IxosTodayRow[]>(
    () =>
      (data?.suggestedNext ?? []).slice(0, 5).map((file) => ({
        id: file.path,
        title: file.name,
        meta: file.path,
        detail: `${Math.round(file.score * 100)}% confidence via ${file.reason}`,
      })),
    [data?.suggestedNext],
  );

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <DailyBrief
        isVisible={showDailyBrief}
        workstreamCount={workstreamCount}
        filesTouchedYesterday={filesTouchedYesterday}
        topWorkstream={data?.resume.workstream || null}
        onResume={handleResume}
        onStartFresh={() => { onStartSearch?.(); }}
        onDismiss={handleDismissBrief}
      />

      <TodaySurface
        dateLabel={dateStr}
        signals={signals}
        resumeRows={resumeRows}
        recentRows={recentRows}
        suggestedRows={suggestedRows}
        sourcePath="source: ui/src/components/today/TodayTab.tsx + ui/src/stores/todayStore.ts"
      />

      {pinnedItems.length > 0 && (
        <section className="mt-4 rounded-xl border border-stroke-hairline bg-graphite-1/70 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Pin className="h-4 w-4 text-accent-amber" />
            <h3 className="text-sm font-semibold text-porcelain">Pinned Context</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {pinnedItems.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.type === 'file' && item.path) {
                    onOpenFile?.(item.path);
                    return;
                  }
                  if (item.type === 'workstream') {
                    const id = item.id.replace('workstream:', '');
                    onSelectWorkstream?.(id);
                  }
                }}
                className="rounded-lg border border-white/10 bg-graphite-2/45 px-3 py-2 text-left text-xs text-fg-secondary hover:border-accent-teal/35 hover:text-porcelain"
              >
                <p className="truncate font-medium text-porcelain">{item.name}</p>
                <p className="truncate text-fg-dim">{item.type === 'file' ? item.path : 'workstream'}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {data?.moveRecommendations && data.moveRecommendations.length > 0 && (
        <section className="mt-4 rounded-xl border border-white/10 bg-graphite-1/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-accent-teal" />
            <h3 className="text-sm font-semibold text-porcelain">Suggested Reorganization</h3>
          </div>
          <div className="space-y-2">
            {data.moveRecommendations.slice(0, 4).map((rec) => (
              <div
                key={`${rec.filePath}:${rec.suggestedFolder}`}
                className="rounded-lg border border-white/8 bg-graphite-2/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-porcelain">{rec.filePath}</p>
                    <p className="mt-1 text-2xs text-fg-dim">
                      {rec.currentFolder} {'->'} {rec.suggestedFolder}
                    </p>
                    <p className="mt-1 text-2xs text-fg-ghost">{rec.reason}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xs font-semibold text-accent-teal">
                      {Math.round(rec.confidence * 100)}%
                    </p>
                    <p className="text-2xs text-fg-dim">{rec.evidenceCount} signals</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

