import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle, AlertCircle, ChevronDown, ExternalLink, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScoreBreakdown } from './ScoreBreakdown';
import { ContextSnippet } from './ContextSnippet';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useResultCardLayout } from '@/hooks/useLayoutSync';
// useAnimatedCardOpacity import removed - animation system disabled
import type { RankedResult, LexicalResult, ContextSnippet as ContextSnippetType } from '@/lib/types';

/**
 * Type guard to validate ContextSnippet structure
 */
function isValidContext(context: unknown): context is ContextSnippetType {
  if (!context || typeof context !== 'object') return false;
  const ctx = context as Record<string, unknown>;
  return (
    typeof ctx.lineNumber === 'number' &&
    !isNaN(ctx.lineNumber) &&
    Array.isArray(ctx.matched) &&
    ctx.matched.length > 0
  );
}

/**
 * Type guard to check if result is a ranked result with valid scoreBreakdown
 */
function hasValidScoreBreakdown(result: RankedResult | LexicalResult): result is RankedResult {
  if (!('scoreBreakdown' in result)) return false;
  const breakdown = (result as RankedResult).scoreBreakdown;
  return breakdown != null && typeof breakdown === 'object';
}


interface ResultCardProps {
  result: RankedResult | LexicalResult;
  index: number;
  isSelected: boolean;
  isSemanticResult: boolean;
  matchType?: 'text' | 'semantic';
  onSelect: () => void;
  onOpen: () => void;
  onReveal: () => void;
}

export function ResultCard({
  result,
  index,
  isSelected,
  isSemanticResult,
  matchType,
  onSelect,
  onOpen,
  onReveal,
}: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { handleMouseEnter, handleMouseLeave } = usePrefetch();

  // Layout sync for Seamless Morph animation
  const cardRef = useResultCardLayout(index);

  // Animated opacity disabled - always show at full opacity
  const animatedOpacity = 1;

  // Use type-safe helper to validate score breakdown
  const isRankedResult = hasValidScoreBreakdown(result);
  const integrityVerified = isRankedResult ? result.integrityVerified : true;
  const evidence = isRankedResult ? result.evidence : null;
  const context = isRankedResult ? result.context : null;

  const handleClick = () => {
    onSelect();
    setExpanded(!expanded);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpen();
  };

  const handleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReveal();
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        'px-5 py-4 cursor-pointer transition-all duration-200',
        'hover-gradient-accent',
        isSelected ? 'bg-graphite-3 border-l-2 border-l-accent-teal shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' : 'hover:bg-graphite-3/50',
        'no-drag'
      )}
      style={{
        opacity: animatedOpacity,
        visibility: animatedOpacity > 0 ? 'visible' : 'hidden',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => handleMouseEnter(result.path)}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-4">
        <span className="text-fg-dim text-xs w-6 flex-shrink-0 font-mono">
          {index + 1}
        </span>

        <FileText className={cn(
          'w-4 h-4 flex-shrink-0 transition-colors',
          isSelected ? 'text-accent-teal' : 'text-fg-dim'
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              'font-semibold truncate transition-colors',
              isSelected ? 'text-porcelain' : 'text-porcelain'
            )}>
              {result.filename}
            </p>
            {matchType && (
              <span className={cn(
                'px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] rounded-full shrink-0 border',
                matchType === 'text'
                  ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/30'
                  : 'bg-accent-magenta/10 text-accent-magenta border-accent-magenta/30'
              )}>
                {matchType === 'text' ? 'Text' : 'Semantic'}
              </span>
            )}
          </div>
          <p className="text-xs text-fg-dim truncate font-mono">{result.directory}</p>
        </div>

        {isSemanticResult && (
          <span title={integrityVerified ? 'Integrity verified' : 'Integrity unverified'}>
            {integrityVerified ? (
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
            )}
          </span>
        )}

        <motion.div
          key={`score-${result.path}-${Math.round(result.score * 100)}`}
          initial={{ scale: 1.15, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Badge
            variant={integrityVerified ? 'secure' : 'warning'}
            className={cn(
              'font-mono font-semibold transition-colors duration-300 border',
              result.score >= 0.9 ? 'bg-accent-amber/15 text-accent-amber border-accent-amber/30' :
                result.score >= 0.7 ? 'bg-accent-teal/15 text-accent-teal border-accent-teal/30' :
                  result.score >= 0.5 ? 'bg-accent-teal-glow/15 text-accent-teal-glow border-accent-teal-glow/30' :
                    'bg-fg-dim/15 text-fg-muted border-fg-dim/30'
            )}
          >
            {Math.min(100, Math.round(result.score * 100))}%
          </Badge>
        </motion.div>

        <ChevronDown
          className={cn(
            'w-4 h-4 text-fg-dim transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-stroke-hairline/50">
              {evidence && (
                <div className="mb-4 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {evidence.tags && evidence.tags.length > 0 && evidence.tags.map((tag, i) => {
                      const isObject = typeof tag === 'object' && tag !== null;
                      const label = isObject ? tag.label : tag;
                      const key = isObject ? `${tag.tagType}-${label}-${i}` : `${tag}-${i}`;
                      const title = isObject ? tag.tooltip : undefined;

                      return (
                        <Badge key={key} variant="outline" className="bg-graphite-2 text-fg-muted border-stroke-hairline" title={title}>
                          {label}
                        </Badge>
                      );
                    })}
                  </div>

                  {evidence.explanation && (
                    <div className="text-xs text-fg-dim italic flex items-start gap-1.5">
                      <span className="mt-0.5 w-1 h-1 rounded-full bg-accent-teal/50 shrink-0" />
                      {evidence.explanation}
                    </div>
                  )}

                  {evidence.matchedTerms && evidence.matchedTerms.length > 0 && (
                    <div className="text-2xs text-fg-dim">
                      Matches: <span className="text-fg-muted">{evidence.matchedTerms.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4">
                {isValidContext(context) ? (
                  <ContextSnippet context={context} />
                ) : (
                  evidence && evidence.semanticPassage && (
                    <div className="text-sm text-fg-muted bg-graphite-2/30 border border-stroke-hairline/50 rounded-md px-3 py-2 font-mono whitespace-pre-wrap leading-relaxed">
                      {evidence.semanticPassage}
                    </div>
                  )
                )}
              </div>

              {!isRankedResult && 'snippet' in result && result.snippet && (
                <div className="p-3 bg-graphite-0 rounded-md mb-4">
                  <p className="text-sm text-fg-muted font-mono">{result.snippet}</p>
                </div>
              )}

              {isRankedResult && (
                <div className="mb-4">
                  <ScoreBreakdown breakdown={result.scoreBreakdown} />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-dashed border-stroke-hairline/30">
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] rounded-md',
                    'bg-accent-teal/10 text-accent-teal border border-accent-teal/30',
                    'hover:bg-accent-teal/20 hover:border-accent-teal/50',
                    'transition-all duration-150'
                  )}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </button>
                <button
                  onClick={handleReveal}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] rounded-md',
                    'bg-graphite-3 text-fg-muted border border-stroke-hairline',
                    'hover:bg-graphite-2 hover:text-porcelain hover:border-border-medium',
                    'transition-all duration-150'
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Reveal in Explorer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
