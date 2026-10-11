"use client";

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

// ─── Cell 1: Storage diagram ──────────────────────────────────────────────────

const STORAGE_BACKENDS = [
  {
    platform: 'Windows NTFS',
    type: 'NTFS ADS',
    source: 'storage/ads_windows.rs',
    color: '#2DD4BF',
    icon: '▪',
  },
  {
    platform: 'Linux / macOS',
    type: 'xattr',
    source: 'storage/xattr_unix.rs',
    color: 'rgba(243,245,247,0.55)',
    icon: '▪',
  },
  {
    platform: 'FAT32 / Cloud',
    type: 'NullCache',
    source: 'storage/null.rs',
    color: 'rgba(243,245,247,0.35)',
    icon: '▪',
  },
]

function StorageDiagram({ inView }: { inView: boolean }) {
  return (
    <div style={{ marginTop: 20 }}>
      {STORAGE_BACKENDS.map((b, i) => (
        <motion.div
          key={b.platform}
          initial={{ opacity: 0, x: -12 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.3 + i * 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 6,
            marginBottom: 6,
            background: i === 0 ? 'rgba(45,212,191,0.05)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${i === 0 ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.05)'}`,
          }}
        >
          <span style={{ color: b.color, fontSize: 10 }}>{b.icon}</span>
          <div style={{ flex: 1 }}>
            <div
              className="font-mono"
              style={{ fontSize: 10, color: b.color, letterSpacing: '0.04em' }}
            >
              {b.type}
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}
            >
              {b.platform}
            </div>
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', textAlign: 'right' }}
          >
            {b.source}
          </div>
        </motion.div>
      ))}

      {/* Cache format badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.75, duration: 0.4 }}
        className="font-mono"
        style={{
          marginTop: 12,
          padding: '8px 10px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.05)',
          fontSize: 8,
          color: 'rgba(255,255,255,0.3)',
          lineHeight: 1.5,
          letterSpacing: '0.03em',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.45)' }}>643–2,375 bytes per CLI record</span>
        {' · '}[IXD1 | recipe | source | locators | vectors | signature]
      </motion.div>
    </div>
  )
}

// ─── Cell 2: Security flow diagram ───────────────────────────────────────────

const SECURITY_STEPS = [
  { num: '01', label: 'Embed', detail: 'f16 vector', lib: 'ring' },
  { num: '02', label: 'Sign', detail: 'HMAC-SHA256', lib: 'ring' },
  { num: '03', label: 'Attest', detail: 'Ed25519', lib: 'ed25519-dalek' },
  { num: '04', label: 'Verify', detail: 'on read', lib: 'zeroize' },
]

const LIB_PILLS = ['ring', 'ed25519-dalek', 'zeroize']

function SecurityDiagram({ inView }: { inView: boolean }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {SECURITY_STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', alignItems: 'stretch' }}
          >
            {/* Connector line */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginRight: 12,
                width: 20,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="font-mono"
                  style={{ fontSize: 7, color: '#7C3AED', letterSpacing: 0 }}
                >
                  {step.num}
                </span>
              </div>
              {i < SECURITY_STEPS.length - 1 && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    minHeight: 12,
                    background: 'rgba(124,58,237,0.2)',
                    margin: '2px 0',
                  }}
                />
              )}
            </div>

            {/* Step content */}
            <div style={{ flex: 1, paddingBottom: i < SECURITY_STEPS.length - 1 ? 8 : 0, paddingTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  className="font-mono"
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}
                >
                  {step.label}
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}
                >
                  {step.detail}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Library pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.75, duration: 0.4 }}
        style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}
      >
        {LIB_PILLS.map((lib) => (
          <span
            key={lib}
            className="font-mono"
            style={{
              fontSize: 9,
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.2)',
              color: 'rgba(124,58,237,0.8)',
              letterSpacing: '0.05em',
            }}
          >
            {lib}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Cell 3: Performance CPU lanes ───────────────────────────────────────────

const FILE_NAMES = ['auth.ts', 'db.ts', 'api.ts', 'session.ts', 'tokens.ts', 'routes.ts']
const LANES = 6

function PerformanceDiagram({ inView, lowEnd }: { inView: boolean; lowEnd: boolean }) {
  return (
    <div style={{ marginTop: 20 }}>
      {/* CPU lanes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {Array.from({ length: LANES }, (_, laneIdx) => {
          const fileIdx = laneIdx % FILE_NAMES.length
          const fileName = FILE_NAMES[fileIdx]
          const animDelay = 0.3 + laneIdx * 0.09

          return (
            <div
              key={laneIdx}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {/* Lane label */}
              <span
                className="font-mono"
                style={{
                  fontSize: 8,
                  color: 'rgba(255,255,255,0.2)',
                  minWidth: 36,
                  letterSpacing: '0.05em',
                }}
              >
                T{laneIdx + 1}
              </span>

              {/* Lane bar */}
              <div
                style={{
                  flex: 1,
                  height: 16,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.04)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={inView ? {
                    width: ['0%', '100%', '100%', '0%'],
                    opacity: [0, 1, 1, 0],
                  } : { width: 0, opacity: 0 }}
                  transition={lowEnd ? { duration: 0 } : {
                    delay: animDelay,
                    duration: 1.4,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 0.6 + laneIdx * 0.18,
                  }}
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    background: 'linear-gradient(90deg, rgba(245,158,11,0.3), rgba(245,158,11,0.7))',
                    boxShadow: '0 0 8px rgba(245,158,11,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                  }}
                >
                  <span
                    className="font-mono"
                    style={{ fontSize: 8, color: 'rgba(245,158,11,0.9)', whiteSpace: 'nowrap' }}
                  >
                    {fileName}
                  </span>
                </motion.div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Metric */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.9, duration: 0.4 }}
        style={{
          marginTop: 14,
          padding: '8px 10px',
          borderRadius: 6,
          background: 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 18, color: '#F59E0B', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          ~7ms
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}
        >
          · 1,000 files<br />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)' }}>Source: CLAUDE.md</span>
        </span>
      </motion.div>
    </div>
  )
}

// ─── Bento cell ───────────────────────────────────────────────────────────────

interface BentoCellProps {
  tag: string
  headline: string
  description: string
  accentColor: string
  children: React.ReactNode
  delay: number
  inView: boolean
  sourceNote?: string
}

function BentoCell({
  tag,
  headline,
  description,
  accentColor,
  children,
  delay,
  inView,
  sourceNote,
}: BentoCellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{
        y: -3,
        boxShadow: `-5px -5px 18px rgba(0,0,0,0.55), 6px 6px 20px ${accentColor}12`,
      }}
      style={{
        // 3D glassmorphic card
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.1) 100%)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(255,255,255,0.08)',
        borderTopColor: 'rgba(255,255,255,0.14)',
        borderLeftColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `-8px -8px 24px rgba(0,0,0,0.7), 4px 4px 16px ${accentColor}06`,
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
      }}
    >
      {/* Tag */}
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 9,
          letterSpacing: '0.25em',
          color: accentColor,
          opacity: 0.75,
          marginBottom: 10,
        }}
      >
        {tag}
      </span>

      {/* Headline */}
      <h3
        style={{
          fontFamily: 'var(--font-ixo-heading)',
          fontSize: 'clamp(1.2rem, 2vw, 1.5rem)',
          fontWeight: 700,
          color: '#F3F5F7',
          letterSpacing: '-0.02em',
          marginBottom: 10,
          lineHeight: 1.2,
        }}
      >
        {headline}
      </h3>

      {/* Description */}
      <p
        className="font-mono"
        style={{ fontSize: 12, color: 'rgba(243,245,247,0.45)', lineHeight: 1.65, marginBottom: 0 }}
      >
        {description}
      </p>

      {/* Diagram */}
      <div style={{ flex: 1 }}>{children}</div>

      {/* Source note */}
      {sourceNote && (
        <p
          className="font-mono"
          style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', marginTop: 12 }}
        >
          {sourceNote}
        </p>
      )}
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function V4TechBento() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (lowEnd) return
    pulse(e.clientX, e.clientY, 0.35)
  }

  return (
    <div
      data-section="techbento"
      id="techbento"
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
              Architecture
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
              Engineered for the filesystem.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono"
              style={{ fontSize: 14, color: 'rgba(243,245,247,0.4)', maxWidth: 520 }}
            >
              Native platform integration, cryptographic integrity, parallel execution.
            </motion.p>
          </div>

          {/* Bento grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
            }}
            className="grid-cols-1 md:grid-cols-3"
          >
            <BentoCell
              tag="Storage"
              headline="Cache anywhere."
              description="Platform-aware embedding cache. Selects the best backend automatically."
              accentColor="#2DD4BF"
              delay={0}
              inView={inView}
              sourceNote="Source: storage/ module (ads_windows.rs, xattr_unix.rs, null.rs)"
            >
              <StorageDiagram inView={inView} />
            </BentoCell>

            <BentoCell
              tag="Security"
              headline="Signed embeddings."
              description="Every cached embedding carries an HMAC-SHA256 signature. Tampered entries are rejected at read time."
              accentColor="#7C3AED"
              delay={0.12}
              inView={inView}
              sourceNote="Source: storage/validator.rs · attestation/mod.rs"
            >
              <SecurityDiagram inView={inView} />
            </BentoCell>

            <BentoCell
              tag="Performance"
              headline="Every core. Every search."
              description="Rayon threadpool distributes file loading and lexical scoring across all available CPU cores."
              accentColor="#F59E0B"
              delay={0.24}
              inView={inView}
            >
              <PerformanceDiagram inView={inView} lowEnd={lowEnd} />
            </BentoCell>
          </div>
        </div>
      </section>
    </div>
  )
}
