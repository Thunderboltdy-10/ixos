import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileCode, FileCode2, FileJson, FileCog, FileSpreadsheet, Terminal,
  CheckCircle, AlertCircle, ChevronDown, ExternalLink, FolderOpen, Copy, Check, Clock, HardDrive,
  EyeOff, ThumbsDown, Star
} from 'lucide-react';
import { cn, formatFileSize, formatRelativeTime, getFileTypeIcon } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScoreBreakdown } from './ScoreBreakdown';
import { ContextSnippet } from './ContextSnippet';
import { WhyMatched } from './WhyMatched';
import { ExplainPanel } from './ExplainPanel';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useResultCardLayout } from '@/hooks/useLayoutSync';
import type { MatchSignal } from '@/lib/matchClassification';
import { useSearchStore } from '@/stores/searchStore';
import { useSettingsStore } from '@/stores/settingsStore';
import * as tauri from '@/lib/tauri';
// useAnimatedCardOpacity import removed - animation system disabled
import type {
  RankedResult,
  LexicalResult,
  ContextSnippet as ContextSnippetType,
  PersonalSignals,
} from '@/lib/types';

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

type AskConfidence = 'High' | 'Medium' | 'Low';

function inferAskAnswer(text: string | null | undefined): string | null {
  if (!text) return null;
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return null;

  const dateMatch = compact.match(
    /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i
  );
  if (dateMatch) return dateMatch[0];

  const amountMatch = compact.match(/\b(?:\$|usd\s*)?\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/i);
  if (amountMatch) return amountMatch[0];

  const nameMatch = compact.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/);
  if (nameMatch) return nameMatch[0];

  return compact.slice(0, 140);
}

function askConfidenceForResult(result: RankedResult): AskConfidence {
  const semantic = result.scoreBreakdown.semantic;
  const lexicalHits = result.evidence?.lexicalHitCount ?? 0;
  const matchedTerms = result.evidence?.matchedTerms?.length ?? 0;
  const lexicalAgreement = lexicalHits > 0 || matchedTerms >= 2;

  if (semantic >= 0.62 && lexicalAgreement) return 'High';
  if (semantic >= 0.45 || lexicalAgreement) return 'Medium';
  return 'Low';
}


interface ResultCardProps {
  result: RankedResult | LexicalResult;
  index: number;
  isSelected: boolean;
  isSemanticResult: boolean;
  matchType?: MatchSignal;
  mode?: 'ephemeral' | 'native-cache' | 'journalist';
  isAskMode?: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onReveal: () => void;
}

const MATCH_TYPE_META: Record<MatchSignal, { label: string; className: string }> = {
  semantic: {
    label: 'Semantic',
    className: 'bg-accent-magenta/10 text-accent-magenta border-accent-magenta/30',
  },
  integrity: {
    label: 'Integrity',
    className: 'bg-success/10 text-success border-success/30',
  },
  temporal: {
    label: 'Age',
    className: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
  },
  behavior: {
    label: 'Pattern',
    className: 'bg-accent-teal/10 text-accent-teal border-accent-teal/30',
  },
};

