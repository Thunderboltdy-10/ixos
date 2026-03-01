import { motion } from 'framer-motion';
import { Clock, Activity, Target } from 'lucide-react';
import type { IxosTodayRow, IxosTodaySignal } from '../types';

interface TodaySurfaceProps {
  dateLabel: string;
  signals: IxosTodaySignal[];
  resumeRows: IxosTodayRow[];
  recentRows: IxosTodayRow[];
  suggestedRows: IxosTodayRow[];
  sourcePath?: string;
}

function RowBlock({
  title,
  rows,
  emptyCopy,
  accentColor = '#f3f5f7',
  icon: Icon,
  showResumeAction = false,
}: {
  title: string;
  rows: IxosTodayRow[];
  emptyCopy: string;
  accentColor?: string;
  icon?: any;
  showResumeAction?: boolean;
}) {
  return (
    <section 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12, 
        padding: 16, 
        background: 'rgba(255,255,255,0.02)', 
        borderRadius: 12, 
        border: '1px solid rgba(255,255,255,0.05)' 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {Icon && <Icon size={16} color={accentColor} />}
        <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 14, fontWeight: 600 }}>{title}</h4>
        <span style={{ 
          marginLeft: 'auto', 
          fontSize: 11, 
          color: 'rgba(243,245,247,0.4)', 
          background: 'rgba(255,255,255,0.05)', 
          padding: '2px 8px', 
          borderRadius: 99 
        }}>
          {rows.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.length > 0 ? (
          rows.map((row, idx) => (
            <motion.article
              key={row.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.05, 0.2), ease: 'easeOut' }}
              style={{ 
                padding: '12px 14px', 
                borderLeft: `3px solid ${accentColor}80`, 
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0 8px 8px 0',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <strong style={{ color: '#f3f5f7', fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{row.title}</strong>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span style={{ color: 'rgba(243,245,247,0.4)', fontSize: 11, fontFamily: 'monospace' }}>{row.meta.split('·')[0].trim()}</span>
                  {showResumeAction && (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
                      color: accentColor, fontWeight: 600,
                    }}>
                      Resume
                    </span>
                  )}
                </div>
              </div>
              <p style={{ margin: '6px 0 0', color: 'rgba(243,245,247,0.6)', fontSize: 12, lineHeight: 1.4 }}>{row.detail}</p>
            </motion.article>
          ))
        ) : (
          <div style={{ 
            border: '1px dashed rgba(243,245,247,0.1)', 
            borderRadius: 8, 
            padding: 16, 
            color: 'rgba(243,245,247,0.4)', 
            fontSize: 12, 
            textAlign: 'center' 
          }}>
            {emptyCopy}
          </div>
        )}
      </div>
    </section>
  );
}

export function TodaySurface({
  dateLabel,
  signals,
  resumeRows,
  recentRows,
  suggestedRows,
  sourcePath,
}: TodaySurfaceProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      {/* Header Banner */}
      <motion.div
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 8, 
          padding: '24px 28px', 
          background: 'linear-gradient(135deg, rgba(246,185,76,0.1) 0%, rgba(20,184,166,0.05) 100%)',
          border: '1px solid rgba(246,185,76,0.2)',
          borderRadius: 16,
          position: 'relative',
          overflow: 'hidden'
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.9, 0.25, 1] }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(246,185,76,0.15)', borderRadius: 99, color: '#f6b94c', fontSize: 12, fontWeight: 600 }}>
            <Activity size={14} /> Active Session
          </div>
          <span style={{ color: 'rgba(243,245,247,0.5)', fontSize: 13, fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: 6 }}>{dateLabel}</span>
        </div>
        <div style={{ position: 'relative', zIndex: 2, marginTop: 8 }}>
          <h3 style={{ margin: 0, color: '#f3f5f7', fontSize: 28, letterSpacing: '-0.02em', fontWeight: 600 }}>Ready to resume.</h3>
          <p style={{ margin: '4px 0 0', color: 'rgba(243,245,247,0.7)', fontSize: 14 }}>
            Recover evidence context and keep momentum without re-searching.
          </p>
        </div>
        
        {/* Decorative background element */}
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, background: 'radial-gradient(circle, rgba(246,185,76,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
      </motion.div>

      {/* KPI Signals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {signals.map((signal, idx) => (
          <motion.article
            key={signal.label}
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
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>{signal.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: '#f3f5f7', fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{signal.value}</span>
            </div>
            <span style={{ color: 'rgba(20,184,166,0.8)', fontSize: 11, marginTop: 'auto' }}>{signal.hint}</span>
          </motion.article>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <RowBlock
            title="Active Workstreams"
            icon={Target}
            accentColor="#f6b94c"
            rows={resumeRows}
            emptyCopy="No resumable stream yet. Open files from search."
            showResumeAction={true}
          />
          <RowBlock
            title="Recently Touched"
            icon={Clock}
            accentColor="#a78bfa"
            rows={recentRows}
            emptyCopy="No file activity tracked yet for today."
          />
        </div>

        <div>
          <RowBlock
            title="Suggested Next Files"
            icon={Activity}
            accentColor="#14b8a6"
            rows={suggestedRows}
            emptyCopy="No next-file suggestions yet. Continue searching."
          />
        </div>
      </div>
      
      {sourcePath && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace', marginTop: 20 }}>
          {sourcePath}
        </div>
      )}
    </div>
  );
}