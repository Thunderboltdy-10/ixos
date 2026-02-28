import { motion } from 'framer-motion';
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
}: {
  title: string;
  rows: IxosTodayRow[];
  emptyCopy: string;
}) {
  return (
    <section className="ixos-card" style={{ display: 'grid', gap: 8 }}>
      <h4 style={{ margin: 0, color: '#f3f5f7', fontSize: 13 }}>{title}</h4>
      {rows.length > 0 ? (
        rows.map((row, idx) => (
          <motion.article
            key={row.id}
            className="ixos-result-row"
            data-selected="false"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(idx * 0.03, 0.12), ease: [0.2, 0.9, 0.25, 1] }}
          >
            <strong style={{ color: '#f3f5f7', fontSize: 13 }}>{row.title}</strong>
            <p style={{ margin: '4px 0 0', color: 'rgba(243,245,247,0.52)', fontSize: 11 }}>{row.meta}</p>
            <p style={{ margin: '6px 0 0', color: 'rgba(243,245,247,0.76)', fontSize: 12 }}>{row.detail}</p>
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
    <div className="ixos-today-surface">
      <motion.div
        className="ixos-card"
        style={{ display: 'grid', gap: 8 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.9, 0.25, 1] }}
      >
        <p className="ixos-chip" style={{ width: 'fit-content' }}>
          Today
        </p>
        <h3 style={{ margin: 0, color: '#f3f5f7', fontSize: 28, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{dateLabel}</h3>
        <p style={{ margin: 0, color: 'rgba(243,245,247,0.66)', fontSize: 13 }}>
          Resume your active stream, recover evidence context, and keep momentum without re-searching.
        </p>
      </motion.div>

      <div className="ixos-today-signals">
        {signals.map((signal, idx) => (
          <motion.article
            key={signal.label}
            className="ixos-kpi"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(idx * 0.04, 0.12), ease: [0.2, 0.9, 0.25, 1] }}
          >
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.13em' }}>{signal.label}</p>
            <p style={{ margin: '6px 0 3px', color: '#f3f5f7', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{signal.value}</p>
            <p style={{ margin: 0, color: 'rgba(243,245,247,0.58)', fontSize: 11 }}>{signal.hint}</p>
          </motion.article>
        ))}
      </div>

      <div className="ixos-today-main">
        <div style={{ display: 'grid', gap: 10 }}>
          <RowBlock
            title="Resume"
            rows={resumeRows}
            emptyCopy="No resumable stream yet. Open files from search and Ixos will build continuity here."
          />
          <RowBlock
            title="Recently Touched"
            rows={recentRows}
            emptyCopy="No file activity tracked yet for today."
          />
        </div>

        <RowBlock
          title="Suggested Next"
          rows={suggestedRows}
          emptyCopy="No next-file suggestions yet. Continue searching to unlock local prediction signals."
        />
      </div>

      <p style={{ margin: 0, color: 'rgba(243,245,247,0.42)', fontSize: 10 }}>
        {sourcePath ?? 'source: ui/src/components/today/TodayTab.tsx'}
      </p>
    </div>
  );
}