export function ResultCard({
  result,
  index,
  isSelected,
  isSemanticResult,
  matchType,
  mode = 'native-cache',
  isAskMode = false,
  onSelect,
  onOpen,
  onReveal,
}: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signals, setSignals] = useState<PersonalSignals | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const { handleMouseEnter, handleMouseLeave } = usePrefetch();
  const deepSearchMode = useSearchStore((state) => state.deepSearchMode);
  const qualityMode = useSettingsStore((state) => state.config?.search.searchMode ?? 'auto');
  const canApplyPersonalSignals = !deepSearchMode;

  // Color mapping based on mode - override for Ask Mode
  const modeColors = {
    ephemeral: { accent: '#F6B94C', bg: 'rgba(246, 185, 76, 0.08)' },
    'native-cache': { accent: '#14B8A6', bg: 'rgba(20, 184, 166, 0.08)' },
    journalist: { accent: '#A78BFA', bg: 'rgba(167, 139, 250, 0.08)' },
    ask: { accent: '#A78BFA', bg: 'rgba(167, 139, 250, 0.12)' }, // Ask Mode uses same purple but slightly stronger bg
  };
  const qualityColors = {
    flash: {
      accent: '#F6B94C',
      glow: 'rgba(246, 185, 76, 0.24)',
      bg: 'rgba(246, 185, 76, 0.06)',
      border: 'rgba(246, 185, 76, 0.18)',
    },
    auto: {
      accent: '#14B8A6',
      glow: 'rgba(20, 184, 166, 0.24)',
      bg: 'rgba(20, 184, 166, 0.06)',
      border: 'rgba(20, 184, 166, 0.18)',
    },
    pro: {
      accent: '#A78BFA',
      glow: 'rgba(167, 139, 250, 0.26)',
      bg: 'rgba(167, 139, 250, 0.07)',
      border: 'rgba(167, 139, 250, 0.2)',
    },
  } as const;

  const currentModeKey = isAskMode ? 'ask' : mode;
  const qualityTone = qualityColors[qualityMode];
  const selectedClass = isSelected ? 'bg-graphite-2/80' : '';

  const iconColorClass = isSelected
    ? (isAskMode ? 'text-accent-violet' : mode === 'ephemeral' ? 'text-accent-amber' : mode === 'journalist' ? 'text-accent-violet' : 'text-accent-teal')
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
  const isPinned = signals?.pinned ?? false;
  const isIgnored = signals?.ignored ?? false;
  const askAnswer = isRankedResult ? inferAskAnswer(evidence?.semanticPassage) : null;
  const askConfidence = isRankedResult ? askConfidenceForResult(result) : null;

  // Get the appropriate file icon
  const iconName = getFileTypeIcon(fileExtension);
  const FileIcon = getFileIconComponent(iconName);

  useEffect(() => {
    if (!canApplyPersonalSignals) {
      setSignals(null);
      return;
    }
    tauri.getPersonalSignals(result.path).then(setSignals).catch(() => setSignals(null));
  }, [canApplyPersonalSignals, result.path]);

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    if (selection && selection.toString().trim().length > 0) {
      return;
    }
    onSelect();
    setExpanded(!expanded);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    if (selection && selection.toString().trim().length > 0) {
      return;
    }
    e.preventDefault();
    onOpen();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    suppressClickRef.current = false;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const start = pointerDownRef.current;
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    if (dx > 5 || dy > 5) {
      suppressClickRef.current = true;
    }
  };
  const preventCardToggle = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const handleReveal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onReveal();
  };

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(result.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canApplyPersonalSignals) return;
    try {
      if (isPinned) {
        await tauri.unpinFile(result.path);
      } else {
        await tauri.pinFile(result.path);
      }
      const next = await tauri.getPersonalSignals(result.path);
      setSignals(next);
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleToggleIgnore = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canApplyPersonalSignals) return;
    try {
      if (isIgnored) {
        await tauri.unignoreFile(result.path);
      } else {
        await tauri.ignoreFile(result.path);
      }
      const next = await tauri.getPersonalSignals(result.path);
      setSignals(next);
    } catch (err) {
      console.error('Failed to toggle ignore:', err);
    }
  };

  const handleNotRelevant = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canApplyPersonalSignals) return;
    try {
      await tauri.markNotRelevant(result.path);
      const next = await tauri.getPersonalSignals(result.path);
      setSignals(next);
    } catch (err) {
      console.error('Failed to mark not relevant:', err);
    }
  };

  // Hover classes - apply to all items
  const qualityHoverClass =
    qualityMode === 'flash'
      ? 'hover:bg-accent-amber/8 hover:shadow-[0_0_12px_rgba(246,185,76,0.25)]'
      : qualityMode === 'pro'
        ? 'hover:bg-accent-violet/8 hover:shadow-[0_0_12px_rgba(167,139,250,0.28)]'
        : 'hover:bg-accent-teal/8 hover:shadow-[0_0_12px_rgba(20,184,166,0.25)]';
  const hoverClass = cn(
    !isAskMode && qualityHoverClass,
    isAskMode && 'hover:bg-accent-violet/12 hover:shadow-[0_0_15px_rgba(167,139,250,0.3)]',
  );
  const tone = isAskMode || mode === 'journalist' ? 'violet' : mode === 'ephemeral' ? 'amber' : 'teal';
  const highScoreToneClass = {
    amber: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
    teal: 'bg-accent-teal/15 text-accent-teal border-accent-teal/30',
    violet: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30',
  }[tone];
  const mediumScoreToneClass = {
    amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
    teal: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20',
    violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20',
  }[tone];

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
          ? `inset 4px 0 12px -4px ${modeColors[currentModeKey].accent}33, 0 0 0 1px ${qualityTone.border}, 0 0 14px ${qualityTone.glow}`
          : 'none',
        background: isSelected
          ? `linear-gradient(120deg, ${modeColors[currentModeKey].bg} 0%, ${qualityTone.bg} 100%)`
          : undefined,
        opacity: animatedOpacity,
        visibility: animatedOpacity > 0 ? 'visible' : 'hidden',
        // @ts-ignore - Custom CSS variable for highlight color
        '--highlight-color': modeColors[currentModeKey].accent,
      }}
      data-allow-context-menu="true"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => handleMouseEnter(result.path)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Subtle left border accent on hover (replaces dramatic swoosh) */}
        <div
          className={cn(
          "absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-0 pointer-events-none",
          mode === 'ephemeral' && !isAskMode && "bg-accent-amber",
          mode === 'native-cache' && !isAskMode && "bg-accent-teal",
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
              isSelected ? 'text-porcelain' : 'text-porcelain',
              isIgnored && 'line-through opacity-60'
            )}>
              {result.filename}
            </p>
            {matchType && (
              <span className={cn(
                'px-2 py-0.5 text-[10px] rounded-full shrink-0 border',
                MATCH_TYPE_META[matchType].className
              )}>
                {MATCH_TYPE_META[matchType].label}
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
              result.score >= 0.9 ? highScoreToneClass :
                result.score >= 0.7 ? mediumScoreToneClass :
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
                  {isAskMode && askAnswer && askConfidence && (
                    <div className="rounded-md border border-accent-violet/30 bg-accent-violet/10 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-accent-violet font-semibold">
                          Answer Card
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                            askConfidence === 'High' && "text-success border-success/40 bg-success/10",
                            askConfidence === 'Medium' && "text-accent-amber border-accent-amber/40 bg-accent-amber/10",
                            askConfidence === 'Low' && "text-fg-muted border-stroke-hairline bg-graphite-3/70",
                          )}
                        >
                          {askConfidence}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-porcelain">{askAnswer}</p>
                      <p className="mt-1 text-2xs text-fg-dim">Cited from this result snippet.</p>
                    </div>
                  )}
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
                          data-selectable="true"
                          className="text-sm text-fg-muted bg-graphite-2/30 px-3 py-2 font-mono whitespace-pre-wrap leading-relaxed context-snippet"
                          style={{ borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                          onMouseDown={preventCardToggle}
                          onClick={preventCardToggle}
                          onDoubleClick={preventCardToggle}
                          onContextMenu={preventCardToggle}
                        >
                          <div className="mb-1.5 text-2xs font-semibold text-accent-teal">Semantic match</div>
                          {evidence!.semanticPassage}
                        </div>
                        {isValidContext(context) && (
                          <details className="text-xs">
                            <summary className="text-fg-dim cursor-pointer hover:text-fg-muted transition-colors">
                              Show lexical context (line {context.lineNumber})
                            </summary>
                            <div
                              className="mt-2"
                              data-selectable="true"
                              onMouseDown={preventCardToggle}
                              onClick={preventCardToggle}
                              onDoubleClick={preventCardToggle}
                              onContextMenu={preventCardToggle}
                            >
                              <ContextSnippet context={context} mode={mode} />
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  }

                  if (isValidContext(context)) {
                    return (
                      <div
                        data-selectable="true"
                        onMouseDown={preventCardToggle}
                        onClick={preventCardToggle}
                        onDoubleClick={preventCardToggle}
                        onContextMenu={preventCardToggle}
                      >
                        <ContextSnippet context={context} />
                      </div>
                    );
                  }

                  if (evidence?.semanticPassage) {
                    return (
                      <div
                        data-selectable="true"
                        className="text-sm text-fg-muted bg-graphite-2/30 px-3 py-2 font-mono whitespace-pre-wrap leading-relaxed context-snippet"
                        style={{ borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        onMouseDown={preventCardToggle}
                        onClick={preventCardToggle}
                        onDoubleClick={preventCardToggle}
                        onContextMenu={preventCardToggle}
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
                  data-selectable="true"
                  className="p-3 bg-graphite-0 mb-4"
                  style={{ borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  onMouseDown={preventCardToggle}
                  onClick={preventCardToggle}
                  onDoubleClick={preventCardToggle}
                  onContextMenu={preventCardToggle}
                >
                  <p className="text-sm text-fg-muted font-mono context-snippet">{result.snippet}</p>
                </div>
              )}

              {isRankedResult && (
                <div className="mb-4">
                  <ScoreBreakdown breakdown={result.scoreBreakdown} mode={mode} qualityMode={qualityMode} />
                  {evidence && (
                    <WhyMatched evidence={evidence} scoreBreakdown={result.scoreBreakdown} />
                  )}
                </div>
              )}

              {isRankedResult && (
                <div className="mb-3">
                  <ExplainPanel result={result} />
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleTogglePin}
                  onDoubleClick={(e) => e.stopPropagation()}
                  disabled={!canApplyPersonalSignals}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 text-2xs rounded-md border transition-colors',
                    isPinned
                      ? 'bg-accent-amber/15 text-accent-amber border-accent-amber/40'
                      : 'bg-graphite-3 text-fg-muted border-stroke-hairline hover:text-porcelain',
                    !canApplyPersonalSignals && 'opacity-55 cursor-not-allowed'
                  )}
                  title={canApplyPersonalSignals ? undefined : 'Unavailable in Deep Search mode'}
                >
                  <Star className={cn('w-3.5 h-3.5', isPinned && 'fill-current')} />
                  {isPinned ? 'Pinned' : 'Pin'}
                </button>
                <button
                  type="button"
                  onClick={handleToggleIgnore}
                  onDoubleClick={(e) => e.stopPropagation()}
                  disabled={!canApplyPersonalSignals}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 text-2xs rounded-md border transition-colors',
                    isIgnored
                      ? 'bg-error/15 text-error border-error/40'
                      : 'bg-graphite-3 text-fg-muted border-stroke-hairline hover:text-porcelain',
                    !canApplyPersonalSignals && 'opacity-55 cursor-not-allowed'
                  )}
                  title={canApplyPersonalSignals ? undefined : 'Unavailable in Deep Search mode'}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  {isIgnored ? 'Ignored' : 'Ignore'}
                </button>
                <button
                  type="button"
                  onClick={handleNotRelevant}
                  onDoubleClick={(e) => e.stopPropagation()}
                  disabled={!canApplyPersonalSignals}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-2xs rounded-md border bg-graphite-3 text-fg-muted border-stroke-hairline hover:text-porcelain transition-colors",
                    !canApplyPersonalSignals && 'opacity-55 cursor-not-allowed'
                  )}
                  title={canApplyPersonalSignals ? undefined : 'Unavailable in Deep Search mode'}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Not Relevant
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-dashed border-stroke-hairline/30">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md',
                    // Mode-aware colors
                    mode === 'ephemeral' && !isAskMode && 'bg-accent-amber/10 text-accent-amber border border-accent-amber/30 hover:bg-accent-amber/20 hover:border-accent-amber/50',
                    mode === 'native-cache' && !isAskMode && 'bg-accent-teal/10 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20 hover:border-accent-teal/50',
                    (mode === 'journalist' || isAskMode) && 'bg-accent-violet/10 text-accent-violet border border-accent-violet/30 hover:bg-accent-violet/20 hover:border-accent-violet/50',
                    'transition-all duration-150'
                  )}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </button>
                <button
                  type="button"
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
                  type="button"
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
