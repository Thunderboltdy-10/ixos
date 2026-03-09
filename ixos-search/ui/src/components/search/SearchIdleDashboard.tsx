import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock3, Search, Sparkles } from 'lucide-react';
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[1260px] overflow-auto px-1 pb-2"
    >
      <div className="mb-4">
        <div>
          <h2 className="text-xl font-semibold text-porcelain">Ready for local evidence search</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {directory
              ? `Target folder: ${directory}`
              : 'Choose a folder, then type a query to stream ranked results.'}
          </p>
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

        <section className="rounded-xl border border-white/10 bg-graphite-1/58 p-4">
          {isPro ? (
            <>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-violet" />
                <h3 className="text-sm font-semibold text-porcelain">Today Snapshot</h3>
                <span className="rounded-full border border-accent-magenta/30 bg-accent-magenta/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-magenta">
                  Pro
                </span>
              </div>
              <p className="text-xs text-fg-secondary leading-relaxed">
                {todayData
                  ? `${todayData.recentlyTouched.length} files touched, ${todayData.suggestedNext.length} suggested next.`
                  : 'Today context will populate as you search and open files.'}
              </p>
              <p className="mt-3 text-xs text-fg-dim leading-relaxed">
                {workstreams.length > 0
                  ? `${workstreams.length} active workstreams available for resume.`
                  : 'No clustered workstreams yet. They appear automatically after repeated activity.'}
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
        </section>
      </div>
    </motion.section>
  );
}
