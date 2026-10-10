"use client";

import { useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

// ─── Feature data ─────────────────────────────────────────────────────────────

type CellValue = 'yes' | 'no' | 'partial' | 'pro'

interface Feature {
  feature: string
  ixos: CellValue
  grep: CellValue
  spotlight: CellValue
  vscode: CellValue
  note: string
}

const FEATURES: Feature[] = [
  {
    feature: 'Full-text keyword search',
    ixos: 'yes', grep: 'yes', spotlight: 'yes', vscode: 'yes',
    note: 'Industry baseline — all tools handle this.',
  },
  {
    feature: 'Semantic understanding',
    ixos: 'yes', grep: 'no', spotlight: 'partial', vscode: 'no',
    note: 'Meaning-based matching, not just string proximity.',
  },
  {
    feature: 'Local-first / no egress',
    ixos: 'yes', grep: 'yes', spotlight: 'partial', vscode: 'partial',
    note: 'Spotlight may sync via iCloud; VS Code extensions vary.',
  },
  {
    feature: 'Progressive results',
    ixos: 'yes', grep: 'no', spotlight: 'no', vscode: 'no',
    note: 'Results stream as confidence increases.',
  },
  {
    feature: 'No background daemon',
    ixos: 'yes', grep: 'yes', spotlight: 'no', vscode: 'partial',
    note: 'Spotlight indexes continuously. VS Code workspace indexing varies.',
  },
  {
    feature: 'Hybrid retrieval',
    ixos: 'yes', grep: 'no', spotlight: 'no', vscode: 'no',
    note: 'Lexical + semantic in a single pass.',
  },
  {
    feature: 'Cryptographic cache signing',
    ixos: 'yes', grep: 'no', spotlight: 'no', vscode: 'no',
    note: 'HMAC-SHA256 on every cached embedding. Source: storage/validator.rs',
  },
  {
    feature: 'Cross-platform',
    ixos: 'yes', grep: 'yes', spotlight: 'no', vscode: 'yes',
    note: 'Windows, macOS, Linux. Spotlight is macOS-only.',
  },
  {
    feature: 'Natural language queries',
    ixos: 'pro', grep: 'no', spotlight: 'no', vscode: 'no',
    note: 'Pro tier. Planned feature.',
  },
]

const TOOLS = ['Ixos', 'grep/rg', 'Spotlight', 'VS Code']

// ─── Symbol cell ──────────────────────────────────────────────────────────────

function Symbol({
  value,
  isIxos,
}: {
  value: CellValue
  isIxos: boolean
}) {
  if (value === 'yes') {
    return (
      <span
        aria-label="Supported"
        style={{
          fontSize: 14,
          color: isIxos ? '#2DD4BF' : 'rgba(255,255,255,0.45)',
          fontWeight: isIxos ? 700 : 400,
        }}
      >
        ■
      </span>
    )
  }
  if (value === 'no') {
    return (
      <span
        aria-label="Not supported"
        style={{ fontSize: 14, color: 'rgba(255,255,255,0.18)' }}
      >
        —
      </span>
    )
  }
  if (value === 'partial') {
    return (
      <span
        aria-label="Partial support"
        style={{ fontSize: 14, color: 'rgba(245,158,11,0.6)' }}
        title="Partial support — see note"
      >
        ◐
      </span>
    )
  }
  // pro
  return (
    <span
      aria-label="Pro tier"
      title="Pro tier feature"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 12,
        color: '#7C3AED',
        fontFamily: 'var(--font-ixo-mono, monospace)',
        letterSpacing: '0.05em',
      }}
    >
      <span style={{ fontSize: 13 }}>◆</span>
      <span style={{ fontSize: 8, opacity: 0.8 }}>PRO</span>
    </span>
  )
}

// ─── Feature row ──────────────────────────────────────────────────────────────

