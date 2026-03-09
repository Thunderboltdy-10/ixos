import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileCode, FileCode2, FileJson, FileCog, FileSpreadsheet, Terminal,
  CheckCircle, AlertCircle, ChevronDown, ExternalLink, FolderOpen, Copy, Check, Clock,
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

const MATCH_TYPE_META: Record<MatchSignal, { label: string; dotColor: string; textColor: string }> = {
  semantic: {
    label: 'Semantic',
    dotColor: 'bg-accent-magenta',
    textColor: 'text-accent-magenta',
  },
  integrity: {
    label: 'Integrity',
    dotColor: 'bg-success',
    textColor: 'text-success',
  },
  temporal: {
    label: 'Age',
    dotColor: 'bg-accent-amber',
    textColor: 'text-accent-amber',
  },
  behavior: {
    label: 'Pattern',
    dotColor: 'bg-accent-teal',
    textColor: 'text-accent-teal',
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
  // Quality color mapping simplified — tone-based scoring in render

  const currentModeKey = isAskMode ? 'ask' : mode;

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

  const tone = isAskMode || mode === 'journalist' ? 'violet' : mode === 'ephemeral' ? 'amber' : 'teal';
  const toneAccent = { amber: '#F6B94C', teal: '#14B8A6', violet: '#7C5CFF' }[tone];
  const scorePercent = Math.min(100, Math.round(result.score * 100));

  return (
    <div
      ref={cardRef}
      className={cn(
        'group relative cursor-pointer transition-all duration-200 ease-out no-drag',
        'rounded-lg',
        isSelected
          ? 'bg-graphite-2/60'
          : 'bg-transparent hover:bg-graphite-1/50',
      )}
      style={{
        padding: '12px 16px',
        borderLeft: isSelected ? `2px solid ${toneAccent}` : '2px solid transparent',
        opacity: animatedOpacity,
        visibility: animatedOpacity > 0 ? 'visible' : 'hidden',
        // @ts-ignore
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
      <div className="flex items-center gap-3">
        <FileIcon className={cn(
          'w-4 h-4 flex-shrink-0 transition-colors',
          isSelected ? `text-[${toneAccent}]` : 'text-fg-dim',
          isSelected && tone === 'teal' && 'text-accent-teal',
          isSelected && tone === 'amber' && 'text-accent-amber',
          isSelected && tone === 'violet' && 'text-accent-violet',
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              'text-sm font-medium truncate',
              isIgnored ? 'line-through opacity-50 text-fg-muted' : 'text-porcelain',
            )}>
              {result.filename}
            </p>
            {matchType && (
              <span className="flex items-center gap-1 shrink-0">
                <span className={cn('w-1.5 h-1.5 rounded-full', MATCH_TYPE_META[matchType].dotColor)} />
                <span className={cn('text-[10px] font-medium', MATCH_TYPE_META[matchType].textColor)}>
                  {MATCH_TYPE_META[matchType].label}
                </span>
              </span>
            )}
            {isSemanticResult && integrityVerified && (
              <CheckCircle className="w-3 h-3 text-success/60 flex-shrink-0" />
            )}
            {isSemanticResult && !integrityVerified && (
              <AlertCircle className="w-3 h-3 text-warning/60 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-fg-dim truncate font-mono">{result.directory}</span>
            {modifiedAt !== undefined && (
              <span className="text-[10px] text-fg-ghost flex items-center gap-0.5 shrink-0">
                <Clock className="w-2.5 h-2.5" />
                {formatRelativeTime(modifiedAt)}
              </span>
            )}
            {fileSize !== undefined && (
              <span className="text-[10px] text-fg-ghost shrink-0">
                {formatFileSize(fileSize)}
              </span>
            )}
          </div>
        </div>

        {/* Score circle */}
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
            'text-[11px] font-mono font-semibold transition-colors duration-200',
            result.score >= 0.9 && tone === 'teal' && 'bg-accent-teal/15 text-accent-teal border border-accent-teal/25',
            result.score >= 0.9 && tone === 'amber' && 'bg-accent-amber/15 text-accent-amber border border-accent-amber/25',
            result.score >= 0.9 && tone === 'violet' && 'bg-accent-violet/15 text-accent-violet border border-accent-violet/25',
            result.score >= 0.7 && result.score < 0.9 && 'bg-graphite-3/80 text-fg-secondary border border-white/8',
            result.score < 0.7 && 'bg-graphite-3/50 text-fg-dim border border-white/5',
          )}
        >
          {scorePercent}
        </div>

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-fg-ghost transition-transform duration-200',
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
            <div className="mt-3 pt-3 border-t border-white/5">
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

                  // Default empty state or Pro upgrade CTA
                  if (isRankedResult && !evidence) {
                    return (
                      <div className="bg-graphite-2 border border-white/5 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                         <div className="text-accent-violet font-semibold text-sm mb-1">Deep Evidence Unavailable</div>
                         <p className="text-fg-muted text-xs mb-3">Upgrade to Ixos Pro to unlock deep semantic extraction and verifiable evidence for this match.</p>
                         <button type="button" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-pricing')); }} className="px-3 py-1.5 rounded-md bg-accent-violet/10 text-accent-violet text-xs font-semibold hover:bg-accent-violet/20 transition-colors">
                           Upgrade to Pro
                         </button>
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

              {/* Compact action bar */}
              <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors duration-150',
                    tone === 'teal' && 'bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/18',
                    tone === 'amber' && 'bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/18',
                    tone === 'violet' && 'bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/18',
                  )}
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </button>
                <button type="button" onClick={handleReveal}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md text-fg-muted hover:text-porcelain hover:bg-graphite-3/70 transition-colors duration-150"
                >
                  <FolderOpen className="w-3 h-3" />
                  Reveal
                </button>
                <button type="button" onClick={handleCopyPath}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors duration-150",
                    copied ? 'text-success' : 'text-fg-muted hover:text-porcelain hover:bg-graphite-3/70'
                  )}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>

                <div className="flex-1" />

                <button type="button" onClick={handleTogglePin} onDoubleClick={(e) => e.stopPropagation()}
                  disabled={!canApplyPersonalSignals}
                  className={cn(
                    'p-1.5 rounded-md transition-colors duration-150',
                    isPinned ? 'text-accent-amber' : 'text-fg-ghost hover:text-fg-muted',
                    !canApplyPersonalSignals && 'opacity-40 cursor-not-allowed'
                  )}
                  title={isPinned ? 'Unpin' : 'Pin'}
                >
                  <Star className={cn('w-3.5 h-3.5', isPinned && 'fill-current')} />
                </button>
                <button type="button" onClick={handleToggleIgnore} onDoubleClick={(e) => e.stopPropagation()}
                  disabled={!canApplyPersonalSignals}
                  className={cn(
                    'p-1.5 rounded-md transition-colors duration-150',
                    isIgnored ? 'text-error' : 'text-fg-ghost hover:text-fg-muted',
                    !canApplyPersonalSignals && 'opacity-40 cursor-not-allowed'
                  )}
                  title={isIgnored ? 'Unignore' : 'Ignore'}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={handleNotRelevant} onDoubleClick={(e) => e.stopPropagation()}
                  disabled={!canApplyPersonalSignals}
                  className={cn(
                    'p-1.5 rounded-md text-fg-ghost hover:text-fg-muted transition-colors duration-150',
                    !canApplyPersonalSignals && 'opacity-40 cursor-not-allowed'
                  )}
                  title="Not relevant"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
