/**
 * Suggested Next - Files you might want to open based on co-occurrence patterns
 */

import { motion } from 'framer-motion';
import { Lightbulb, FileText, ArrowRight } from 'lucide-react';
import type { SuggestedFile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SuggestedNextProps {
  suggestions: SuggestedFile[];
  onOpenFile?: (path: string) => void;
}

export function SuggestedNext({ suggestions, onOpenFile }: SuggestedNextProps) {
  if (suggestions.length === 0) return null;

  const getReasonLabel = (reason: SuggestedFile['reason']): string => {
    switch (reason) {
      case 'co-open':
        return 'Often opened together';
      case 'co-edit':
        return 'Edited in same session';
      case 'frequent':
        return 'Frequently accessed';
      default:
        return 'Related';
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      {/* Section header */}
      <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-accent-violet" />
        Suggested Next
      </h2>

      {/* Suggestions */}
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            onClick={() => onOpenFile?.(suggestion.path)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left',
              'bg-accent-violet/5 border border-accent-violet/20',
              'hover:bg-accent-violet/10 hover:border-accent-violet/30',
              'transition-all group'
            )}
          >
            <FileText className="w-4 h-4 text-accent-violet shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-sm text-fg-muted group-hover:text-porcelain truncate">
                {suggestion.name}
              </p>
              <p className="text-xs text-fg-ghost flex items-center gap-1">
                <span>{getReasonLabel(suggestion.reason)}</span>
                {suggestion.coOccurredWith && (
                  <>
                    <ArrowRight className="w-3 h-3" />
                    <span className="truncate">{suggestion.coOccurredWith.split(/[/\\]/).pop()}</span>
                  </>
                )}
              </p>
            </div>

            {/* Confidence indicator */}
            <div className="shrink-0 flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    i < Math.ceil(suggestion.score * 3)
                      ? 'bg-accent-violet'
                      : 'bg-graphite-3'
                  )}
                />
              ))}
            </div>
          </motion.button>
        ))}
      </div>
      <p className="text-2xs text-fg-ghost">
        Suggestions improve as Ixos observes repeated file-open patterns in your workflow.
      </p>
    </motion.section>
  );
}
