/**
 * Daily Brief - Phase 2 Second Brain
 *
 * Shows on first app open of day with a summary:
 * - Workstream count
 * - Files touched yesterday
 * - Top workstream to resume
 * - "Resume" and "Start Fresh" actions
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sunrise, ArrowRight, RotateCcw, Folder, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workstream } from '@/lib/types';

interface DailyBriefProps {
  /** Whether the brief should be shown */
  isVisible: boolean;
  /** Total number of workstreams */
  workstreamCount: number;
  /** Files touched yesterday */
  filesTouchedYesterday: number;
  /** Most recent workstream to resume */
  topWorkstream: Workstream | null;
  /** Callback when user clicks Resume */
  onResume: () => void;
  /** Callback when user clicks Start Fresh */
  onStartFresh: () => void;
  /** Callback to dismiss the brief */
  onDismiss: () => void;
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
  // Get greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Format last active time
  const formatLastActive = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Recently';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center',
            'bg-graphite-0/90 backdrop-blur-md'
          )}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className={cn(
              'w-full max-w-md mx-4 p-6 rounded-xl',
              'bg-graphite-1 border border-border/50',
              'shadow-2xl shadow-black/30'
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-accent-amber/10">
                <Sunrise className="w-6 h-6 text-accent-amber" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-porcelain">{greeting}</h2>
                <p className="text-sm text-fg-muted">Here's your daily brief</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className={cn(
                'p-4 rounded-lg bg-graphite-2/50',
                'border border-border/30'
              )}>
                <Folder className="w-4 h-4 text-accent-cyan mb-2" />
                <div className="text-2xl font-bold text-porcelain">
                  {workstreamCount}
                </div>
                <div className="text-xs text-fg-muted">
                  Active workstream{workstreamCount !== 1 ? 's' : ''}
                </div>
              </div>

              <div className={cn(
                'p-4 rounded-lg bg-graphite-2/50',
                'border border-border/30'
              )}>
                <FileText className="w-4 h-4 text-accent-lime mb-2" />
                <div className="text-2xl font-bold text-porcelain">
                  {filesTouchedYesterday}
                </div>
                <div className="text-xs text-fg-muted">
                  File{filesTouchedYesterday !== 1 ? 's' : ''} touched yesterday
                </div>
              </div>
            </div>

            {/* Top workstream to resume */}
            {topWorkstream && (
              <div className={cn(
                'p-4 rounded-lg mb-6',
                'bg-gradient-to-r from-accent-amber/10 to-transparent',
                'border border-accent-amber/20'
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-accent-amber" />
                      <span className="text-xs text-accent-amber">Continue where you left off</span>
                    </div>
                    <h3 className="font-medium text-porcelain truncate">
                      {topWorkstream.name}
                    </h3>
                    <p className="text-xs text-fg-muted mt-1">
                      {formatLastActive(topWorkstream.lastActive)} · {topWorkstream.eventCount} activities
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onStartFresh();
                  onDismiss();
                }}
                className={cn(
                  'flex-1 px-4 py-3 rounded-lg',
                  'bg-graphite-2 border border-border/50',
                  'text-fg-muted hover:text-porcelain hover:bg-graphite-2/80',
                  'transition-colors flex items-center justify-center gap-2'
                )}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start Fresh</span>
              </button>

              <button
                onClick={() => {
                  onResume();
                  onDismiss();
                }}
                className={cn(
                  'flex-1 px-4 py-3 rounded-lg',
                  'bg-accent-amber text-graphite-0 font-medium',
                  'hover:bg-accent-amber/90 transition-colors',
                  'flex items-center justify-center gap-2'
                )}
              >
                <span>{topWorkstream ? 'Resume' : 'Get Started'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Dismiss hint */}
            <p className="text-center text-xs text-fg-dim mt-4">
              Press <kbd className="px-1.5 py-0.5 rounded bg-graphite-2 text-fg-muted">Esc</kbd> to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
