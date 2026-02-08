/**
 * WorkstreamsList - Display all workstreams
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, RefreshCw, Lock, Plus } from 'lucide-react';
import { useWorkstreamStore } from '@/stores/workstreamStore';
import { useAuthStore } from '@/stores/authStore';
import { WorkstreamCard } from './WorkstreamCard';
import { CreateWorkstreamModal } from './CreateWorkstreamModal';
import { cn } from '@/lib/utils';
import { hasProAccess } from '@/lib/proAccess';

interface WorkstreamsListProps {
  onSelectWorkstream?: (id: string) => void;
  onOpenFile?: (path: string) => void;
}

export function WorkstreamsList({ onSelectWorkstream, onOpenFile }: WorkstreamsListProps) {
  const {
    workstreams,
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

  // Load workstreams on mount
  useEffect(() => {
    if (isPro) {
      loadWorkstreams();
    }
  }, [isPro, loadWorkstreams]);

  const handleRecluster = async () => {
    setIsReclustering(true);
    try {
      await recluster(30);
    } finally {
      setIsReclustering(false);
    }
  };

  const handleCreateWorkstream = async (name: string, description?: string) => {
    const result = await createWorkstream(name, description);
    if (!result) {
      throw new Error('Failed to create workstream');
    }
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
            New
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
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
      />
    </div>
  );
}