function FeatureRow({
  feature,
  index,
  inView,
}: {
  feature: Feature
  index: number
  inView: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const cells: { key: keyof Omit<Feature, 'feature' | 'note'>; label: string }[] = [
    { key: 'ixos', label: 'Ixos' },
    { key: 'grep', label: 'grep/rg' },
    { key: 'spotlight', label: 'Spotlight' },
    { key: 'vscode', label: 'VS Code' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{
        delay: 0.15 + index * 0.07,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      role="row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
      aria-label={`${feature.feature}: Ixos ${feature.ixos}, grep ${feature.grep}, Spotlight ${feature.spotlight}, VS Code ${feature.vscode}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') setHovered((v) => !v)
      }}
      style={{
        borderRadius: 6,
        transition: 'background 0.2s',
        background: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        cursor: 'default',
        outline: 'none',
      }}
    >
      {/* Main row */}
      <div
        role="rowgroup"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
          alignItems: 'center',
          padding: '11px 12px',
          borderRadius: 6,
          gap: 8,
        }}
      >
        {/* Feature name */}
        <div
          className="font-mono"
          style={{ fontSize: 12, color: 'rgba(243,245,247,0.7)', letterSpacing: '0.01em' }}
        >
          {feature.feature}
        </div>

        {/* Tool cells */}
        {cells.map(({ key }) => (
          <div
            key={key}
            style={{
              textAlign: 'center',
              background: key === 'ixos' ? 'rgba(45,212,191,0.04)' : 'transparent',
              borderRadius: 4,
              padding: '2px 4px',
            }}
          >
            <Symbol value={feature[key]} isIxos={key === 'ixos'} />
          </div>
        ))}
      </div>

      {/* Hover note */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.35)',
                padding: '0 12px 10px',
                lineHeight: 1.5,
                borderLeft: '2px solid rgba(45,212,191,0.25)',
                marginLeft: 12,
                marginRight: 12,
                marginBottom: 4,
              }}
            >
              {feature.note}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function V4Comparison() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (lowEnd) return
    pulse(e.clientX, e.clientY, 0.3)
  }

  return (
    <div
      data-section="comparison"
      id="comparison"
      ref={sectionRef}
      onMouseEnter={handleMouseEnter}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: 'transparent', padding: '112px 0 144px' }}
      >
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          {/* Header */}
          <div style={{ marginBottom: 56 }}>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.6)', marginBottom: 12 }}
            >
              Feature comparison
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: 'var(--font-ixo-heading)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                color: '#F3F5F7',
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                marginBottom: 14,
              }}
            >
              Desktop search capabilities, plainly shown.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono"
              style={{ fontSize: 14, color: 'rgba(243,245,247,0.4)', maxWidth: 480 }}
            >
              Capability matrix grounded in shipped desktop behavior and CLI flags.
            </motion.p>
          </div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              // 3D glassmorphic card for the table
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 60%, rgba(0,0,0,0.1) 100%)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: '1px solid rgba(255,255,255,0.14)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '-8px -8px 24px rgba(0,0,0,0.7), 4px 4px 16px rgba(45,212,191,0.05)',
            }}
            role="table"
            aria-label="Feature comparison table"
          >
            {/* Header row */}
            <div
              role="rowheader"
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                padding: '12px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                gap: 8,
              }}
            >
              <div
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)' }}
              >
                Capability
              </div>
              {TOOLS.map((tool, i) => (
                <div
                  key={tool}
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    textAlign: 'center',
                    color: i === 0 ? 'rgba(45,212,191,0.8)' : 'rgba(255,255,255,0.35)',
                    letterSpacing: '0.05em',
                    fontWeight: i === 0 ? 600 : 400,
                    background: i === 0 ? 'rgba(45,212,191,0.06)' : 'transparent',
                    borderRadius: 4,
                    padding: '2px 4px',
                  }}
                >
                  {tool}
                </div>
              ))}
            </div>

            {/* Feature rows */}
            <div style={{ padding: '8px 0' }} role="rowgroup">
              {FEATURES.map((feature, i) => (
                <FeatureRow
                  key={feature.feature}
                  feature={feature}
                  index={i}
                  inView={inView}
                />
              ))}
            </div>
          </motion.div>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.85, duration: 0.5 }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 20,
              marginTop: 20,
              alignItems: 'center',
            }}
          >
            {[
              { symbol: '■', label: 'Supported', color: 'rgba(45,212,191,0.7)' },
              { symbol: '◐', label: 'Partial', color: 'rgba(245,158,11,0.6)' },
              { symbol: '—', label: 'Not supported', color: 'rgba(255,255,255,0.25)' },
              { symbol: '◆', label: 'Pro tier', color: '#7C3AED' },
            ].map((item) => (
              <div
                key={item.label}
                className="font-mono"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}
              >
                <span style={{ color: item.color, fontSize: 12 }}>{item.symbol}</span>
                {item.label}
              </div>
            ))}

            <div
              className="font-mono"
              style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.05em' }}
            >
              Competitor info from public documentation. Accurate as of 2026.
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
