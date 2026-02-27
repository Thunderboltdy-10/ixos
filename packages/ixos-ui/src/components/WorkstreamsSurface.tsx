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
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="ixos-card" style={{ display: 'grid', gap: 6 }}>
        <p className="ixos-chip" style={{ width: 'fit-content' }}>
          Workstreams
        </p>
        <h3 style={{ margin: 0, color: '#f3f5f7', fontSize: 28, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          Session clusters from real activity
        </h3>
        <p style={{ margin: 0, color: 'rgba(243,245,247,0.66)', fontSize: 13 }}>
          Auto-clustered task threads from local open/search actions with fast context recovery.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        {summary.map((item, idx) => (
          <motion.article
            key={item.label}
            className="ixos-kpi"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(idx * 0.04, 0.14), ease: [0.2, 0.9, 0.25, 1] }}
          >
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.13em' }}>{item.label}</p>
            <p style={{ margin: '6px 0 3px', color: '#f3f5f7', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{item.value}</p>
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.58)', fontSize: 11 }}>{item.hint}</p>
          </motion.article>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.02fr 0.98fr', gap: 10 }}>
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

        <section className="ixos-card" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 13 }}>Inspector</h4>
          {selected ? (
            <>
              <h3 style={{ margin: 0, color: '#f3f5f7', fontSize: 19, letterSpacing: '-0.02em' }}>{selected.name}</h3>
              <p style={{ margin: 0, color: 'rgba(243,245,247,0.66)', fontSize: 12 }}>{selected.detail}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="ixos-kpi">
                  <p style={{ margin: 0, color: 'rgba(243,245,247,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Files</p>
                  <p style={{ margin: '6px 0 0', color: '#f3f5f7', fontSize: 16 }}>{selected.files}</p>
                </div>
                <div className="ixos-kpi">
                  <p style={{ margin: 0, color: 'rgba(243,245,247,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</p>
                  <p style={{ margin: '6px 0 0', color: '#f3f5f7', fontSize: 16 }}>{selected.actions}</p>
                </div>
              </div>

              <div
                style={{
                  border: '1px solid rgba(243,245,247,0.1)',
                  borderRadius: 10,
                  padding: 10,
                  background: 'rgba(255,255,255,0.02)',
                  fontSize: 12,
                  color: 'rgba(243,245,247,0.66)',
                }}
              >
                Last active {selected.lastActive}. Stream health is{' '}
                <span style={{ color: STATUS_COLOR[selected.status], textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {selected.status}
                </span>
                .
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.6)', fontSize: 12 }}>Select a workstream to inspect details.</p>
          )}
        </section>
      </div>

      <p style={{ margin: 0, color: 'rgba(243,245,247,0.42)', fontSize: 10 }}>
        {sourcePath ?? 'source: ui/src/components/workstreams/WorkstreamsList.tsx'}
      </p>
    </div>
  );
}
