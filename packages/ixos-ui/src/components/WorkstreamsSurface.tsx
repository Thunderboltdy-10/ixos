import { motion } from 'framer-motion';
import type { IxosWorkstreamRow } from '../types';

interface WorkstreamsSurfaceProps {
  rows: IxosWorkstreamRow[];
  summary: Array<{ label: string; value: string; hint: string }>;
  selectedId?: string;
  onSelectRow?: (id: string) => void;
  sourcePath?: string;
}

const STATUS_COLOR: Record<IxosWorkstreamRow['status'], string> = {
  active: '#5eead4',
  warm: '#f6b94c',
  cold: 'rgba(243,245,247,0.5)',
};

export function WorkstreamsSurface({ rows, summary, selectedId, onSelectRow, sourcePath }: WorkstreamsSurfaceProps) {
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;

  return (
    <div className="ixos-workstreams-surface">
      <div className="ixos-card" style={{ display: 'grid', gap: 4, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="ixos-chip" style={{ width: 'fit-content' }}>
            Workstreams
          </p>
          <span style={{ fontSize: 9, color: 'rgba(243,245,247,0.35)', fontVariantNumeric: 'tabular-nums' }}>
            {rows.length} total · {rows.filter(r => r.status === 'active').length} active
          </span>
        </div>
        <h3 style={{ margin: 0, color: '#f3f5f7', fontSize: 22, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Session clusters from real activity
        </h3>
        <p style={{ margin: 0, color: 'rgba(243,245,247,0.6)', fontSize: 12 }}>
          Auto-clustered task threads with fast context recovery.
        </p>
      </div>

      <div className="ixos-workstreams-summary">
        {summary.map((item, idx) => (
          <motion.article
            key={item.label}
            className="ixos-kpi"
            style={{ padding: '8px 10px' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(idx * 0.04, 0.14), ease: [0.2, 0.9, 0.25, 1] }}
          >
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{item.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
              <span style={{ color: '#f3f5f7', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{item.value}</span>
              <span style={{ color: 'rgba(243,245,247,0.5)', fontSize: 10 }}>{item.hint}</span>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="ixos-workstreams-main">
        <section className="ixos-card" style={{ display: 'grid', gap: 8 }}>
          {rows.length > 0 ? (
            rows.map((row, idx) => (
              <motion.article
                key={row.id}
                className="ixos-result-row"
                data-selected={row.id === selected?.id}
                onClick={() => onSelectRow?.(row.id)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: Math.min(idx * 0.025, 0.14), ease: [0.2, 0.9, 0.25, 1] }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <strong style={{ color: '#f3f5f7', fontSize: 13 }}>{row.name}</strong>
                  <span
                    className="ixos-chip"
                    style={{
                      color: STATUS_COLOR[row.status],
                      borderColor: 'rgba(243,245,247,0.16)',
                      padding: '3px 8px',
                    }}
                  >
                    {row.status}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', color: 'rgba(243,245,247,0.58)', fontSize: 11 }}>{row.detail}</p>
                <div style={{ marginTop: 8, display: 'flex', gap: 12, color: 'rgba(243,245,247,0.72)', fontSize: 11 }}>
                  <span>{row.files} files</span>
                  <span>{row.actions} actions</span>
                  <span>{row.lastActive}</span>
                </div>
              </motion.article>
            ))
          ) : (
            <div
              style={{
                border: '1px dashed rgba(243,245,247,0.2)',
                borderRadius: 10,
                padding: 12,
                color: 'rgba(243,245,247,0.56)',
                fontSize: 12,
              }}
            >
              No workstreams yet. Ixos creates them automatically from repeated local activity.
            </div>
          )}
        </section>

        <section className="ixos-card" style={{ display: 'grid', gap: 8, alignContent: 'start', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 12, fontWeight: 600 }}>Inspector</h4>
            {selected && (
              <span className="ixos-chip" style={{
                color: STATUS_COLOR[selected.status],
                borderColor: `${STATUS_COLOR[selected.status]}40`,
                background: `${STATUS_COLOR[selected.status]}12`,
                padding: '2px 7px',
                fontSize: 9,
              }}>
                {selected.status}
              </span>
            )}
          </div>
          {selected ? (
            <>
              <h3 style={{ margin: 0, color: '#f3f5f7', fontSize: 16, letterSpacing: '-0.02em' }}>{selected.name}</h3>
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.6)', fontSize: 11, lineHeight: 1.5 }}>{selected.detail}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div className="ixos-kpi" style={{ padding: '7px 8px' }}>
                  <p style={{ margin: 0, color: 'rgba(243,245,247,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Files</p>
                  <p style={{ margin: '3px 0 0', color: '#f3f5f7', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{selected.files}</p>
                </div>
                <div className="ixos-kpi" style={{ padding: '7px 8px' }}>
                  <p style={{ margin: 0, color: 'rgba(243,245,247,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</p>
                  <p style={{ margin: '3px 0 0', color: '#f3f5f7', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{selected.actions}</p>
                </div>
                <div className="ixos-kpi" style={{ padding: '7px 8px' }}>
                  <p style={{ margin: 0, color: 'rgba(243,245,247,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Health</p>
                  <p style={{ margin: '3px 0 0', color: STATUS_COLOR[selected.status], fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selected.status}</p>
                </div>
              </div>

              <div style={{
                border: '1px solid rgba(243,245,247,0.08)',
                borderRadius: 8,
                padding: '7px 9px',
                background: 'rgba(255,255,255,0.02)',
                fontSize: 11,
                color: 'rgba(243,245,247,0.55)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[selected.status], flexShrink: 0 }} />
                Last active {selected.lastActive}
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.5)', fontSize: 11 }}>Select a workstream to inspect.</p>
          )}
        </section>
      </div>

      <p style={{ margin: 0, color: 'rgba(243,245,247,0.42)', fontSize: 10 }}>
        {sourcePath ?? 'source: ui/src/components/workstreams/WorkstreamsList.tsx'}
      </p>
    </div>
  );
}
