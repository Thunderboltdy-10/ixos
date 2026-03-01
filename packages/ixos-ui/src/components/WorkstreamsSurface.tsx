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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      {/* Header Banner */}
      <motion.div
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 8, 
          padding: '24px 28px', 
          background: 'linear-gradient(135deg, rgba(124,92,255,0.1) 0%, rgba(20,184,166,0.05) 100%)',
          border: '1px solid rgba(124,92,255,0.2)',
          borderRadius: 16,
          position: 'relative',
          overflow: 'hidden'
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.9, 0.25, 1] }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(124,92,255,0.2)', borderRadius: 99, color: '#c4b5fd', fontSize: 12, fontWeight: 600 }}>
            Workstreams
          </div>
          <span style={{ color: 'rgba(243,245,247,0.6)', fontSize: 13, fontWeight: 500 }}>
            {rows.length} total · {rows.filter(r => r.status === 'active').length} active
          </span>
        </div>
        <div style={{ position: 'relative', zIndex: 2, marginTop: 8 }}>
          <h3 style={{ margin: 0, color: '#f3f5f7', fontSize: 28, letterSpacing: '-0.02em', fontWeight: 600 }}>Session clusters from real activity.</h3>
          <p style={{ margin: '4px 0 0', color: 'rgba(243,245,247,0.7)', fontSize: 14 }}>
            Auto-clustered task threads with fast context recovery.
          </p>
        </div>
        
        {/* Decorative background element */}
        <div style={{ position: 'absolute', right: -50, bottom: -80, width: 250, height: 250, background: 'radial-gradient(circle, rgba(124,92,255,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
      </motion.div>

      {/* KPI Signals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {summary.map((item, idx) => (
          <motion.article
            key={item.label}
            style={{ 
              padding: '16px 20px', 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: 12, 
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transition: 'transform 0.2s, background 0.2s',
              cursor: 'default'
            }}
            whileHover={{ y: -2, background: 'rgba(255,255,255,0.05)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>{item.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: '#f3f5f7', fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{item.value}</span>
            </div>
            <span style={{ color: 'rgba(124,92,255,0.8)', fontSize: 11, marginTop: 'auto' }}>{item.hint}</span>
          </motion.article>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.length > 0 ? (
            rows.map((row, idx) => (
              <motion.article
                key={row.id}
                onClick={() => onSelectRow?.(row.id)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: Math.min(idx * 0.025, 0.14), ease: [0.2, 0.9, 0.25, 1] }}
                style={{ 
                  padding: '16px 20px', 
                  background: row.id === selected?.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 12, 
                  border: row.id === selected?.id ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (row.id !== selected?.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (row.id !== selected?.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
              >
                {row.id === selected?.id && (
                  <motion.div 
                    layoutId="activeIndicator"
                    style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: STATUS_COLOR[row.status] }} 
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ color: '#f3f5f7', fontSize: 16, fontWeight: 500 }}>{row.name}</strong>
                  <span style={{ 
                    fontSize: 10, 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    color: STATUS_COLOR[row.status],
                    padding: '2px 8px',
                    background: `${STATUS_COLOR[row.status]}15`,
                    borderRadius: 99,
                    border: `1px solid ${STATUS_COLOR[row.status]}30`
                  }}>
                    {row.status}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'rgba(243,245,247,0.6)', fontSize: 13, lineHeight: 1.4 }}>{row.detail}</p>
                <div style={{ marginTop: 12, display: 'flex', gap: 16, color: 'rgba(243,245,247,0.4)', fontSize: 12, fontFamily: 'monospace' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                    {row.files} files
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                    {row.actions} actions
                  </span>
                  <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)' }}>{row.lastActive}</span>
                </div>
              </motion.article>
            ))
          ) : (
            <div style={{ border: '1px dashed rgba(243,245,247,0.2)', borderRadius: 12, padding: 24, color: 'rgba(243,245,247,0.5)', fontSize: 14, textAlign: 'center' }}>
              No workstreams yet. Ixos creates them automatically from repeated local activity.
            </div>
          )}
        </section>

        <section style={{ 
          background: 'rgba(18, 20, 24, 0.7)', 
          border: '1px solid rgba(255,255,255,0.08)', 
          borderRadius: 16, 
          padding: 24,
          position: 'sticky',
          top: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16 }}>
            <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 16, fontWeight: 600 }}>Inspector</h4>
            {selected && (
              <span style={{ 
                color: STATUS_COLOR[selected.status], 
                background: `${STATUS_COLOR[selected.status]}15`, 
                border: `1px solid ${STATUS_COLOR[selected.status]}30`,
                padding: '4px 10px', 
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {selected.status}
              </span>
            )}
          </div>
          
          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h3 style={{ margin: 0, color: '#f3f5f7', fontSize: 20, fontWeight: 600 }}>{selected.name}</h3>
                <p style={{ margin: '8px 0 0', color: 'rgba(243,245,247,0.7)', fontSize: 14, lineHeight: 1.6 }}>{selected.detail}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: 'rgba(243,245,247,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Files</p>
                  <p style={{ margin: '4px 0 0', color: '#f3f5f7', fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{selected.files}</p>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: 'rgba(243,245,247,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</p>
                  <p style={{ margin: '4px 0 0', color: '#f3f5f7', fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{selected.actions}</p>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: 'rgba(243,245,247,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Health</p>
                  <p style={{ margin: '4px 0 0', color: STATUS_COLOR[selected.status], fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selected.status}</p>
                </div>
              </div>

              <div style={{ 
                padding: '12px 16px', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: 10, 
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 13,
                color: 'rgba(243,245,247,0.6)'
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[selected.status], boxShadow: `0 0 8px ${STATUS_COLOR[selected.status]}80` }} />
                <span>Last active: <strong style={{ color: '#f3f5f7', fontWeight: 500 }}>{selected.lastActive}</strong></span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(243,245,247,0.4)', fontSize: 14 }}>
              Select a workstream to inspect its details and metrics.
            </div>
          )}
        </section>
      </div>

      {sourcePath && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace', marginTop: 20 }}>
          {sourcePath}
        </div>
      )}
    </div>
  );
}