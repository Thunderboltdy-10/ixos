import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Search, Sparkles } from 'lucide-react';
import type { IxosSearchResult } from '../types';

type SearchMode = 'flash' | 'auto' | 'pro';

interface PipelineStats {
  stage?: string;
  filesScanned?: number;
  scanned?: number;
  candidates?: number;
  embedded?: number;
  cacheHits?: number;
  scanTrail?: string[];
}

interface SearchSurfaceProps {
  query: string;
  onQueryChange?: (value: string) => void;
  onSubmit?: () => void;
  directoryLabel?: string;
  presets?: string[];
  onPresetSelect?: (value: string) => void;
  mode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  stageLabel?: string;
  isSearching?: boolean;
  errorMessage?: string | null;
  results: IxosSearchResult[];
  selectedIndex?: number;
  onSelectResult?: (index: number) => void;
  onOpenResult?: (index: number) => void;
  onRevealResult?: (index: number) => void;
  allowResultsScroll?: boolean;
  showInlineRunButton?: boolean;
  hideSearchChrome?: boolean;
  resultLimit?: number;
  pipelineStats?: PipelineStats;
  sourcePath?: string;
  interactive?: boolean;
}

const MODES: SearchMode[] = ['flash', 'auto', 'pro'];
const STAGE_ORDER = ['lexical', 'semantic', 'refining', 'locked'];

const STAGE_COLORS: Record<string, { bg: string; active: string }> = {
  lexical: { bg: 'rgba(246, 185, 76, 0.15)', active: 'rgba(246, 185, 76, 0.9)' },
  semantic: { bg: 'rgba(20, 184, 166, 0.15)', active: 'rgba(20, 184, 166, 0.9)' },
  refining: { bg: 'rgba(20, 184, 166, 0.15)', active: 'rgba(20, 184, 166, 0.9)' },
  locked: { bg: 'rgba(124, 92, 255, 0.15)', active: 'rgba(124, 92, 255, 0.9)' },
};

function formatPathForRow(path: string) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 3) return path;
  return `.../${parts.slice(-3).join('/')}`;
}

function inferStage(stageLabel: string, stage?: string) {
  const raw = (stage ?? stageLabel).toLowerCase();
  if (raw === 'scan' || raw.includes('scanning')) return 'lexical';
  if (raw.includes('lexical')) return 'lexical';
  if (raw.includes('semantic')) return 'semantic';
  if (raw.includes('refin')) return 'refining';
  if (raw.includes('lock') || raw.includes('tail') || raw.includes('complete')) return 'locked';
  return 'lexical';
}

