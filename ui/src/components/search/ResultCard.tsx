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
        'px-4 py-3 cursor-pointer transition-all duration-200',
        'hover-gradient-accent',
        isSelected ? 'bg-graphite-3 border-l-2 border-l-accent-teal' : 'hover:bg-graphite-3/50',
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
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Index */}
        <span className="text-fg-dim text-sm w-6 flex-shrink-0 font-mono">
          {index + 1}
        </span>

        {/* File icon */}
        <FileText className={cn(
          'w-4 h-4 flex-shrink-0 transition-colors',
          isSelected ? 'text-accent-teal' : 'text-fg-dim'
        )} />

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              'font-medium truncate transition-colors',
              isSelected ? 'text-accent-teal' : 'text-porcelain'
            )}>
              {result.filename}
            </p>
            {/* Match type badge */}
            {matchType && (
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full shrink-0',
                matchType === 'text'
                  ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/30'
                  : 'bg-accent-magenta/20 text-accent-magenta border border-accent-magenta/30'
              )}>
                {matchType === 'text' ? 'Text Match' : 'Semantic'}
              </span>
            )}
          </div>
          <p className="text-xs text-fg-dim truncate font-mono">{result.directory}</p>
        </div>

        {/* Integrity badge */}
        {isSemanticResult && (
          <span title={integrityVerified ? 'Integrity verified' : 'Integrity unverified'}>
            {integrityVerified ? (
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
            )}
          </span>
        )}

        {/* Score badge - cap at 100%, with animated transitions */}
        <motion.div
          key={`score-${result.path}-${Math.round(result.score * 100)}`}
          initial={{ scale: 1.15, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Badge
            variant={integrityVerified ? 'secure' : 'warning'}
            className={cn(
              'font-mono font-semibold transition-colors duration-300',
              result.score >= 0.9 ? 'bg-accent-amber/20 text-accent-amber border-accent-amber/30' :
                result.score >= 0.7 ? 'bg-accent-teal/20 text-accent-teal border-accent-teal/30' :
                  result.score >= 0.5 ? 'bg-accent-teal-glow/20 text-accent-teal-glow border-accent-teal-glow/30' :
                    'bg-fg-dim/20 text-fg-muted border-fg-dim/30'
            )}
          >
            {Math.min(100, Math.round(result.score * 100))}%
          </Badge>
        </motion.div>

        {/* Expand/collapse icon */}
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
            <div className="mt-3 pt-3 border-t border-stroke-hairline/50">

              {/* Metadata Header: Tags & Explanation */}
              {evidence && (
                <div className="mb-3 flex flex-col gap-2">
                  {/* Tags & Explanation Unified */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Tags */}
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

                    {/* Explanation (if short, inline? for now keep separate but close) */}
                  </div>

                  {/* Explanation as a subtle note */}
                  {evidence.explanation && (
                    <div className="text-xs text-fg-dim italic flex items-start gap-1.5">
                      <span className="mt-0.5 w-1 h-1 rounded-full bg-accent-teal/50 shrink-0" />
                      {evidence.explanation}
                    </div>
                  )}

                  {/* Matched terms (only if not empty and useful) */}
                  {evidence.matchedTerms && evidence.matchedTerms.length > 0 && (
                    <div className="text-2xs text-fg-dim">
                      Matches: <span className="text-fg-muted">{evidence.matchedTerms.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Content: Context Snippet OR Semantic Passage */}
              <div className="mb-3">
                {isValidContext(context) ? (
                  <ContextSnippet context={context} />
                ) : (
                  // Fallback to passage only if no snippet
                  evidence && evidence.semanticPassage && (
                    <div className="text-sm text-fg-muted bg-graphite-2/30 border border-stroke-hairline/50 rounded-md px-3 py-2 font-mono whitespace-pre-wrap leading-relaxed">
                      {evidence.semanticPassage}
                    </div>
                  )
                )}
              </div>

              {/* Lexical snippet (fallback for non-ranked) */}
              {!isRankedResult && 'snippet' in result && result.snippet && (
                <div className="p-2 bg-graphite-0 rounded-md mb-3">
                  <p className="text-sm text-fg-muted font-mono">{result.snippet}</p>
                </div>
              )}

              {/* Score breakdown (only for ranked results with valid breakdown) */}
              {isRankedResult && (
                <div className="mb-3">
                  <ScoreBreakdown breakdown={result.scoreBreakdown} />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-dashed border-stroke-hairline/30">
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md',
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
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md',
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
