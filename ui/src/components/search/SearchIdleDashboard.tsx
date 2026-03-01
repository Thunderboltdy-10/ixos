import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock3, Layers, Search, Sparkles } from 'lucide-react';
import { useStarredStore, type SearchThread } from '@/stores/starredStore';
import { useTodayStore } from '@/stores/todayStore';
import { useWorkstreamStore } from '@/stores/workstreamStore';
import { useAuthStore } from '@/stores/authStore';
import { hasProAccess } from '@/lib/proAccess';

interface SearchIdleDashboardProps {
  directory: string;
  onApplyQuery: (query: string) => void;
  onResumeThread: (thread: SearchThread) => void;
}

const STARTER_QUERIES = [
  'authentication token refresh',
  'rate limiter middleware',
  'session recovery flow',
  'journalist mode privacy',
];

function relativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  const minutes = Math.floor(delta / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function SearchIdleDashboard({ directory, onApplyQuery, onResumeThread }: SearchIdleDashboardProps) {
  const threads = useStarredStore((state) => state.threads);
  const todayData = useTodayStore((state) => state.data);
  const workstreams = useWorkstreamStore((state) => state.workstreams);

  const entitlement = useAuthStore((state) => state.entitlement);
  const entitlementToken = useAuthStore((state) => state.entitlementToken);
  const proStatus = useAuthStore((state) => state.proStatus);
  const isPro = hasProAccess(entitlement, entitlementToken, proStatus);

  const recentThreads = useMemo(
    () => threads.filter((thread) => !thread.starred).slice(0, 6),
    [threads],
  );

  const pinnedThreads = useMemo(
    () => threads.filter((thread) => thread.starred).slice(0, 3),
    [threads],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="h-full overflow-auto rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.035] via-white/[0.02] to-transparent p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-fg-ghost">Search Dashboard</p>
          <h2 className="mt-1 text-xl font-semibold text-porcelain">Ready for local evidence search</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {directory
              ? `Target folder: ${directory}`
              : 'Choose a folder, then type a query to stream ranked results.'}
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          {STARTER_QUERIES.slice(0, 2).map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => onApplyQuery(query)}
              className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-fg-secondary hover:border-accent-teal/30 hover:text-porcelain"
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-xl border border-white/10 bg-graphite-1/58 p-4">
          <div className="mb-3 flex items-center gap-2 text-fg-secondary">
            <Clock3 className="h-4 w-4 text-accent-teal" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">Recent Searches</h3>
          </div>

          {recentThreads.length > 0 ? (
            <div className="space-y-2">
              {recentThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onResumeThread(thread)}
                  className="w-full rounded-lg border border-white/8 bg-graphite-2/40 px-3 py-2 text-left transition-colors hover:border-accent-teal/30 hover:bg-graphite-2/65"
                >
                  <p className="truncate text-sm font-semibold text-porcelain">{thread.query}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-fg-dim">
                    <span>{thread.resultCount} results</span>
                    <span>{relativeTime(thread.timestamp)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-fg-dim">No recent searches yet. Try one of the starter queries.</p>
          )}
        </section>

        <section className="grid gap-4">
          {isPro ? (
            <>
              <div className="rounded-xl border border-accent-violet/28 bg-accent-violet/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent-violet" />
                  <h3 className="text-sm font-semibold text-porcelain">Today Snapshot</h3>
                  <span className="rounded-full border border-accent-magenta/30 bg-accent-magenta/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-magenta">
                    Pro
                  </span>
                </div>
                <p className="text-xs text-fg-secondary">
                  {todayData
                    ? `${todayData.recentlyTouched.length} files touched, ${todayData.suggestedNext.length} suggested next.`
                    : 'Today context will populate as you search and open files.'}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-graphite-1/58 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent-teal" />
                  <h3 className="text-sm font-semibold text-porcelain">Workstreams</h3>
                </div>
                <p className="text-xs text-fg-secondary">
                  {workstreams.length > 0
                    ? `${workstreams.length} active workstreams available for resume.`
                    : 'No clustered workstreams yet. They appear automatically after repeated activity.'}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-white/10 bg-graphite-1/58 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Search className="h-4 w-4 text-accent-amber" />
                <h3 className="text-sm font-semibold text-porcelain">Starter Queries</h3>
              </div>
              <div className="space-y-2">
                {STARTER_QUERIES.map((query) => (
                  <button
                    key={query}
                    type="button"
                    onClick={() => onApplyQuery(query)}
                    className="w-full rounded-md border border-white/8 bg-graphite-2/38 px-3 py-2 text-left text-xs text-fg-secondary hover:border-accent-amber/28 hover:text-porcelain"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pinnedThreads.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-graphite-1/58 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-secondary">Starred</p>
              <div className="space-y-2">
                {pinnedThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => onResumeThread(thread)}
                    className="w-full rounded-md border border-accent-amber/18 bg-accent-amber/8 px-3 py-2 text-left text-xs text-accent-amber/90 hover:bg-accent-amber/12"
                  >
                    {thread.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </motion.section>
  );
}
