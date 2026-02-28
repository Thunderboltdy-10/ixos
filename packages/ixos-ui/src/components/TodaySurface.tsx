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
    <section className="ixos-card" style={{ display: 'grid', gap: 4, padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        {Icon && <Icon size={13} color={accentColor} />}
        <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h4>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(243,245,247,0.35)', fontVariantNumeric: 'tabular-nums' }}>
          {rows.length} item{rows.length !== 1 ? 's' : ''}
        </span>
      </div>
      {rows.length > 0 ? (
        rows.map((row, idx) => (
          <motion.article
            key={row.id}
            className="ixos-result-row"
            data-selected="false"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: Math.min(idx * 0.05, 0.2), ease: 'easeOut' }}
            style={{ padding: '7px 9px', borderLeft: `2px solid ${accentColor}40`, background: 'rgba(255,255,255,0.02)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <strong style={{ color: '#f3f5f7', fontSize: 11, fontWeight: 500 }}>{row.title}</strong>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                <span style={{ color: 'rgba(243,245,247,0.35)', fontSize: 9, fontFamily: 'monospace' }}>{row.meta}</span>
                {showResumeAction && (
                  <span style={{
                    fontSize: 8, padding: '1px 5px', borderRadius: 3,
                    background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
                    color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
                  }}>
                    Resume
                  </span>
                )}
              </div>
            </div>
            <p style={{ margin: '3px 0 0', color: 'rgba(243,245,247,0.55)', fontSize: 10, lineHeight: 1.4 }}>{row.detail}</p>
          </motion.article>
        ))
      ) : (
        <div style={{ border: '1px dashed rgba(243,245,247,0.08)', borderRadius: 6, padding: 8, color: 'rgba(243,245,247,0.35)', fontSize: 10, textAlign: 'center' }}>
          {emptyCopy}
        </div>
      )}
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
    <div className="ixos-today-surface" style={{ display: 'grid', gap: 10, padding: 14 }}>
      <motion.div
        className="ixos-card"
        style={{ display: 'grid', gap: 4, padding: '12px 14px', borderLeft: '3px solid #f6b94c' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.9, 0.25, 1] }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="ixos-chip" style={{ width: 'fit-content', borderColor: 'rgba(246,185,76,0.3)', color: '#f6b94c', background: 'rgba(246,185,76,0.1)' }}>
            <Activity size={11} /> Active Session
          </p>
          <span style={{ color: 'rgba(243,245,247,0.4)', fontSize: 11, fontFamily: 'monospace' }}>{dateLabel}</span>
        </div>
        <h3 style={{ margin: '4px 0 0', color: '#f3f5f7', fontSize: 20, letterSpacing: '-0.02em', fontWeight: 600 }}>Ready to resume.</h3>
        <p style={{ margin: 0, color: 'rgba(243,245,247,0.55)', fontSize: 11 }}>
          Recover evidence context and keep momentum without re-searching.
        </p>
      </motion.div>

      <div className="ixos-today-signals" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
        {signals.map((signal, idx) => (
          <motion.article
            key={signal.label}
            className="ixos-kpi"
            style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
          >
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.45)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{signal.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
              <span style={{ color: '#f3f5f7', fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{signal.value}</span>
              <span style={{ color: 'rgba(20,184,166,0.7)', fontSize: 9 }}>{signal.hint}</span>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="ixos-today-main" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <RowBlock
            title="Resume"
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

        <div style={{ alignContent: 'start' }}>
          <RowBlock
            title="Suggested Next"
            icon={Activity}
            accentColor="#14b8a6"
            rows={suggestedRows}
            emptyCopy="No next-file suggestions yet. Continue searching."
          />
        </div>
      </div>
    </div>
  );
}
