import { useMemo, useState, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, Brain, ShieldCheck, Clock3, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMatchContributions, getPrimaryMatchSignal, type MatchSignal } from '@/lib/matchClassification';
import type { Evidence, ScoreBreakdown } from '@/lib/types';

interface WhyMatchedProps {
  evidence: Evidence;
  scoreBreakdown: ScoreBreakdown;
}

interface EvidenceBarProps {
  label: string;
  score: number;
  icon: ComponentType<{ className?: string }>;
  color: string;
  details?: string;
}

function EvidenceBar({ label, score, icon: Icon, color, details }: EvidenceBarProps) {
  const percentage = Math.round(score * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('h-3.5 w-3.5', color)} />
          <span className="text-fg-muted">{label}</span>
        </div>
        <span className="font-mono text-fg-dim">{percentage}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-graphite-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color.replace('text-', 'bg-'))}
        />
      </div>
      {details && (
        <p className="truncate pl-5 text-2xs text-fg-dim" title={details}>
          {details}
        </p>
      )}
    </div>
  );
}

const SIGNAL_VISUALS: Record<MatchSignal, { icon: ComponentType<{ className?: string }>; color: string }> = {
  semantic: { icon: Brain, color: 'text-accent-teal' },
  integrity: { icon: ShieldCheck, color: 'text-success' },
  temporal: { icon: Clock3, color: 'text-accent-amber' },
  behavior: { icon: Activity, color: 'text-accent-violet' },
};

export function WhyMatched({ evidence, scoreBreakdown }: WhyMatchedProps) {
  const [isOpen, setIsOpen] = useState(false);

  const contributions = useMemo(() => getMatchContributions(scoreBreakdown), [scoreBreakdown]);
  const primarySignal = useMemo(() => getPrimaryMatchSignal(scoreBreakdown), [scoreBreakdown]);

  const semanticDetails = evidence.semanticPassage
    ? `"${evidence.semanticPassage.slice(0, 88)}${evidence.semanticPassage.length > 88 ? '...' : ''}"`
    : undefined;

  const integrityDetails = useMemo(() => {
    const parts: string[] = [];
    if (evidence.matchedTerms?.length) {
      parts.push(`Terms: ${evidence.matchedTerms.slice(0, 4).join(', ')}`);
    }
    if (typeof evidence.lexicalHitCount === 'number' && evidence.lexicalHitCount > 0) {
      parts.push(`${evidence.lexicalHitCount} keyword matches`);
    }
    if (evidence.pathTags?.length) {
      parts.push(`Path: ${evidence.pathTags.slice(0, 3).join(', ')}`);
    }
    return parts.join(' | ') || undefined;
  }, [evidence.lexicalHitCount, evidence.matchedTerms, evidence.pathTags]);

  const behaviorDetails = evidence.explanation ?? undefined;

  const detailBySignal: Partial<Record<MatchSignal, string>> = {
    semantic: semanticDetails,
    integrity: integrityDetails,
    behavior: behaviorDetails,
  };

  return (
    <div className="mt-2">
      <button
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'flex items-center gap-1.5 text-xs text-fg-dim transition-colors hover:text-fg-muted',
          isOpen && 'text-accent-teal'
        )}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <span>Why this matched</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', isOpen && 'rotate-180')} />
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
            <div className="mt-3 space-y-3 rounded-md border border-stroke-hairline/50 bg-graphite-2/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xs font-semibold text-fg-dim">Evidence breakdown</span>
                <span className="text-2xs text-fg-dim">
                  Primary: <span className="text-fg-muted">{primarySignal.label}</span>
                </span>
              </div>

              <div className="space-y-2.5">
                {contributions.map((item) => {
                  const visual = SIGNAL_VISUALS[item.key];
                  return (
                    <EvidenceBar
                      key={item.key}
                      label={item.label}
                      score={item.score}
                      icon={visual.icon}
                      color={visual.color}
                      details={detailBySignal[item.key]}
                    />
                  );
                })}
              </div>

              {evidence.fileType && (
                <div className="border-t border-stroke-hairline/30 pt-2">
                  <span className="text-2xs text-fg-dim">
                    File type: <span className="font-mono text-fg-muted">.{evidence.fileType}</span>
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
