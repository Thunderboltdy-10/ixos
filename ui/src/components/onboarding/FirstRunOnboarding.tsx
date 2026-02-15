import { motion, AnimatePresence } from 'framer-motion';
import { Search, Database, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FirstRunOnboardingProps {
  isOpen: boolean;
  step: 1 | 2 | 3;
  firstQuery: string | null;
  firstDurationMs: number | null;
  secondDurationMs: number | null;
  firstCacheHits: number;
  secondCacheHits: number;
  onFocusSearch: () => void;
  onComplete: () => void;
}

function fmtDuration(ms: number | null): string {
  if (!ms || ms <= 0) return 'n/a';
  return `${(ms / 1000).toFixed(2)}s`;
}

export function FirstRunOnboarding({
  isOpen,
  step,
  firstQuery,
  firstDurationMs,
  secondDurationMs,
  firstCacheHits,
  secondCacheHits,
  onFocusSearch,
  onComplete,
}: FirstRunOnboardingProps) {
  if (!isOpen) return null;

  const speedup = firstDurationMs && secondDurationMs && secondDurationMs > 0
    ? Math.max(0, Math.round(((firstDurationMs - secondDurationMs) / secondDurationMs) * 100))
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm p-6 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          className="w-full max-w-2xl rounded-2xl border border-white/10 bg-graphite-1 shadow-lift p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-accent-teal/80">Onboarding</p>
              <h2 className="text-xl font-semibold text-porcelain">See Ixos In Two Searches</h2>
              <p className="mt-1 text-sm text-fg-muted">
                This walkthrough is mandatory once so users understand cache speed and contextual features.
              </p>
            </div>
            <span className="text-xs font-mono text-fg-ghost">{step}/3</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { id: 1, icon: Search, label: 'Cold Search' },
              { id: 2, icon: Database, label: 'Warm Search' },
              { id: 3, icon: Zap, label: 'Compare' },
            ].map((item) => (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  step >= item.id ? 'border-accent-teal/35 bg-accent-teal/10 text-porcelain' : 'border-white/8 bg-graphite-2/45 text-fg-muted'
                )}
              >
                <item.icon className="w-4 h-4 mb-1.5" />
                {item.label}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="mt-5 rounded-lg border border-white/10 bg-graphite-2/45 p-4">
              <p className="text-sm text-fg-secondary">
                Run your first search from the <span className="text-porcelain font-medium">Search</span> view.
                This establishes the cold-cache baseline.
              </p>
              <button
                type="button"
                onClick={onFocusSearch}
                className="mt-3 px-4 py-2 rounded-md bg-accent-teal text-graphite-0 text-sm font-semibold hover:bg-accent-teal/90 transition-colors"
              >
                Go To Search
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-5 rounded-lg border border-white/10 bg-graphite-2/45 p-4">
              <p className="text-sm text-fg-secondary">
                Great. Now run a second search (same query works best) so Ixos can show warm-cache behavior.
              </p>
              {firstQuery && (
                <p className="mt-2 text-xs text-fg-dim">
                  Suggested query: <span className="text-fg-secondary font-mono">{firstQuery}</span>
                </p>
              )}
              <button
                type="button"
                onClick={onFocusSearch}
                className="mt-3 px-4 py-2 rounded-md bg-accent-teal text-graphite-0 text-sm font-semibold hover:bg-accent-teal/90 transition-colors"
              >
                Run Second Search
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 rounded-lg border border-accent-teal/30 bg-accent-teal/8 p-4">
              <div className="flex items-center gap-2 text-accent-teal">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-semibold">Onboarding complete</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-white/10 bg-graphite-2/45 p-3">
                  <p className="text-fg-ghost">Cold search</p>
                  <p className="mt-1 text-fg-secondary font-mono">{fmtDuration(firstDurationMs)}</p>
                  <p className="text-fg-dim">{firstCacheHits} cache hits</p>
                </div>
                <div className="rounded-md border border-white/10 bg-graphite-2/45 p-3">
                  <p className="text-fg-ghost">Warm search</p>
                  <p className="mt-1 text-fg-secondary font-mono">{fmtDuration(secondDurationMs)}</p>
                  <p className="text-fg-dim">{secondCacheHits} cache hits</p>
                </div>
              </div>
              {speedup !== null && (
                <p className="mt-3 text-xs text-fg-secondary">
                  Observed speed gain: <span className="text-accent-teal font-semibold">{speedup}%</span>
                </p>
              )}
              <div className="mt-3 rounded-md border border-white/10 bg-graphite-2/45 p-3 text-left">
                <p className="text-2xs text-fg-ghost uppercase tracking-[0.12em]">What Pro Adds</p>
                <ul className="mt-1 space-y-1 text-2xs text-fg-dim">
                  <li>Ask Mode: question intent + answer cards with citations.</li>
                  <li>Today: resume context and suggested next files.</li>
                  <li>Workstreams: grouped sessions and folder move recommendations.</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onComplete}
                className="mt-4 px-4 py-2 rounded-md bg-accent-teal text-graphite-0 text-sm font-semibold hover:bg-accent-teal/90 transition-colors"
              >
                Continue with Ixos
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
