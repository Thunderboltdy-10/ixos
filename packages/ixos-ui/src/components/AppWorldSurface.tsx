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
  className,
  style,
}: AppWorldSurfaceProps) {
  return (
    <section className={`ixos-world ${className ?? ''}`} style={style}>
      <div className="ixos-world-grid">
        <aside className="ixos-world-rail">
          <div style={{ display: 'grid', gap: 4, marginBottom: 18 }}>
            <strong style={{ color: '#f3f5f7', letterSpacing: '-0.02em' }}>{title}</strong>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(243,245,247,0.55)' }}>{subtitle}</p>
          </div>

          <nav style={{ display: 'grid', gap: 6 }}>
            <button type="button" className="ixos-nav-btn" data-active={view === 'search'} onClick={() => onViewChange?.('search')}>
              <Search size={14} />
              Search
            </button>
            <button type="button" className="ixos-nav-btn" data-active={view === 'today'} onClick={() => onViewChange?.('today')}>
              <Calendar size={14} />
              Today
            </button>
            <button type="button" className="ixos-nav-btn" data-active={view === 'workstreams'} onClick={() => onViewChange?.('workstreams')}>
              <Layers size={14} />
              Workstreams
            </button>
          </nav>

          <div style={{ marginTop: 18, display: 'grid', gap: 7 }}>
            <span className="ixos-chip">No Cloud Index</span>
            <span className="ixos-chip">Progressive Stream</span>
            <span className="ixos-chip">Context Ready</span>
          </div>
        </aside>

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
      </div>
    </section>
  );
}
