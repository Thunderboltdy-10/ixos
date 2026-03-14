import type { CSSProperties } from 'react';
import { Calendar, Layers, Search } from 'lucide-react';
import { SearchSurface } from './SearchSurface';
import { TodaySurface } from './TodaySurface';
import { WorkstreamsSurface } from './WorkstreamsSurface';
import type {
  IxosSearchResult,
  IxosTodayRow,
  IxosTodaySignal,
  IxosView,
  IxosWorkstreamRow,
} from '../types';

interface AppWorldSurfaceProps {
  view: IxosView;
  onViewChange?: (view: IxosView) => void;
  title?: string;
  subtitle?: string;
  search: {
    query: string;
    directoryLabel?: string;
    mode?: 'flash' | 'auto' | 'pro';
    stageLabel?: string;
    isSearching?: boolean;
    results: IxosSearchResult[];
    selectedIndex?: number;
    onSelectResult?: (index: number) => void;
    onOpenResult?: (index: number) => void;
    onRevealResult?: (index: number) => void;
    allowResultsScroll?: boolean;
    showInlineRunButton?: boolean;
    hideSearchChrome?: boolean;
    resultLimit?: number;
    pipelineStats?: {
      stage?: string;
      filesScanned?: number;
      scanned?: number;
      candidates?: number;
      embedded?: number;
      cacheHits?: number;
      scanTrail?: string[];
    };
    onQueryChange?: (value: string) => void;
    onSubmit?: () => void;
    presets?: string[];
    onPresetSelect?: (value: string) => void;
    onModeChange?: (mode: 'flash' | 'auto' | 'pro') => void;
    sourcePath?: string;
    interactive?: boolean;
  };
  today: {
    dateLabel: string;
    signals: IxosTodaySignal[];
    resumeRows: IxosTodayRow[];
    recentRows: IxosTodayRow[];
    suggestedRows: IxosTodayRow[];
    sourcePath?: string;
  };
  workstreams: {
    rows: IxosWorkstreamRow[];
    selectedId?: string;
    onSelectRow?: (id: string) => void;
    summary: Array<{ label: string; value: string; hint: string }>;
    sourcePath?: string;
  };
  interactive?: boolean;
  displayMode?: 'full' | 'search-only' | 'rail-only' | 'search-results-only';
  className?: string;
  style?: CSSProperties;
}

export function AppWorldSurface({
  view,
  onViewChange,
  title = 'Ixos Desktop',
  subtitle = 'Local-first search cockpit',
  search,
  today,
  workstreams,
  interactive = true,
  displayMode = 'full',
  className,
  style,
}: AppWorldSurfaceProps) {
  const showRail = displayMode === 'full' || displayMode === 'rail-only';
  const showPanel = displayMode === 'full' || displayMode === 'search-only' || displayMode === 'search-results-only';

  return (
    <section className={`ixos-world ${className ?? ''}`} data-display-mode={displayMode} style={style}>
      <div className="ixos-world-grid" style={{ gridTemplateColumns: showRail && showPanel ? '210px minmax(0, 1fr)' : '1fr' }}>
        {showRail && (
          <aside className="ixos-world-rail" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 14px' }}>
            {/* Header: Logo & New Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 20, height: 20, background: '#2DD4BF', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#0F1115', fontWeight: 900, fontSize: 12 }}>I</span>
                </div>
                <strong style={{ color: '#f3f5f7', fontSize: 14, letterSpacing: '-0.01em' }}>Ixos</strong>
              </div>
              <button
                type="button"
                className="ixos-nav-btn-mini"
                title="New Search (Ctrl+N)"
                style={{
                  width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.6)', cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>

            {/* Main Nav */}
            <nav style={{ display: 'grid', gap: 2, marginBottom: 28 }}>
              <button type="button" className="ixos-nav-link" data-active={view === 'search'} onClick={() => onViewChange?.('search')}>
                <Search size={14} />
                <span>Search</span>
              </button>
              <button type="button" className="ixos-nav-link" data-active={view === 'today'} onClick={() => onViewChange?.('today')}>
                <Calendar size={14} />
                <span>Today</span>
              </button>
              <button type="button" className="ixos-nav-link" data-active={view === 'workstreams'} onClick={() => onViewChange?.('workstreams')}>
                <Layers size={14} />
                <span>Workstreams</span>
              </button>
            </nav>

            {/* Workspace Sections */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(243,245,247,0.3)', marginBottom: 10, padding: '0 10px' }}>
                  Recent
                </h3>
                <div style={{ display: 'grid', gap: 1 }}>
                  {workstreams.rows.slice(0, 4).map(row => (
                    <button
                      key={row.id}
                      type="button"
                      className="ixos-nav-link-sub"
                      data-active={workstreams.selectedId === row.id}
                      onClick={() => {
                        onViewChange?.('workstreams');
                        workstreams.onSelectRow?.(row.id);
                      }}
                    >
                      <span style={{ opacity: 0.4 }}>#</span>
                      <span style={{ truncate: true }}>{row.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(243,245,247,0.3)', marginBottom: 10, padding: '0 10px' }}>
                  Starred
                </h3>
                <div style={{ padding: '0 10px', fontSize: 11, color: 'rgba(243,245,247,0.2)' }}>
                  No starred items
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                type="button"
                className="ixos-nav-link"
                style={{ justifyContent: 'space-between', padding: '8px 10px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #2DD4BF, #7C5CFF)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>
                    P
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Pablo</span>
                </div>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DD4BF' }} />
              </button>
            </div>
          </aside>
        )}

        {showPanel && (
        <div className="ixos-world-panel">
          {view === 'search' && (
            <SearchSurface
              query={search.query}
              directoryLabel={search.directoryLabel}
              onQueryChange={search.onQueryChange}
              onSubmit={search.onSubmit}
              mode={search.mode}
              onModeChange={search.onModeChange}
              stageLabel={search.stageLabel}
              isSearching={search.isSearching}
              results={search.results}
              selectedIndex={search.selectedIndex}
              onSelectResult={search.onSelectResult}
              onOpenResult={search.onOpenResult}
              onRevealResult={search.onRevealResult}
              allowResultsScroll={search.allowResultsScroll}
              showInlineRunButton={search.showInlineRunButton}
              hideSearchChrome={search.hideSearchChrome}
              resultLimit={search.resultLimit}
              pipelineStats={search.pipelineStats}
              sourcePath={search.sourcePath}
              interactive={search.interactive ?? interactive}
              presets={search.presets}
              onPresetSelect={search.onPresetSelect}
            />
          )}

          {view === 'today' && (
            <TodaySurface
              dateLabel={today.dateLabel}
              signals={today.signals}
              resumeRows={today.resumeRows}
              recentRows={today.recentRows}
              suggestedRows={today.suggestedRows}
              sourcePath={today.sourcePath}
            />
          )}

          {view === 'workstreams' && (
            <WorkstreamsSurface
              rows={workstreams.rows}
              selectedId={workstreams.selectedId}
              onSelectRow={workstreams.onSelectRow}
              summary={workstreams.summary}
              sourcePath={workstreams.sourcePath}
            />
          )}
        </div>
        )}
      </div>
    </section>
  );
}
