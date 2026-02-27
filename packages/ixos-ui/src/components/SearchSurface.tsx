import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Search, Sparkles } from 'lucide-react';
import type { IxosSearchResult } from '../types';

type SearchMode = 'flash' | 'auto' | 'pro';

interface PipelineStats {
  stage?: string;
  filesScanned?: number;
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

function inferStage(stageLabel: string, stage?: string) {
  const raw = (stage ?? stageLabel).toLowerCase();
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
  sourcePath,
  interactive = true,
}: SearchSurfaceProps) {
  const visibleResults = useMemo(
    () => (resultLimit ? results.slice(0, resultLimit) : results),
    [resultLimit, results],
  );
  const hiddenCount = Math.max(0, results.length - visibleResults.length);
  const stage = inferStage(stageLabel, pipelineStats?.stage);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const trail = (pipelineStats?.scanTrail ?? []).slice(-4).reverse();
  const stageProgress = stageIndex <= 0 ? 24 : stageIndex === 1 ? 52 : stageIndex === 2 ? 78 : 100;
  const progressBoost = Math.min(20, Math.floor((pipelineStats?.embedded ?? 0) / 2));
  const progressPercent = Math.min(100, stageProgress + progressBoost);
  const [streamedCount, setStreamedCount] = useState(0);

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
    <div style={{ display: 'grid', gap: 12 }}>
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
            <div
              style={{
                border: '1px solid rgba(243, 245, 247, 0.14)',
                borderRadius: 10,
                padding: '8px 12px',
                color: 'rgba(243,245,247,0.58)',
                fontSize: 11,
                background: 'rgba(10, 13, 18, 0.46)',
              }}
            >
              Directory: {directoryLabel}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gap: 10,
              border: '1px solid rgba(243, 245, 247, 0.14)',
              borderRadius: 12,
              padding: 6,
              background: 'linear-gradient(180deg, rgba(10,13,18,0.88) 0%, rgba(10,13,18,0.72) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className="ixos-chip"
                style={{
                  borderColor: 'rgba(243,245,247,0.16)',
                  color: 'rgba(243,245,247,0.72)',
                  background: 'rgba(255,255,255,0.04)',
                  minWidth: 74,
                  justifyContent: 'center',
                }}
              >
                Search
              </span>
              <input
                className="ixos-input"
                value={query}
                onChange={(event) => onQueryChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onSubmit?.();
                  }
                }}
                placeholder="Type what you remember..."
                readOnly={!interactive}
                style={{
                  border: '1px solid rgba(243, 245, 247, 0.12)',
                  background: 'rgba(8, 11, 15, 0.82)',
                  height: 44,
                }}
              />
              {showInlineRunButton && (
                <button
                  type="button"
                  onClick={() => onSubmit?.()}
                  className="ixos-chip"
                  style={{
                    cursor: interactive ? 'pointer' : 'default',
                    padding: '0 14px',
                    borderRadius: 10,
                    height: 44,
                    borderColor: 'rgba(20, 184, 166, 0.42)',
                    color: '#5eead4',
                    background: 'rgba(20, 184, 166, 0.12)',
                    fontWeight: 700,
                  }}
                >
                  Run Search
                </button>
              )}
            </div>

            {!showInlineRunButton && (
              <div
                style={{
                  justifySelf: 'end',
                  paddingRight: 8,
                  fontSize: 10,
                  color: 'rgba(243,245,247,0.46)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                press enter to run
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MODES.map((item) => (
              <button
                key={item}
                type="button"
                className="ixos-chip"
                onClick={() => onModeChange?.(item)}
                style={{
                  cursor: interactive ? 'pointer' : 'default',
                  borderColor: mode === item ? 'rgba(20, 184, 166, 0.45)' : undefined,
                  color: mode === item ? '#5eead4' : undefined,
                  background: mode === item ? 'rgba(20, 184, 166, 0.15)' : undefined,
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {presets.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="ixos-chip"
                  onClick={() => onPresetSelect?.(preset)}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '10px 12px',
                color: '#fca5a5',
                fontSize: 12,
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(280px,0.65fr)', gap: 12 }}>
        <div
          className="ixos-card"
          style={{
            display: 'grid',
            gap: 8,
            height: hideSearchChrome ? 'min(65vh, 690px)' : 'min(56vh, 610px)',
            overflow: allowResultsScroll ? 'auto' : 'hidden',
            padding: 10,
          }}
        >
          {streamedRows.map((result, index) => (
            <motion.article
              key={result.id}
              className="ixos-result-row"
              data-selected={index === selectedIndex}
              onClick={() => onSelectResult?.(index)}
              initial={{ opacity: 0, x: 52, scale: 0.985 }}
              animate={{ opacity: [0, 1, 1], x: [52, -7, 0], scale: [0.985, 1.01, 1] }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.3, 1], delay: Math.min(index * 0.028, 0.18) }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <strong style={{ color: '#f3f5f7', fontSize: 14, lineHeight: 1.25 }}>{result.title}</strong>
                <span style={{ color: '#5eead4', fontSize: 11, letterSpacing: '0.08em' }}>
                  {(result.score * 100).toFixed(0)}%
                </span>
              </div>
              <p style={{ marginTop: 5, color: 'rgba(243,245,247,0.52)', fontSize: 11 }}>{result.path}</p>
              <p
                style={{
                  marginTop: 8,
                  color: 'rgba(243,245,247,0.8)',
                  fontSize: 12,
                  display: '-webkit-box',
                  WebkitLineClamp: hideSearchChrome ? 1 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {result.snippet}
              </p>
            </motion.article>
          ))}

          {isSearching && streamedRows.length === 0 && (
            <>
              {Array.from({ length: 4 }, (_, idx) => (
                <motion.div
                  key={`skeleton-${idx}`}
                  className="ixos-result-row"
                  style={{ borderStyle: 'dashed', opacity: 0.75 }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 0.75, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.22 }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <motion.span
                      style={{ width: 7, height: 7, borderRadius: 1, background: 'rgba(20,184,166,0.9)' }}
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: idx * 0.08 }}
                    />
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(243,245,247,0.62)' }}>
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
            <div
              style={{
                border: '1px solid rgba(243,245,247,0.08)',
                borderRadius: 10,
                padding: '10px 12px',
                color: 'rgba(243,245,247,0.58)',
                fontSize: 12,
              }}
            >
              + {hiddenCount} more results hidden for focus
            </div>
          )}

          {!isSearching && streamedRows.length === 0 && (
            <div style={{ color: 'rgba(243,245,247,0.6)', fontSize: 12, padding: 8 }}>
              No results yet. Start with a question or file memory fragment.
            </div>
          )}
        </div>

        <aside className="ixos-card" style={{ display: 'grid', gap: 10, alignContent: 'start', padding: 12 }}>
          <div style={{ display: 'grid', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'rgba(243,245,247,0.58)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <span>Pipeline progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', background: 'rgba(243,245,247,0.1)', position: 'relative' }}>
              <motion.div
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.28, ease: [0.2, 0.95, 0.2, 1] }}
                style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, rgba(20,184,166,0.66), rgba(20,184,166,0.96))' }}
              />
              {isSearching && (
                <motion.span
                  animate={{ x: ['-20%', '190%'] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '40%',
                    height: '100%',
                    background: 'linear-gradient(90deg, rgba(20,184,166,0), rgba(20,184,166,0.86), rgba(20,184,166,0))',
                  }}
                />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <p className="ixos-chip" style={{ width: 'fit-content' }}>
              <Sparkles size={12} />
              Evidence
            </p>
            <p className="ixos-chip" style={{ borderColor: 'rgba(20,184,166,0.35)', color: '#5eead4' }}>
              <Activity size={12} />
              {stage}
            </p>
          </div>

          {selected ? (
            <>
              <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 13 }}>{selected.title}</h4>
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.7)', fontSize: 12 }}>
                {selected.rationale ?? 'Lexical + semantic alignment stabilized this file.'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="ixos-chip"
                  onClick={() => onOpenResult?.(selectedIndex)}
                  style={{ cursor: interactive ? 'pointer' : 'default', color: '#5eead4' }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="ixos-chip"
                  onClick={() => onRevealResult?.(selectedIndex)}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}
                >
                  Reveal
                </button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.6)', fontSize: 12 }}>
              Evidence updates as search packets arrive.
            </p>
          )}

          <div style={{ marginTop: 2, display: 'grid', gap: 6 }}>
            {STAGE_ORDER.map((id, idx) => (
              <div key={id} style={{ display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(243,245,247,0.54)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <span>{id}</span>
                  <span>{idx <= stageIndex ? 'active' : 'queued'}</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: 'rgba(243,245,247,0.09)', overflow: 'hidden', position: 'relative' }}>
                  <motion.div
                    animate={{ width: `${idx < stageIndex ? 100 : idx === stageIndex ? (isSearching ? 62 : 100) : 12}%` }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: '100%', borderRadius: 999, background: idx <= stageIndex ? 'rgba(20,184,166,0.92)' : 'rgba(243,245,247,0.2)' }}
                  />
                  {isSearching && idx === stageIndex && (
                    <motion.span
                      animate={{ x: ['-35%', '240%'] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '42%',
                        height: '100%',
                        background: 'linear-gradient(90deg, rgba(20,184,166,0), rgba(20,184,166,0.8), rgba(20,184,166,0))',
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div className="ixos-kpi">
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scanned</p>
              <p style={{ margin: '5px 0 0', color: '#f3f5f7', fontSize: 14 }}>{pipelineStats?.filesScanned ?? 0}</p>
            </div>
            <div className="ixos-kpi">
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Candidates</p>
              <p style={{ margin: '5px 0 0', color: '#f3f5f7', fontSize: 14 }}>{pipelineStats?.candidates ?? 0}</p>
            </div>
            <div className="ixos-kpi">
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Embedded</p>
              <p style={{ margin: '5px 0 0', color: '#f3f5f7', fontSize: 14 }}>{pipelineStats?.embedded ?? 0}</p>
            </div>
            <div className="ixos-kpi">
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cache Hits</p>
              <p style={{ margin: '5px 0 0', color: '#f3f5f7', fontSize: 14 }}>{pipelineStats?.cacheHits ?? 0}</p>
            </div>
          </div>

          {trail.length > 0 && (
            <div style={{ display: 'grid', gap: 4 }}>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(243,245,247,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Scan trail
              </p>
              {trail.map((path) => (
                <p key={path} style={{ margin: 0, fontSize: 11, color: 'rgba(243,245,247,0.64)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {path}
                </p>
              ))}
            </div>
          )}

          <p style={{ margin: 0, color: 'rgba(243,245,247,0.42)', fontSize: 10 }}>
            {sourcePath ?? 'source: src-tauri/src/commands/search.rs'}
          </p>
        </aside>
      </div>

      {isSearching && (
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(243,245,247,0.08)', overflow: 'hidden' }}>
          <div
            style={{
              width: '42%',
              height: '100%',
              background:
                'linear-gradient(90deg, rgba(20,184,166,0.15), rgba(20,184,166,0.9), rgba(20,184,166,0.15))',
              animation: 'ixosPulse 1.1s linear infinite',
            }}
          />
        </div>
      )}
    </div>
  );
}
