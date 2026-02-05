import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileCode, FileCode2, FileJson, FileCog, FileSpreadsheet, Terminal,
  CheckCircle, AlertCircle, ChevronDown, ExternalLink, FolderOpen, Copy, Check, Clock, HardDrive
} from 'lucide-react';
import { cn, formatFileSize, formatRelativeTime, getFileTypeIcon } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScoreBreakdown } from './ScoreBreakdown';
import { ContextSnippet } from './ContextSnippet';
import { WhyMatched } from './WhyMatched';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useResultCardLayout } from '@/hooks/useLayoutSync';
// useAnimatedCardOpacity import removed - animation system disabled
import type { RankedResult, LexicalResult, ContextSnippet as ContextSnippetType } from '@/lib/types';

/**
 * Map icon name to Lucide component
 */
function getFileIconComponent(iconName: string) {
  const iconMap: Record<string, typeof FileText> = {
    'file-text': FileText,
    'file-code': FileCode,
    'file-code-2': FileCode2,
    'file-json': FileJson,
    'file-cog': FileCog,
    'file-spreadsheet': FileSpreadsheet,
    'terminal': Terminal,
  };
  return iconMap[iconName] || FileText;
}

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
  mode?: 'jit' | 'cache' | 'journalist';
  isAskMode?: boolean;
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
  mode = 'cache',
  isAskMode = false,
  onSelect,
  onOpen,
  onReveal,
}: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { handleMouseEnter, handleMouseLeave } = usePrefetch();

  // Color mapping based on mode - override for Ask Mode
  const modeColors = {
    jit: { accent: '#F6B94C', bg: 'rgba(246, 185, 76, 0.08)' },
    cache: { accent: '#14B8A6', bg: 'rgba(20, 184, 166, 0.08)' },
    journalist: { accent: '#A78BFA', bg: 'rgba(167, 139, 250, 0.08)' },
    ask: { accent: '#A78BFA', bg: 'rgba(167, 139, 250, 0.12)' }, // Ask Mode uses same purple but slightly stronger bg
  };

  const currentModeKey = isAskMode ? 'ask' : mode;
  const selectedClass = isSelected ? 'bg-graphite-2/80' : '';

  const iconColorClass = isSelected
    ? (isAskMode ? 'text-accent-violet' : mode === 'jit' ? 'text-accent-amber' : mode === 'journalist' ? 'text-accent-violet' : 'text-accent-teal')
    : 'text-fg-dim';

  // Layout sync for Seamless Morph animation
  const cardRef = useResultCardLayout(index);

  // Animated opacity disabled - always show at full opacity
  const animatedOpacity = 1;

  // Use type-safe helper to validate score breakdown
  const isRankedResult = hasValidScoreBreakdown(result);
  const integrityVerified = isRankedResult ? result.integrityVerified : true;
  const evidence = isRankedResult ? result.evidence : null;
  const context = isRankedResult ? result.context : null;

  // File metadata (only available for ranked results)
  const fileSize = isRankedResult ? result.fileSize : undefined;
  const modifiedAt = isRankedResult ? result.modifiedAt : undefined;
  const fileExtension = isRankedResult ? result.fileExtension : undefined;

  // Get the appropriate file icon
  const iconName = getFileTypeIcon(fileExtension);
  const FileIcon = getFileIconComponent(iconName);

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

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(result.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  // Hover classes - apply to all items
  const hoverClass = cn(
    !isAskMode && mode === 'jit' && 'hover:bg-accent-amber/8 hover:shadow-[0_0_12px_rgba(246,185,76,0.25)]',
    !isAskMode && mode === 'cache' && 'hover:bg-accent-teal/8 hover:shadow-[0_0_12px_rgba(20,184,166,0.25)]',
    !isAskMode && mode === 'journalist' && 'hover:bg-accent-violet/8 hover:shadow-[0_0_12px_rgba(167,139,250,0.25)]',
    isAskMode && 'hover:bg-accent-violet/12 hover:shadow-[0_0_15px_rgba(167,139,250,0.3)]',
  );

  return (
    <div
      ref={cardRef}
      className={cn(
        'px-5 py-4 cursor-pointer transition-all duration-300 relative overflow-hidden group',
        'bg-graphite-1/40',
        hoverClass,
        selectedClass,
        'no-drag'
      )}
      style={{
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderLeft: isSelected
          ? `3px solid ${modeColors[currentModeKey].accent}`
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isSelected
          ? `inset 4px 0 12px -4px ${modeColors[currentModeKey].accent}33`
          : 'none',
        opacity: animatedOpacity,
        visibility: animatedOpacity > 0 ? 'visible' : 'hidden',
        // @ts-ignore - Custom CSS variable for highlight color
        '--highlight-color': modeColors[currentModeKey].accent,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => handleMouseEnter(result.path)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Subtle left border accent on hover (replaces dramatic swoosh) */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-0 pointer-events-none",
          mode === 'jit' && !isAskMode && "bg-accent-amber",
          mode === 'cache' && !isAskMode && "bg-accent-teal",
          mode === 'journalist' && !isAskMode && "bg-accent-violet",
          isAskMode && "bg-accent-violet"
        )}
      />

      <div className="flex items-center gap-4 relative z-10">
        <span className="text-fg-dim text-xs w-6 flex-shrink-0 font-mono">
          {index + 1}
        </span>

        <FileIcon className={cn(
          'w-4 h-4 flex-shrink-0 transition-colors',
          iconColorClass
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
          <div className="flex items-center gap-3 text-xs text-fg-dim">
            <span className="truncate font-mono">{result.directory}</span>
            {(fileSize !== undefined || modifiedAt !== undefined) && (
              <span className="flex items-center gap-2 shrink-0">
                {fileSize !== undefined && (
                  <span className="flex items-center gap-1" title="File size">
                    <HardDrive className="w-3 h-3" />
                    {formatFileSize(fileSize)}
                  </span>
                )}
                {modifiedAt !== undefined && (
                  <span className="flex items-center gap-1" title="Last modified">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(modifiedAt)}
                  </span>
                )}
              </span>
            )}
          </div>
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
              result.score >= 0.9 ? `bg-${isAskMode ? 'accent-violet' : mode === 'jit' ? 'accent-amber' : mode === 'journalist' ? 'accent-violet' : 'accent-teal'}/15 text-${isAskMode ? 'accent-violet' : mode === 'jit' ? 'accent-amber' : mode === 'journalist' ? 'accent-violet' : 'accent-teal'} border-${isAskMode ? 'accent-violet' : mode === 'jit' ? 'accent-amber' : mode === 'journalist' ? 'accent-violet' : 'accent-teal'}/30` :
                result.score >= 0.7 ? `bg-${isAskMode ? 'accent-violet' : mode === 'jit' ? 'accent-amber' : mode === 'journalist' ? 'accent-violet' : 'accent-teal'}/10 text-${isAskMode ? 'accent-violet' : mode === 'jit' ? 'accent-amber' : mode === 'journalist' ? 'accent-violet' : 'accent-teal'} border-${isAskMode ? 'accent-violet' : mode === 'jit' ? 'accent-amber' : mode === 'journalist' ? 'accent-violet' : 'accent-teal'}/20` :
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
                {/* Prefer semantic passage when semantic score is high (>0.5), as lexical snippets often don't match the conceptual query */}
                {(() => {
                  const preferSemanticPassage = isRankedResult &&
                    result.scoreBreakdown.semantic > 0.5 &&
                    evidence?.semanticPassage;

                  if (preferSemanticPassage) {
                    return (
                      <div className="space-y-2">
                        <div
                          className="text-sm text-fg-muted bg-graphite-2/30 px-3 py-2 font-mono whitespace-pre-wrap leading-relaxed"
                          style={{ borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        >
                          <div className="mb-1.5 text-2xs font-semibold text-accent-teal">Semantic match</div>
                          {evidence!.semanticPassage}
                        </div>
                        {isValidContext(context) && (
                          <details className="text-xs">
                            <summary className="text-fg-dim cursor-pointer hover:text-fg-muted transition-colors">
                              Show lexical context (line {context.lineNumber})
                            </summary>
                            <div className="mt-2">
                              <ContextSnippet context={context} mode={mode} />
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  }

                  if (isValidContext(context)) {
                    return <ContextSnippet context={context} />;
                  }

                  if (evidence?.semanticPassage) {
                    return (
                      <div
                        className="text-sm text-fg-muted bg-graphite-2/30 px-3 py-2 font-mono whitespace-pre-wrap leading-relaxed"
                        style={{ borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                      >
                        {evidence.semanticPassage}
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>

              {!isRankedResult && 'snippet' in result && result.snippet && (
                <div
                  className="p-3 bg-graphite-0 mb-4"
                  style={{ borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <p className="text-sm text-fg-muted font-mono">{result.snippet}</p>
                </div>
              )}

              {isRankedResult && (
                <div className="mb-4">
                  <ScoreBreakdown breakdown={result.scoreBreakdown} mode={mode} />
                  {evidence && (
                    <WhyMatched evidence={evidence} scoreBreakdown={result.scoreBreakdown} />
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-dashed border-stroke-hairline/30">
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md',
                    // Mode-aware colors
                    mode === 'jit' && !isAskMode && 'bg-accent-amber/10 text-accent-amber border border-accent-amber/30 hover:bg-accent-amber/20 hover:border-accent-amber/50',
                    mode === 'cache' && !isAskMode && 'bg-accent-teal/10 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20 hover:border-accent-teal/50',
                    (mode === 'journalist' || isAskMode) && 'bg-accent-violet/10 text-accent-violet border border-accent-violet/30 hover:bg-accent-violet/20 hover:border-accent-violet/50',
                    'transition-all duration-150'
                  )}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </button>
                <button
                  onClick={handleReveal}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md',
                    'bg-graphite-3 text-fg-muted border border-stroke-hairline',
                    'hover:bg-graphite-2 hover:text-porcelain hover:border-border-medium',
                    'transition-all duration-150'
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Reveal
                </button>
                <button
                  onClick={handleCopyPath}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md',
                    'bg-graphite-3 text-fg-muted border border-stroke-hairline',
                    'hover:bg-graphite-2 hover:text-porcelain hover:border-border-medium',
                    'transition-all duration-150',
                    copied && 'bg-success/10 text-success border-success/30'
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Path
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