export function SearchSurface({
  query,
  onQueryChange,
  onSubmit,
  directoryLabel,
  presets = [],
  onPresetSelect,
  mode = 'auto',
  onModeChange,
  stageLabel = 'Streaming',
  isSearching = false,
  errorMessage,
  results,
  selectedIndex = 0,
  onSelectResult,
  onOpenResult,
  onRevealResult,
  allowResultsScroll = true,
  showInlineRunButton = true,
  hideSearchChrome = false,
  resultLimit,
  pipelineStats,
  sourcePath: _sourcePath,
  interactive = true,
}: SearchSurfaceProps) {
  const visibleResults = useMemo(
    () => (resultLimit ? results.slice(0, resultLimit) : results),
    [resultLimit, results],
  );
  const hiddenCount = Math.max(0, results.length - visibleResults.length);
  const rawStage = pipelineStats?.stage ?? stageLabel;
  const stage = inferStage(stageLabel, rawStage);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const trail = (pipelineStats?.scanTrail ?? []).slice(-4).reverse();
  const [streamedCount, setStreamedCount] = useState(0);
  const fillHeight = hideSearchChrome;
  const denseMode = hideSearchChrome;

  useEffect(() => {
    const target = visibleResults.length;
    if (target === 0) {
      setStreamedCount(0);
      return;
    }
    if (streamedCount > target) {
      setStreamedCount(target);
      return;
    }
    if (streamedCount === target) return;

    let current = streamedCount === 0 ? Math.min(2, target) : streamedCount;
    setStreamedCount(current);

    const id = window.setInterval(() => {
      current += 1;
      if (current >= target) {
        setStreamedCount(target);
        window.clearInterval(id);
        return;
      }
      setStreamedCount(current);
    }, isSearching ? 48 : 62);

    return () => window.clearInterval(id);
  }, [isSearching, streamedCount, visibleResults.length]);

  const streamedRows = visibleResults.slice(0, Math.max(streamedCount, isSearching ? Math.min(2, visibleResults.length) : streamedCount));
  const selected = streamedRows[selectedIndex] ?? streamedRows[0] ?? null;

  return (
    <div className="ixos-search-surface" data-fill={fillHeight} data-dense={denseMode}>
      {!hideSearchChrome && (
        <div className="ixos-card" style={{ display: 'grid', gap: 10, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span className="ixos-chip" style={{ borderColor: 'rgba(243,245,247,0.18)' }}>
              <Search size={12} />
              Search
            </span>
            <span className="ixos-chip" style={{ color: 'rgba(94, 234, 212, 0.92)' }}>
              {stageLabel}
            </span>
          </div>

          {directoryLabel && (
            <div style={{ border: '1px solid rgba(243, 245, 247, 0.14)', borderRadius: 10, padding: '8px 12px', color: 'rgba(243,245,247,0.58)', fontSize: 11, background: 'rgba(10, 13, 18, 0.46)' }}>
              Directory: {directoryLabel}
            </div>
          )}

          <div style={{ display: 'grid', gap: 10, border: '1px solid rgba(243, 245, 247, 0.14)', borderRadius: 12, padding: 6, background: 'linear-gradient(180deg, rgba(10,13,18,0.88) 0%, rgba(10,13,18,0.72) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="ixos-chip" style={{ borderColor: 'rgba(243,245,247,0.16)', color: 'rgba(243,245,247,0.72)', background: 'rgba(255,255,255,0.04)', minWidth: 74, justifyContent: 'center' }}>
                Search
              </span>
              <input
                className="ixos-input"
                value={query}
                onChange={(event) => onQueryChange?.(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') onSubmit?.(); }}
                placeholder="Type what you remember..."
                readOnly={!interactive}
                style={{ border: '1px solid rgba(243, 245, 247, 0.12)', background: 'rgba(8, 11, 15, 0.82)', height: 44 }}
              />
              {showInlineRunButton && (
                <button type="button" onClick={() => onSubmit?.()} className="ixos-chip"
                  style={{ cursor: interactive ? 'pointer' : 'default', padding: '0 14px', borderRadius: 10, height: 44, borderColor: 'rgba(20, 184, 166, 0.42)', color: '#5eead4', background: 'rgba(20, 184, 166, 0.12)', fontWeight: 700 }}>
                  Run Search
                </button>
              )}
            </div>
            {!showInlineRunButton && (
              <div style={{ justifySelf: 'end', paddingRight: 8, fontSize: 10, color: 'rgba(243,245,247,0.46)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                press enter to run
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MODES.map((item) => (
              <button key={item} type="button" className="ixos-chip" onClick={() => onModeChange?.(item)}
                style={{ cursor: interactive ? 'pointer' : 'default', borderColor: mode === item ? 'rgba(20, 184, 166, 0.45)' : undefined, color: mode === item ? '#5eead4' : undefined, background: mode === item ? 'rgba(20, 184, 166, 0.15)' : undefined }}>
                {item}
              </button>
            ))}
          </div>

          {presets.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {presets.map((preset) => (
                <button key={preset} type="button" className="ixos-chip" onClick={() => onPresetSelect?.(preset)}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}>
                  {preset}
                </button>
              ))}
            </div>
          )}

          {errorMessage && (
            <div style={{ border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: 10, background: 'rgba(239, 68, 68, 0.08)', padding: '10px 12px', color: '#fca5a5', fontSize: 12 }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}

      {/* Thin segmented progress bar — Lexical (amber) → Semantic (teal) → Locked (violet) */}
      <AnimatePresence>
        {(isSearching || (stageIndex >= 0 && stage !== 'locked')) && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'grid', gap: 6, overflow: 'hidden' }}
          >
            {/* 4px height progress bar */}
            <div style={{ display: 'flex', height: 4, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
              {STAGE_ORDER.slice(0, 3).map((id, idx) => {
                const colors = STAGE_COLORS[id];
                const isActive = idx === stageIndex;
                const isComplete = idx < stageIndex || stage === 'locked';
                return (
                  <div key={id} style={{ flex: 1, background: colors.bg, position: 'relative' }}>
                    <motion.div
                      animate={{ width: isComplete ? '100%' : isActive ? '60%' : '0%' }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      style={{ height: '100%', background: colors.active }}
                    />
                    {isSearching && isActive && (
                      <motion.span
                        animate={{ x: ['-30%', '200%'] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        style={{
                          position: 'absolute', top: 0, left: 0,
                          width: '40%', height: '100%',
                          background: `linear-gradient(90deg, transparent, ${colors.active}, transparent)`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Compact stats + scan trail */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'rgba(243,245,247,0.5)', letterSpacing: '0.04em' }}>
              <span>{pipelineStats?.filesScanned ?? pipelineStats?.scanned ?? 0} scanned</span>
              <span>{pipelineStats?.candidates ?? 0} candidates</span>
              <span>{pipelineStats?.cacheHits ?? 0} cached</span>
              {trail.length > 0 && (
                <span style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(243,245,247,0.38)' }}>
                  {trail[0]?.split(/[/\\]/).pop()}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results + Evidence panel */}
      <div className="ixos-search-layout">
        {/* Results list */}
        <div
          className="ixos-card ixos-search-results"
          data-scroll={allowResultsScroll}
          style={{
            display: 'grid',
            gap: 6,
            padding: 8,
          }}
        >
          {streamedRows.map((result, index) => (
            <motion.article
              key={result.id}
              className="ixos-result-row"
              data-selected={index === selectedIndex}
              onClick={() => onSelectResult?.(index)}
              initial={{ opacity: 0, x: 32, scale: 0.99 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.3, 1], delay: Math.min(index * 0.025, 0.15) }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <strong style={{ color: '#f3f5f7', fontSize: denseMode ? 12 : 13, lineHeight: 1.3 }}>{result.title}</strong>
                <span style={{ color: '#5eead4', fontSize: denseMode ? 10 : 11, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.06em' }}>
                  {(result.score * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span
                  title={result.path}
                  style={{
                    color: 'rgba(243,245,247,0.45)',
                    fontSize: denseMode ? 10 : 11,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: '1 1 0',
                    minWidth: 0,
                  }}
                >
                  {formatPathForRow(result.path)}
                </span>
                {result.matchedLineNumber && (
                  <span style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: 'rgba(246,185,76,0.12)',
                    border: '1px solid rgba(246,185,76,0.25)',
                    color: '#f6b94c',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                  }}>
                    L{result.matchedLineNumber}
                  </span>
                )}
                {result.lexicalScore != null && result.semanticScore != null && (
                  <span style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: 'rgba(20,184,166,0.08)',
                    border: '1px solid rgba(20,184,166,0.18)',
                    color: 'rgba(20,184,166,0.7)',
                    fontFamily: 'monospace',
                    flexShrink: 0,
                  }}>
                    L{(result.lexicalScore * 100).toFixed(0)} S{(result.semanticScore * 100).toFixed(0)}
                  </span>
                )}
              </div>
              <div style={{
                marginTop: 6,
                padding: '4px 6px',
                background: 'rgba(13,17,23,0.6)',
                borderRadius: 5,
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <p style={{
                  margin: 0,
                  color: 'rgba(243,245,247,0.72)',
                  fontSize: denseMode ? 10 : 11,
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: hideSearchChrome ? 1 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                }}>
                  {result.snippet}
                </p>
              </div>
            </motion.article>
          ))}

          {isSearching && streamedRows.length === 0 && (
            <>
              {Array.from({ length: 4 }, (_, idx) => (
                <motion.div
                  key={`skeleton-${idx}`}
                  className="ixos-result-row"
                  style={{ borderStyle: 'dashed', opacity: 0.7 }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.7, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <motion.span
                      style={{ width: 6, height: 6, borderRadius: 1, background: 'rgba(20,184,166,0.9)' }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: idx * 0.08 }}
                    />
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(243,245,247,0.55)' }}>
                      {trail[idx]
                        ? `Scanning ${trail[idx].split(/[/\\]/).pop() || trail[idx]}`
                        : 'Streaming lexical candidates...'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </>
          )}

          {hiddenCount > 0 && (
            <div style={{ border: '1px solid rgba(243,245,247,0.08)', borderRadius: 10, padding: '8px 12px', color: 'rgba(243,245,247,0.5)', fontSize: 11 }}>
              + {hiddenCount} more results
            </div>
          )}

          {!isSearching && streamedRows.length === 0 && (
            <div style={{ color: 'rgba(243,245,247,0.5)', fontSize: 12, padding: 8 }}>
              No results yet. Start with a question or file memory fragment.
            </div>
          )}
        </div>

        {/* Evidence aside — clean, compact */}
        <aside className="ixos-card ixos-search-evidence" style={{ display: 'grid', gap: 10, alignContent: 'start', padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <p className="ixos-chip" style={{ width: 'fit-content' }}>
              <Sparkles size={11} />
              Evidence
            </p>
            <p className="ixos-chip" style={{ borderColor: stageIndex >= 3 ? 'rgba(124,92,255,0.35)' : 'rgba(20,184,166,0.35)', color: stageIndex >= 3 ? '#a78bfa' : '#5eead4' }}>
              <Activity size={11} />
              {stage}
            </p>
          </div>

          {selected ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 13, fontWeight: 600 }}>{selected.title}</h4>
                <p style={{ margin: '4px 0 0', color: 'rgba(243,245,247,0.65)', fontSize: 12, lineHeight: 1.6 }}>
                  {selected.rationale ?? 'Lexical + semantic alignment stabilized this file.'}
                </p>
              </div>

              {/* Why Matched — heuristic synthesis */}
              <div style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid rgba(124,92,255,0.2)',
                background: 'rgba(124,92,255,0.06)',
                fontSize: 11,
                color: 'rgba(243,245,247,0.7)',
                lineHeight: 1.5,
              }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#a78bfa', marginBottom: 4, fontWeight: 600 }}>
                  Why this matched
                </div>
                {(() => {
                  const lex = selected.lexicalScore ?? 0;
                  const sem = selected.semanticScore ?? 0;
                  const boost = selected.boostScore ?? 0;
                  const parts: string[] = [];
                  if (lex > 0.6) parts.push('Strong keyword overlap in file path and content');
                  else if (lex > 0.3) parts.push('Partial keyword matches found');
                  else parts.push('Weak keyword signal');
                  if (sem > 0.7) parts.push('high semantic similarity to query intent');
                  else if (sem > 0.5) parts.push('moderate conceptual alignment');
                  else parts.push('low conceptual alignment');
                  if (boost > 0) parts.push(`+${(boost * 100).toFixed(0)}% quality boost applied`);
                  if (selected.matchedLineNumber) parts.push(`matched at line ${selected.matchedLineNumber}`);
                  return parts.join('. ') + '.';
                })()}
              </div>

              {/* Score Breakdown */}
              <div style={{ display: 'grid', gap: 6, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'rgba(243,245,247,0.5)' }}>Lexical Match</span>
                  <span style={{ color: '#f6b94c', fontVariantNumeric: 'tabular-nums' }}>{((selected.lexicalScore ?? 0.4) * 100).toFixed(0)}%</span>
                </div>
                <div style={{ width: '100%', height: 3, background: 'rgba(246,185,76,0.15)', borderRadius: 2 }}>
                  <div style={{ width: `${(selected.lexicalScore ?? 0.4) * 100}%`, height: '100%', background: '#f6b94c', borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                  <span style={{ color: 'rgba(243,245,247,0.5)' }}>Semantic Match</span>
                  <span style={{ color: '#14b8a6', fontVariantNumeric: 'tabular-nums' }}>{((selected.semanticScore ?? 0.6) * 100).toFixed(0)}%</span>
                </div>
                <div style={{ width: '100%', height: 3, background: 'rgba(20,184,166,0.15)', borderRadius: 2 }}>
                  <div style={{ width: `${(selected.semanticScore ?? 0.6) * 100}%`, height: '100%', background: '#14b8a6', borderRadius: 2 }} />
                </div>
                {(selected.boostScore ?? 0) > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                      <span style={{ color: 'rgba(243,245,247,0.5)' }}>Quality Boost</span>
                      <span style={{ color: '#a78bfa', fontVariantNumeric: 'tabular-nums' }}>+{((selected.boostScore ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: 3, background: 'rgba(124,92,255,0.15)', borderRadius: 2 }}>
                      <div style={{ width: `${(selected.boostScore ?? 0) * 100}%`, height: '100%', background: '#a78bfa', borderRadius: 2 }} />
                    </div>
                  </>
                )}
                {/* Final blended score */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'rgba(243,245,247,0.7)', fontWeight: 600 }}>Final Score</span>
                  <span style={{ color: '#5eead4', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{(selected.score * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Snippet / Where Matched */}
              <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'rgba(243,245,247,0.4)', fontFamily: 'monospace' }}>
                    {selected.path}:{selected.matchedLineNumber ?? 12}
                  </span>
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(246,185,76,0.12)', color: '#f6b94c', fontFamily: 'monospace' }}>
                    where matched
                  </span>
                </div>
                <div style={{ padding: 10, overflowX: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: 'rgba(243,245,247,0.85)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <code dangerouslySetInnerHTML={{ __html: selected.snippet.replace(/\n/g, '<br/>') }} />
                  </pre>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button type="button" className="ixos-chip" onClick={() => onOpenResult?.(selectedIndex)}
                  style={{ cursor: interactive ? 'pointer' : 'default', color: '#5eead4', borderColor: 'rgba(20,184,166,0.3)', background: 'rgba(20,184,166,0.1)' }}>
                  Open File
                </button>
                <button type="button" className="ixos-chip" onClick={() => onRevealResult?.(selectedIndex)}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}>
                  Reveal
                </button>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.5)', fontSize: 12 }}>
              Evidence updates as search packets arrive.
            </p>
          )}

          {/* Compact KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            <div className="ixos-kpi">
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scanned</p>
              <p style={{ margin: '3px 0 0', color: '#f3f5f7', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{pipelineStats?.filesScanned ?? pipelineStats?.scanned ?? 0}</p>
            </div>
            <div className="ixos-kpi">
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Candidates</p>
              <p style={{ margin: '3px 0 0', color: '#f3f5f7', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{pipelineStats?.candidates ?? 0}</p>
            </div>
            <div className="ixos-kpi">
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Embedded</p>
              <p style={{ margin: '3px 0 0', color: '#f3f5f7', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{pipelineStats?.embedded ?? 0}</p>
            </div>
            <div className="ixos-kpi">
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cache Hits</p>
              <p style={{ margin: '3px 0 0', color: '#f3f5f7', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{pipelineStats?.cacheHits ?? 0}</p>
            </div>
          </div>

          {trail.length > 0 && (
            <div style={{ display: 'grid', gap: 3 }}>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(243,245,247,0.38)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Scan trail
              </p>
              {trail.slice(0, 3).map((path) => (
                <p key={path} style={{ margin: 0, fontSize: 11, color: 'rgba(243,245,247,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {path.split(/[/\\]/).pop()}
                </p>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
