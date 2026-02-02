/**
 * Today Tab - Phase 2 Second Brain
 *
 * Default view for Pro users showing:
 * - Resume section (last workstream + top files)
 * - Recently touched files
 * - Suggested next files (based on co-occurrence)
 * - Pinned items
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';
import { useTodayStore } from '@/stores/todayStore';
import { useAuthStore } from '@/stores/authStore';
import { ResumeSection } from './ResumeSection';
import { RecentlyTouched } from './RecentlyTouched';
import { SuggestedNext } from './SuggestedNext';
import { PinnedSection } from './PinnedSection';
import { TodayEmptyState } from './TodayEmptyState';
import { cn } from '@/lib/utils';

interface TodayTabProps {
  onStartSearch?: () => void;
  onOpenFile?: (path: string) => void;
  onSelectWorkstream?: (id: string) => void;
}

export function TodayTab({ onStartSearch, onOpenFile, onSelectWorkstream }: TodayTabProps) {
  const { data, isLoading, error, initialize, pinnedItems } = useTodayStore();
  const proStatus = useAuthStore((s) => s.proStatus);
  const isPro = proStatus?.status === 'active' || proStatus?.status === 'grace';

  // Initialize Today data on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show upgrade overlay for non-Pro users
  if (!isPro) {
    return (
      <div className="relative flex flex-col items-center justify-center h-full p-8">
        <div className="absolute inset-0 bg-graphite-1/80 backdrop-blur-sm z-10" />
        <div className="relative z-20 text-center max-w-md">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-accent-amber" />
          <h2 className="text-xl font-semibold text-porcelain mb-2">
            Second Brain
          </h2>
          <p className="text-fg-muted mb-6">
            Upgrade to Pro to unlock the Today Tab - your daily companion for resuming work,
            tracking recent files, and discovering related content.
          </p>
          <button
            onClick={() => {
              // Trigger upgrade flow
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

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-fg-dim">Loading your day...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-fg-muted mb-4">Unable to load Today data</p>
        <p className="text-xs text-fg-dim">{error}</p>
      </div>
    );
  }

  // Empty state for new users
  const hasContent = data && (
    data.resume.workstream ||
    data.recentlyTouched.length > 0 ||
    data.suggestedNext.length > 0 ||
    pinnedItems.length > 0
  );

  if (!hasContent) {
    return <TodayEmptyState onStartSearch={onStartSearch} />;
  }

  // Format today's date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full overflow-auto p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-5 h-5 text-accent-amber" />
        <div>
          <h1 className="text-lg font-semibold text-porcelain">Today</h1>
          <p className="text-xs text-fg-dim">{dateStr}</p>
        </div>
      </div>

      {/* Content sections */}
      <div className="space-y-6 flex-1">
        {/* Resume section - most important */}
        {data?.resume.workstream && (
          <ResumeSection
            workstream={data.resume.workstream}
            topFiles={data.resume.topFiles}
            onOpenFile={onOpenFile}
            onSelectWorkstream={onSelectWorkstream}
          />
        )}

        {/* Pinned items */}
        {pinnedItems.length > 0 && (
          <PinnedSection
            items={pinnedItems}
            onOpenFile={onOpenFile}
            onSelectWorkstream={onSelectWorkstream}
          />
        )}

        {/* Recently touched */}
        {data?.recentlyTouched && data.recentlyTouched.length > 0 && (
          <RecentlyTouched
            files={data.recentlyTouched}
            onOpenFile={onOpenFile}
          />
        )}

        {/* Suggested next */}
        {data?.suggestedNext && data.suggestedNext.length > 0 && (
          <SuggestedNext
            suggestions={data.suggestedNext}
            onOpenFile={onOpenFile}
          />
        )}
      </div>
    </motion.div>
  );
}
