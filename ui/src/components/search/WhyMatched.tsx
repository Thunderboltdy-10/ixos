import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, Brain, Type, FolderTree, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Evidence, ScoreBreakdown } from '@/lib/types';

interface WhyMatchedProps {
  evidence: Evidence;
  scoreBreakdown: ScoreBreakdown;
}

interface EvidenceBarProps {
  label: string;
  score: number;
  icon: React.ElementType;
  color: string;
  details?: string;
}

function EvidenceBar({ label, score, icon: Icon, color, details }: EvidenceBarProps) {
  const percentage = Math.round(score * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('w-3.5 h-3.5', color)} />
          <span className="text-fg-muted">{label}</span>
        </div>
        <span className="font-mono text-fg-dim">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-graphite-2 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color.replace('text-', 'bg-'))}
        />
      </div>
      {details && (
        <p className="text-2xs text-fg-dim pl-5 truncate" title={details}>
          {details}
        </p>
      )}
    </div>
  );
}

export function WhyMatched({ evidence, scoreBreakdown }: WhyMatchedProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract evidence details for display
  const semanticDetails = evidence.semanticPassage
    ? `"${evidence.semanticPassage.slice(0, 80)}${evidence.semanticPassage.length > 80 ? '...' : ''}"`
    : undefined;

  const lexicalDetails = evidence.matchedTerms?.length
    ? `Terms: ${evidence.matchedTerms.join(', ')}`
    : evidence.lexicalHitCount
    ? `${evidence.lexicalHitCount} keyword matches`
    : undefined;

  const pathDetails = evidence.pathTags?.length
    ? `Matched: ${evidence.pathTags.slice(0, 3).join(', ')}${evidence.pathTags.length > 3 ? '...' : ''}`
    : undefined;

  // Calculate normalized scores for display
  // The scoreBreakdown already has weighted values, but we want to show them as percentages
  const totalWeight = 0.4 + 0.3 + 0.1 + 0.2; // semantic + integrity + temporal + behavior
  const normalizedSemantic = scoreBreakdown.semantic;
  const normalizedIntegrity = scoreBreakdown.integrity;
  const normalizedTemporal = scoreBreakdown.temporal;
  const normalizedBehavior = scoreBreakdown.behavior;

  return (
    <div className="mt-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'flex items-center gap-1.5 text-xs text-fg-dim hover:text-fg-muted transition-colors',
          isOpen && 'text-accent-teal'
        )}
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Why this matched</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 bg-graphite-2/30 border border-stroke-hairline/50 rounded-md space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-2xs text-fg-dim uppercase tracking-widest font-semibold">
                  Evidence Breakdown
                </span>
                {evidence.explanation && (
                  <span className="text-2xs text-fg-dim italic max-w-[60%] truncate" title={evidence.explanation}>
                    {evidence.explanation}
                  </span>
                )}
              </div>

              {/* Evidence bars */}
              <div className="space-y-2.5">
                <EvidenceBar
                  label="Semantic"
                  score={normalizedSemantic}
                  icon={Brain}
                  color="text-accent-teal"
                  details={semanticDetails}
                />

                {(lexicalDetails || (evidence.lexicalHitCount && evidence.lexicalHitCount > 0)) && (
                  <EvidenceBar
                    label="Lexical"
                    score={normalizedIntegrity * 0.8} // Use integrity as proxy for lexical match quality
                    icon={Type}
                    color="text-accent-violet"
                    details={lexicalDetails}
                  />
                )}

                {pathDetails && (
                  <EvidenceBar
                    label="Path"
                    score={0.5} // Path matching doesn't have a direct score, use 50%
                    icon={FolderTree}
                    color="text-accent-amber"
                    details={pathDetails}
                  />
                )}

                <EvidenceBar
                  label="Recency"
                  score={normalizedTemporal}
                  icon={Clock}
                  color="text-accent-magenta"
                />

                <EvidenceBar
                  label="Pattern"
                  score={normalizedBehavior}
                  icon={Activity}
                  color="text-success"
                />
              </div>

              {/* File type indicator */}
              {evidence.fileType && (
                <div className="pt-2 border-t border-stroke-hairline/30">
                  <span className="text-2xs text-fg-dim">
                    File type: <span className="text-fg-muted font-mono">.{evidence.fileType}</span>
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
