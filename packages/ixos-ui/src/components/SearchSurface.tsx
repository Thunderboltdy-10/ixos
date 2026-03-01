import { useMemo } from 'react';
import { Activity, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  
  const rawStage = pipelineStats?.stage ?? stageLabel;
  const stage = inferStage(stageLabel, rawStage);
  const fillHeight = hideSearchChrome;
  const denseMode = hideSearchChrome;

  const selected = visibleResults[selectedIndex] ?? visibleResults[0] ?? null;
  
  const progressText = isSearching ? `scanning ${pipelineStats?.filesScanned ?? 0} files...` : 'results ready';
  const progressColor = isSearching ? '#F59E0B' : '#2DD4BF';

  return (
    <div className="ixos-search-surface" data-fill={fillHeight} data-dense={denseMode}>
      {!hideSearchChrome && (
        <div style={{ paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.46)' }}>
              IXOS DESKTOP
            </span>
            <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 10, color: progressColor }}>
              {progressText}
            </span>
          </div>

          <div
            style={{
              height: 46,
              borderRadius: 8,
              border: '1px solid rgba(45,212,191,0.35)',
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
              onKeyDown={(e) => { if (e.key === 'Enter') onSubmit?.(); }}
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
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ixo-mono), monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
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
                    border: mode === item ? '1px solid rgba(45,212,191,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    background: mode === item ? 'rgba(45,212,191,0.16)' : 'transparent',
                    color: mode === item ? '#2DD4BF' : 'rgba(255,255,255,0.4)',
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
                  background: '#2DD4BF',
                  color: '#031016',
                  fontFamily: 'var(--font-ixo-mono), monospace',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '6px 12px',
                  cursor: interactive ? 'pointer' : 'default',
                  border: 'none',
                }}
              >
                Run Search
              </button>
            )}
          </div>
          
          {errorMessage && (
            <div style={{ marginTop: 10, border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', padding: '10px 12px', color: '#fca5a5', fontSize: 12 }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="ixos-search-layout" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Results list - Terminal grid style */}
        <div
          className="ixos-search-results"
          data-scroll={allowResultsScroll}
          style={{
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.015)',
            }}
          >
            <AnimatePresence>
              {visibleResults.length > 0 ? visibleResults.map((result, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    onClick={() => onSelectResult?.(index)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px',
                      borderBottom: index === visibleResults.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      background: isSelected ? 'rgba(45,212,191,0.08)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      gap: 6,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 10, color: isSelected ? 'rgba(45,212,191,0.8)' : 'rgba(255,255,255,0.38)', flexShrink: 0 }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 13, fontWeight: 500, color: isSelected ? '#2DD4BF' : 'rgba(243,245,247,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {result.title || result.path}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 11, color: isSelected ? '#2DD4BF' : 'rgba(45,212,191,0.6)', flexShrink: 0 }}>
                        {result.score.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ paddingLeft: 24 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>
                        {result.path} {result.matchedLineNumber ? `:${result.matchedLineNumber}` : ''}
                      </span>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {result.snippet.replace(/\n/g, ' ')}
                      </p>
                    </div>
                  </motion.div>
                );
              }) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 12 }}
                >
                  {isSearching ? 'waiting for results...' : 'no results found.'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '0 4px' }}>
            <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>
              lexical {'->'} semantic {'->'} lock
            </span>
            <span style={{ fontFamily: 'var(--font-ixo-mono), monospace', fontSize: 10, color: 'rgba(45,212,191,0.9)' }}>
              {pipelineStats?.candidates ?? 0} matches | local-first
            </span>
          </div>
        </div>

        {/* Evidence aside */}
        <aside 
          className="ixos-card ixos-search-evidence" 
          style={{ 
            width: '380px', 
            flexShrink: 0, 
            display: 'grid', 
            gap: 16, 
            padding: 20,
            background: 'rgba(18, 20, 24, 0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            position: 'sticky',
            top: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f3f5f7', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} className="text-accent-teal" />
              Evidence
            </h2>
            <div className="ixos-chip" style={{ background: 'rgba(20,184,166,0.1)', color: '#5eead4', borderColor: 'rgba(20,184,166,0.2)' }}>
              <Activity size={12} />
              {stage}
            </div>
          </div>

          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 15, fontWeight: 500, wordBreak: 'break-word' }}>
                  {selected.title}
                </h4>
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: '#bdc1c6', fontFamily: 'monospace' }}>
                    Path: {selected.path}
                  </span>
                  {selected.matchedLineNumber && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(20,184,166,0.1)', color: '#5eead4', fontFamily: 'monospace' }}>
                      Line {selected.matchedLineNumber}
                    </span>
                  )}
                </div>
              </div>

              {selected.rationale && (
                <div style={{ fontSize: 13, color: '#e8eaed', lineHeight: 1.5, fontFamily: 'var(--font-ixo-mono), monospace' }}>
                  {selected.rationale}
                </div>
              )}

              {/* Large Code Snippet */}
              <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9aa0a6', fontFamily: 'monospace' }}>
                    Match Context
                  </span>
                </div>
                <div style={{ padding: 16, overflowX: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: 12, fontFamily: 'monospace', color: '#e8eaed', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <code dangerouslySetInnerHTML={{ __html: selected.snippet.replace(/\n/g, '<br/>') }} />
                  </pre>
                </div>
              </div>

              {/* Detailed Score Breakdown */}
              <div style={{ display: 'grid', gap: 12, background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa0a6', fontWeight: 600 }}>Score Analysis</h4>
                
                {selected.lexicalScore !== undefined && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#bdc1c6', fontFamily: 'var(--font-ixo-mono), monospace' }}>Lexical Match (BM25)</span>
                      <span style={{ color: '#f6b94c', fontWeight: 600, fontFamily: 'var(--font-ixo-mono), monospace' }}>{(selected.lexicalScore * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(246,185,76,0.15)', borderRadius: 2 }}>
                      <div style={{ width: `${selected.lexicalScore * 100}%`, height: '100%', background: '#f6b94c', borderRadius: 2, boxShadow: '0 0 8px rgba(246,185,76,0.4)' }} />
                    </div>
                  </div>
                )}
                
                {selected.semanticScore !== undefined && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#bdc1c6', fontFamily: 'var(--font-ixo-mono), monospace' }}>Semantic Similarity</span>
                      <span style={{ color: '#14b8a6', fontWeight: 600, fontFamily: 'var(--font-ixo-mono), monospace' }}>{(selected.semanticScore * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(20,184,166,0.15)', borderRadius: 2 }}>
                      <div style={{ width: `${selected.semanticScore * 100}%`, height: '100%', background: '#14b8a6', borderRadius: 2, boxShadow: '0 0 8px rgba(20,184,166,0.4)' }} />
                    </div>
                  </div>
                )}
                
                {(selected.boostScore ?? 0) > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#bdc1c6', fontFamily: 'var(--font-ixo-mono), monospace' }}>Quality Boost</span>
                      <span style={{ color: '#a78bfa', fontWeight: 600, fontFamily: 'var(--font-ixo-mono), monospace' }}>+{(selected.boostScore! * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(124,92,255,0.15)', borderRadius: 2 }}>
                      <div style={{ width: `${selected.boostScore! * 100}%`, height: '100%', background: '#a78bfa', borderRadius: 2, boxShadow: '0 0 8px rgba(124,92,255,0.4)' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: '#f3f5f7', fontWeight: 600, fontFamily: 'var(--font-ixo-mono), monospace' }}>Final Match Score</span>
                  <span style={{ color: '#5eead4', fontWeight: 700, fontFamily: 'var(--font-ixo-mono), monospace' }}>{(selected.score * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => onOpenResult?.(selectedIndex)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: interactive ? 'pointer' : 'default', color: '#031016', background: '#5eead4', border: 'none', transition: 'background 0.2s', fontFamily: 'var(--font-ixo-mono), monospace' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#2dd4bf'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#5eead4'}
                >
                  Open in Editor
                </button>
                <button type="button" onClick={() => onRevealResult?.(selectedIndex)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: interactive ? 'pointer' : 'default', color: '#f3f5f7', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', transition: 'background 0.2s', fontFamily: 'var(--font-ixo-mono), monospace' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  Reveal File
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <p style={{ margin: 0, color: '#9aa0a6', fontSize: 14, textAlign: 'center', fontFamily: 'var(--font-ixo-mono), monospace' }}>
                Select a result to view detailed evidence and match analysis.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}