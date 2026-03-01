import { useMemo, useState, type CSSProperties } from 'react';
import { Activity, Copy, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IxosSearchResult } from '../types';

type SearchMode = 'flash' | 'auto' | 'pro';
type SearchTone = 'teal' | 'amber' | 'violet';

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
  mode?: SearchMode;
  tone?: SearchTone;
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
  presets?: string[];
  onPresetSelect?: (value: string) => void;
}

interface AccentTheme {
  id: SearchTone;
  accent: string;
  accentSoft: string;
  accentFaint: string;
  accentStrong: string;
  border: string;
  text: string;
}

interface MatchLine {
  lineNumber: number | null;
  text: string;
  kind: 'before' | 'match' | 'after';
}

const MODES: SearchMode[] = ['flash', 'auto', 'pro'];

const THEMES: Record<SearchTone, AccentTheme> = {
  teal: {
    id: 'teal',
    accent: '#2DD4BF',
    accentSoft: 'rgba(45, 212, 191, 0.18)',
    accentFaint: 'rgba(45, 212, 191, 0.08)',
    accentStrong: 'rgba(45, 212, 191, 0.8)',
    border: 'rgba(45, 212, 191, 0.4)',
    text: '#5EEAD4',
  },
  amber: {
    id: 'amber',
    accent: '#F59E0B',
    accentSoft: 'rgba(245, 158, 11, 0.18)',
    accentFaint: 'rgba(245, 158, 11, 0.08)',
    accentStrong: 'rgba(245, 158, 11, 0.8)',
    border: 'rgba(245, 158, 11, 0.42)',
    text: '#FCD34D',
  },
  violet: {
    id: 'violet',
    accent: '#A78BFA',
    accentSoft: 'rgba(167, 139, 250, 0.2)',
    accentFaint: 'rgba(167, 139, 250, 0.08)',
    accentStrong: 'rgba(167, 139, 250, 0.84)',
    border: 'rgba(167, 139, 250, 0.44)',
    text: '#C4B5FD',
  },
};

function inferStage(stageLabel: string, stage?: string) {
  const raw = (stage ?? stageLabel).toLowerCase();
  if (raw === 'scan' || raw.includes('scanning')) return 'lexical';
  if (raw.includes('lexical')) return 'lexical';
  if (raw.includes('semantic')) return 'semantic';
  if (raw.includes('refin')) return 'refining';
  if (raw.includes('lock') || raw.includes('tail') || raw.includes('complete')) return 'locked';
  return 'lexical';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveTheme(mode: SearchMode, tone?: SearchTone): AccentTheme {
  if (tone) return THEMES[tone];
  if (mode === 'flash') return THEMES.amber;
  if (mode === 'pro') return THEMES.violet;
  return THEMES.teal;
}

function normalizeRatio(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value <= 1) return clamp(value, 0, 1);
  if (value <= 4.2) return clamp(value / 4, 0, 1);
  if (value <= 100) return clamp(value / 100, 0, 1);
  return clamp(value / (value + 100), 0, 1);
}

function formatPercent(value: number | undefined, digits = 1): string {
  return `${(normalizeRatio(value) * 100).toFixed(digits)}%`;
}

function cleanSearchText(input: string): string {
  const withoutAnsi = input.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
  const printable = withoutAnsi
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
  return printable;
}

function buildContextLines(result: IxosSearchResult): MatchLine[] {
  const hasStructuredContext =
    (result.contextBefore && result.contextBefore.length > 0) ||
    (result.contextMatch && result.contextMatch.length > 0) ||
    (result.contextAfter && result.contextAfter.length > 0);

  if (hasStructuredContext) {
    const start = Math.max(1, (result.matchedLineNumber ?? 1) - (result.contextBefore?.length ?? 0));
    const before = (result.contextBefore ?? []).map((text, index) => ({
      lineNumber: start + index,
      text: cleanSearchText(text),
      kind: 'before' as const,
    }));
    const matchStart = start + before.length;
    const match = (result.contextMatch ?? [result.snippet]).map((text, index) => ({
      lineNumber: matchStart + index,
      text: cleanSearchText(text),
      kind: 'match' as const,
    }));
    const afterStart = matchStart + match.length;
    const after = (result.contextAfter ?? []).map((text, index) => ({
      lineNumber: afterStart + index,
      text: cleanSearchText(text),
      kind: 'after' as const,
    }));
    return [...before, ...match, ...after].filter((line) => line.text.trim().length > 0);
  }

  const base = cleanSearchText(result.snippet)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(0, 8);

  const line = result.matchedLineNumber ?? null;
  return base.length > 0
    ? base.map((text, index) => ({
        lineNumber: line ? line + index : null,
        text,
        kind: index === 0 ? 'match' as const : 'after' as const,
      }))
    : [{ lineNumber: line, text: 'No context available for this result.', kind: 'after' as const }];
}

