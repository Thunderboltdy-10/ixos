import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Clock3, FileText, Folder, RotateCcw, Sparkles } from 'lucide-react';
import { AmbientIxosField } from '@ixos/ixos-ui';
import { cn } from '@/lib/utils';
import type { Workstream } from '@/lib/types';

interface DailyBriefProps {
  isVisible: boolean;
  workstreamCount: number;
  filesTouchedYesterday: number;
  topWorkstream: Workstream | null;
  onResume: () => void;
  onStartFresh: () => void;
  onDismiss: () => void;
}

function formatLastActive(timestamp: number) {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'just now';
}

export function DailyBrief({
  isVisible,
  workstreamCount,
  filesTouchedYesterday,
  topWorkstream,
  onResume,
  onStartFresh,
  onDismiss,
}: DailyBriefProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (!isVisible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVisible, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-graphite-0/82 p-4 backdrop-blur-sm"
        >
          <motion.section
            initial={{ opacity: 0, y: 26, scale: 0.98, rotateX: -3 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[720px] overflow-hidden rounded-2xl border border-white/16 bg-graphite-1/90 shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
          >
            <div className="pointer-events-none absolute inset-0">
              <AmbientIxosField mode="contained" className="opacity-45" />
              <div className="absolute inset-0 bg-gradient-to-b from-graphite-0/42 via-graphite-1/62 to-graphite-0/86" />
            </div>

            <div className="relative p-6 sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-teal/35 bg-accent-teal/14 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-accent-teal">
                    <Sparkles className="h-3.5 w-3.5" />
                    Daily Brief
                  </p>
                  <h2 className="text-2xl font-semibold text-porcelain">{greeting}</h2>
                  <p className="mt-1 text-sm text-fg-secondary">Resume context instantly or start a clean session.</p>
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-md border border-white/16 px-2.5 py-1 text-xs text-fg-muted hover:border-white/28 hover:text-porcelain"
                >
                  Esc
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-white/14 bg-graphite-2/55 p-4">
                  <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-fg-ghost">
                    <Folder className="h-3.5 w-3.5 text-accent-teal" />
                    Active Workstreams
                  </p>
                  <p className="text-3xl font-semibold text-porcelain">{workstreamCount}</p>
                </article>
                <article className="rounded-xl border border-white/14 bg-graphite-2/55 p-4">
                  <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-fg-ghost">
                    <FileText className="h-3.5 w-3.5 text-accent-amber" />
                    Files Touched Yesterday
                  </p>
                  <p className="text-3xl font-semibold text-porcelain">{filesTouchedYesterday}</p>
                </article>
              </div>

              {topWorkstream && (
                <article className="mt-4 rounded-xl border border-accent-teal/28 bg-accent-teal/10 p-4">
                  <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent-teal/35 bg-accent-teal/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-accent-teal">
                    <Clock3 className="h-3.5 w-3.5" />
                    Continue Where You Left Off
                  </p>
                  <h3 className="truncate text-base font-semibold text-porcelain">{topWorkstream.name}</h3>
                  <p className="mt-1 text-xs text-fg-secondary">
                    {formatLastActive(topWorkstream.lastActive)} · {topWorkstream.eventCount} activities
                  </p>
                </article>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    onStartFresh();
                    onDismiss();
                  }}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-lg border border-white/16 bg-graphite-2/58 px-4 py-3 text-sm text-fg-secondary',
                    'hover:border-white/26 hover:text-porcelain'
                  )}
                >
                  <RotateCcw className="h-4 w-4" />
                  Start Fresh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResume();
                    onDismiss();
                  }}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-lg border border-accent-teal/38 bg-accent-teal/16 px-4 py-3 text-sm font-semibold text-accent-teal',
                    'hover:bg-accent-teal/20'
                  )}
                >
                  {topWorkstream ? 'Resume Stream' : 'Get Started'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