function compactPath(path: string): string {
  if (path.length <= 120) return path;
  return `${path.slice(0, 55)}...${path.slice(-55)}`;
}

export function SearchSurface({
  query,
  onQueryChange,
  onSubmit,
  directoryLabel,
  mode = 'auto',
  tone,
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
  presets,
  onPresetSelect,
}: SearchSurfaceProps) {
  const visibleResults = useMemo(
    () => (resultLimit ? results.slice(0, resultLimit) : results),
    [resultLimit, results],
  );

  const rawStage = pipelineStats?.stage ?? stageLabel;
  const stage = inferStage(stageLabel, rawStage);
  const fillHeight = hideSearchChrome;
  const denseMode = hideSearchChrome;
  const theme = resolveTheme(mode, tone);

  const selected = visibleResults[selectedIndex] ?? visibleResults[0] ?? null;
  const safeSelectedIndex = visibleResults.length > 0 ? clamp(selectedIndex, 0, visibleResults.length - 1) : 0;

  const progressText = isSearching
    ? `scanning ${pipelineStats?.filesScanned ?? pipelineStats?.scanned ?? 0} files...`
    : visibleResults.length > 0
      ? `${visibleResults.length} result${visibleResults.length === 1 ? '' : 's'} ready`
      : 'ready';

  const scanTrail = useMemo(
    () => [...(pipelineStats?.scanTrail ?? [])].slice(-8).reverse(),
    [pipelineStats?.scanTrail],
  );

  const contextLines = useMemo(() => (selected ? buildContextLines(selected) : []), [selected]);

  const lexicalRatio = normalizeRatio(selected?.lexicalScore);
  const semanticRatio = normalizeRatio(selected?.semanticScore);
  const boostRatio = normalizeRatio(selected?.boostScore);
  const finalRatio = normalizeRatio(selected?.score ?? 0);

  const [copiedKind, setCopiedKind] = useState<'path' | 'context' | null>(null);
  const surfaceVars = {
    '--ixos-accent': theme.accent,
    '--ixos-accent-soft': theme.accentSoft,
    '--ixos-accent-faint': theme.accentFaint,
    '--ixos-accent-strong': theme.accentStrong,
    '--ixos-accent-border': theme.border,
  } as CSSProperties;

  const handleCopy = async (kind: 'path' | 'context') => {
    if (!selected) return;
    const payload = kind === 'path'
      ? selected.path
      : contextLines.map((line) => `${line.lineNumber ?? '--'}  ${line.text}`).join('\n');

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
        setCopiedKind(kind);
        setTimeout(() => setCopiedKind((current) => (current === kind ? null : current)), 1100);
      }
    } catch {
      // Clipboard failure should not break the panel.
    }
  };

  return (
    <div
      className="ixos-search-surface"
      data-fill={fillHeight}
      data-dense={denseMode}
      data-tone={theme.id}
      style={surfaceVars}
    >
      {!hideSearchChrome && (
        <div style={{ paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.46)' }}>
              IXOS DESKTOP
            </span>
            <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 10, color: theme.text }}>
              {progressText}
            </span>
          </div>

          <div
            style={{
              height: 46,
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: 'rgba(10,14,18,0.85)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 12px',
            }}
          >
            <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              query
            </span>
            <input
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit?.();
              }}
              readOnly={!interactive}
              placeholder="Type what you remember..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#F3F5F7',
                fontFamily: 'var(--font-ixo-mono), monospace',
                fontSize: 13,
                flex: 1,
              }}
            />
            {directoryLabel && (
              <span
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'var(--font-ixo-mono), monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 280,
                }}
              >
                in {directoryLabel}
              </span>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              {MODES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onModeChange?.(item)}
                  style={{
                    borderRadius: 999,
                    border: mode === item ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.12)',
                    background: mode === item ? theme.accentSoft : 'transparent',
                    color: mode === item ? theme.text : 'rgba(255,255,255,0.44)',
                    fontFamily: 'var(--font-ixo-mono), monospace',
                    fontSize: 10,
                    padding: '4px 10px',
                    cursor: interactive ? 'pointer' : 'default',
                    textTransform: 'capitalize',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            {showInlineRunButton && (
              <button
                type="button"
                onClick={() => onSubmit?.()}
                style={{
                  borderRadius: 8,
                  background: theme.accent,
                  color: '#041015',
                  fontFamily: 'var(--font-ixo-mono), monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 12px',
                  cursor: interactive ? 'pointer' : 'default',
                  border: 'none',
                }}
              >
                Run Search
              </button>
            )}
          </div>

          {presets && presets.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onPresetSelect?.(preset)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 6,
                    color: theme.text,
                    fontFamily: 'var(--font-ixo-mono), monospace',
                    fontSize: 10,
                    padding: '3px 9px',
                    cursor: interactive ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 200,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (interactive) {
                      (e.currentTarget as HTMLButtonElement).style.background = theme.accentFaint;
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          {errorMessage && (
            <div style={{ marginTop: 10, border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', padding: '10px 12px', color: '#fca5a5', fontSize: 12 }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="ixos-search-layout">
        <div className="ixos-search-results" data-scroll={allowResultsScroll}>
          <div className="ixos-search-meta-row">
            <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
              lexical {'->'} semantic {'->'} lock
            </span>
            <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 10, color: theme.text }}>
              {pipelineStats?.candidates ?? visibleResults.length} matches | local-first
            </span>
          </div>

          {isSearching && scanTrail.length > 0 && (
            <div className="ixos-stream-activity">
              {scanTrail.map((path, index) => (
                <motion.div
                  key={`${path}-${index}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.95, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.24) }}
                  className="ixos-stream-row"
                >
                  <span className="ixos-stream-dot" />
                  <span className="ixos-stream-path">{compactPath(path)}</span>
                </motion.div>
              ))}
            </div>
          )}

          <div className="ixos-result-list">
            <AnimatePresence>
              {visibleResults.length > 0 ? (
                visibleResults.map((result, index) => {
                  const isSelected = index === safeSelectedIndex;
                  const ratio = normalizeRatio(result.score);
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.12) }}
                      className="ixos-result-row"
                      data-selected={isSelected}
                      onClick={() => onSelectResult?.(index)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                          <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 11, color: isSelected ? theme.text : 'rgba(255,255,255,0.42)', flexShrink: 0 }}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 15, fontWeight: 700, color: isSelected ? '#F8FAFC' : 'rgba(243,245,247,0.93)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {result.title || result.path}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 12, color: isSelected ? theme.text : 'rgba(255,255,255,0.64)', flexShrink: 0 }}>
                          {(ratio * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ paddingLeft: 28 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', fontFamily: 'var(--font-ixo-mono), monospace', display: 'block', marginBottom: 5 }}>
                          {compactPath(result.path)}{result.matchedLineNumber ? `:${result.matchedLineNumber}` : ''}
                        </span>
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {cleanSearchText(result.snippet).replace(/\s+/g, ' ')}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.34)', fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 12 }}
                >
                  {isSearching ? 'warming first ranked results...' : 'no results found.'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <aside className="ixos-card ixos-search-evidence">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f3f5f7', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Sparkles size={16} style={{ color: theme.accent }} />
              About Match
            </h2>
            <div className="ixos-chip" style={{ background: theme.accentFaint, color: theme.text, borderColor: theme.border }}>
              <Activity size={12} />
              {stage}
            </div>
          </div>

          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 16, fontWeight: 700, wordBreak: 'break-word' }}>
                  {selected.title}
                </h4>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: '#bdc1c6', fontFamily: 'var(--font-ixo-mono), monospace' }}>
                    {compactPath(selected.path)}
                  </span>
                  {selected.matchedLineNumber ? (
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, background: theme.accentSoft, color: theme.text, fontFamily: 'var(--font-ixo-mono), monospace' }}>
                      Line {selected.matchedLineNumber}
                    </span>
                  ) : null}
                </div>
              </div>

              {selected.rationale && (
                <div style={{ fontSize: 12, color: '#e8eaed', lineHeight: 1.55, fontFamily: 'var(--font-ixo-mono), monospace' }}>
                  {cleanSearchText(selected.rationale)}
                </div>
              )}

              <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9aa0a6', fontFamily: 'var(--font-ixo-mono), monospace' }}>
                    Match Context
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy('context')}
                    style={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      background: copiedKind === 'context' ? theme.accentSoft : 'rgba(255,255,255,0.04)',
                      color: copiedKind === 'context' ? theme.text : 'rgba(243,245,247,0.74)',
                      fontSize: 10,
                      fontFamily: 'var(--font-ixo-mono), monospace',
                      padding: '4px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      cursor: interactive ? 'pointer' : 'default',
                    }}
                  >
                    {copiedKind === 'context' ? <Check size={11} /> : <Copy size={11} />}
                    {copiedKind === 'context' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ padding: 10, maxHeight: 252, overflow: 'auto' }}>
                  {contextLines.map((line, index) => (
                    <div
                      key={`${line.lineNumber ?? 'x'}-${index}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '58px minmax(0, 1fr)',
                        gap: 12,
                        padding: '3px 2px',
                        borderRadius: 6,
                        background: 'transparent',
                      }}
                    >
                      <span style={{ color: line.kind === 'match' ? theme.text : 'rgba(255,255,255,0.42)', fontSize: 11, fontFamily: 'var(--font-ixo-mono), monospace' }}>
                        {line.lineNumber ?? '--'}
                      </span>
                      <span style={{ color: line.kind === 'match' ? '#f5f8fa' : 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 1.5, fontFamily: 'var(--font-ixo-mono), monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {line.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10, background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9aa0a6', fontWeight: 700 }}>Score Analysis</h4>

                {selected.lexicalScore !== undefined && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#bdc1c6', fontFamily: 'var(--font-ixo-mono), monospace' }}>Lexical Match</span>
                      <span style={{ color: '#f6b94c', fontWeight: 700, fontFamily: 'var(--font-ixo-mono), monospace' }}>{formatPercent(selected.lexicalScore)}</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(246,185,76,0.15)', borderRadius: 2 }}>
                      <div style={{ width: `${(lexicalRatio * 100).toFixed(1)}%`, height: '100%', background: '#f6b94c', borderRadius: 2 }} />
                    </div>
                  </div>
                )}

                {selected.semanticScore !== undefined && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#bdc1c6', fontFamily: 'var(--font-ixo-mono), monospace' }}>Semantic Similarity</span>
                      <span style={{ color: theme.text, fontWeight: 700, fontFamily: 'var(--font-ixo-mono), monospace' }}>{formatPercent(selected.semanticScore)}</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(20,184,166,0.15)', borderRadius: 2 }}>
                      <div style={{ width: `${(semanticRatio * 100).toFixed(1)}%`, height: '100%', background: theme.accent, borderRadius: 2 }} />
                    </div>
                  </div>
                )}

                {(selected.boostScore ?? 0) > 0.005 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#bdc1c6', fontFamily: 'var(--font-ixo-mono), monospace' }}>Quality Boost</span>
                      <span style={{ color: '#a78bfa', fontWeight: 700, fontFamily: 'var(--font-ixo-mono), monospace' }}>+{formatPercent(selected.boostScore)}</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(124,92,255,0.15)', borderRadius: 2 }}>
                      <div style={{ width: `${(boostRatio * 100).toFixed(1)}%`, height: '100%', background: '#a78bfa', borderRadius: 2 }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: '#f3f5f7', fontWeight: 700, fontFamily: 'var(--font-ixo-mono), monospace' }}>Final Match Score</span>
                  <span style={{ color: theme.text, fontWeight: 700, fontFamily: 'var(--font-ixo-mono), monospace' }}>
                    {(finalRatio * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <button
                  type="button"
                  onClick={() => onOpenResult?.(safeSelectedIndex)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: interactive ? 'pointer' : 'default',
                    color: theme.text,
                    background: theme.accentSoft,
                    border: `1px solid ${theme.border}`,
                    fontFamily: 'var(--font-ixo-mono), monospace',
                  }}
                >
                  Open in Editor
                </button>
                <button
                  type="button"
                  onClick={() => onRevealResult?.(safeSelectedIndex)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 9,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: interactive ? 'pointer' : 'default',
                    color: '#f3f5f7',
                    background: theme.accentFaint,
                    border: `1px solid ${theme.border}`,
                    fontFamily: 'var(--font-ixo-mono), monospace',
                  }}
                >
                  Reveal File
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy('path')}
                  style={{
                    gridColumn: '1 / -1',
                    padding: '8px 12px',
                    borderRadius: 9,
                    fontWeight: 600,
                    fontSize: 11,
                    cursor: interactive ? 'pointer' : 'default',
                    color: copiedKind === 'path' ? theme.text : 'rgba(255,255,255,0.86)',
                    background: copiedKind === 'path' ? theme.accentFaint : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${copiedKind === 'path' ? theme.border : 'rgba(255,255,255,0.1)'}`,
                    fontFamily: 'var(--font-ixo-mono), monospace',
                    display: 'inline-flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {copiedKind === 'path' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKind === 'path' ? 'Path copied' : 'Copy file path'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
              <p style={{ margin: 0, color: '#9aa0a6', fontSize: 13, textAlign: 'center', fontFamily: 'var(--font-ixo-mono), monospace', lineHeight: 1.5 }}>
                Select a result to inspect context, scoring signals, and quick actions.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
