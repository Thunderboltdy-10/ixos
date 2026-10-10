"use client";

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

// ─── Guarantees data ──────────────────────────────────────────────────────────

const GUARANTEES = [
  {
    label: 'No files uploaded',
    color: '#2DD4BF',
    source: 'CLAUDE.md · Architecture',
  },
  {
    label: 'No query logging',
    color: '#2DD4BF',
    source: 'CLAUDE.md · Telemetry: None',
  },
  {
    label: 'Embeddings stored locally',
    color: '#2DD4BF',
    source: 'storage/ — NTFS ADS, xattr, NullCache',
  },
  {
    label: 'Opt-in timing protection',
    color: '#2DD4BF',
    source: '--secure-timing · ixos_embed/secure_embedder.rs',
  },
]

// ─── Architecture diagram ─────────────────────────────────────────────────────

function ArchDiagram({ inView, lowEnd }: { inView: boolean; lowEnd: boolean }) {
  // SVG dimensions
  const W = 540
  const H = 260

  // Device boundary box
  const devX = 30
  const devY = 20
  const devW = 320
  const devH = 220

  // Cloud box (crossed out)
  const cloudX = 400
  const cloudY = 60
  const cloudW = 110
  const cloudH = 80

  // Ixos process box (inside device)
  const ixosX = devX + 160
  const ixosY = devY + 80
  const ixosW = 120
  const ixosH = 52

  // Files list (inside device)
  const filesX = devX + 18
  const filesY = devY + 50

  const fileNames = ['files/', 'embeddings/', 'results/']

  // Stroke dash for draw-on animation
  const devicePerimeter = 2 * (devW + devH)
  const arrowBlockedPath = `M ${devX + devW + 20} ${devY + devH / 2} L ${cloudX} ${cloudY + cloudH / 2}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, display: 'block', margin: '0 auto' }}
      aria-label="Architecture diagram: all computation stays on device, cloud is blocked"
      role="img"
    >
      {/* Device boundary — draws in */}
      <motion.rect
        x={devX}
        y={devY}
        width={devW}
        height={devH}
        rx={12}
        fill="rgba(45,212,191,0.04)"
        stroke="#2DD4BF"
        strokeWidth={1.5}
        strokeOpacity={0.35}
        strokeDasharray={devicePerimeter}
        initial={{ strokeDashoffset: devicePerimeter }}
        animate={inView ? { strokeDashoffset: 0 } : {}}
        transition={lowEnd ? { duration: 0 } : { duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
      />

      {/* "Device" label */}
      <motion.text
        x={devX + 12}
        y={devY + 16}
        fontSize={9}
        fill="rgba(45,212,191,0.5)"
        fontFamily="var(--font-ixo-mono, monospace)"
        letterSpacing="0.15em"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        DEVICE
      </motion.text>

      {/* Files list */}
      {fileNames.map((name, i) => (
        <motion.g
          key={name}
          initial={{ opacity: 0, x: -8 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.6 + i * 0.12, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <text
            x={filesX + 14}
            y={filesY + i * 26}
            fontSize={10}
            fill="rgba(243,245,247,0.55)"
            fontFamily="var(--font-ixo-mono, monospace)"
          >
            {i === 0 ? '├── ' : i === fileNames.length - 1 ? '└── ' : '├── '}{name}
          </text>
        </motion.g>
      ))}

      {/* Ixos process box */}
      <motion.rect
        x={ixosX}
        y={ixosY}
        width={ixosW}
        height={ixosH}
        rx={8}
        fill="rgba(45,212,191,0.07)"
        stroke="rgba(45,212,191,0.3)"
        strokeWidth={1}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        style={{ transformOrigin: `${ixosX + ixosW / 2}px ${ixosY + ixosH / 2}px` }}
        transition={{ delay: 0.9, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.text
        x={ixosX + ixosW / 2}
        y={ixosY + 20}
        textAnchor="middle"
        fontSize={11}
        fill="#2DD4BF"
        fontFamily="var(--font-ixo-mono, monospace)"
        fontWeight={600}
        letterSpacing="0.05em"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.0, duration: 0.35 }}
      >
        Ixos
      </motion.text>
      <motion.text
        x={ixosX + ixosW / 2}
        y={ixosY + 34}
        textAnchor="middle"
        fontSize={8}
        fill="rgba(255,255,255,0.3)"
        fontFamily="var(--font-ixo-mono, monospace)"
        letterSpacing="0.08em"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.05, duration: 0.35 }}
      >
        searches locally
      </motion.text>

      {/* Internal arrows (files to Ixos) */}
      <motion.path
        d={`M ${filesX + 90} ${filesY + 22} C ${ixosX - 20} ${filesY + 22} ${ixosX - 20} ${ixosY + ixosH / 2} ${ixosX} ${ixosY + ixosH / 2}`}
        fill="none"
        stroke="rgba(45,212,191,0.25)"
        strokeWidth={1}
        strokeDasharray="3 3"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={inView ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ delay: 1.1, duration: 0.6 }}
      />

      {/* "zero bytes transmitted" label inside device */}
      <motion.text
        x={devX + devW / 2}
        y={devY + devH - 18}
        textAnchor="middle"
        fontSize={8}
        fill="rgba(45,212,191,0.45)"
        fontFamily="var(--font-ixo-mono, monospace)"
        letterSpacing="0.12em"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.25, duration: 0.4 }}
      >
        zero bytes transmitted
      </motion.text>

      {/* Cloud box */}
      <motion.rect
        x={cloudX}
        y={cloudY}
        width={cloudW}
        height={cloudH}
        rx={10}
        fill="rgba(255,255,255,0.015)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={1}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.3, duration: 0.35 }}
      />
      <motion.text
        x={cloudX + cloudW / 2}
        y={cloudY + cloudH / 2 - 4}
        textAnchor="middle"
        fontSize={9}
        fill="rgba(255,255,255,0.2)"
        fontFamily="var(--font-ixo-mono, monospace)"
        letterSpacing="0.1em"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.35, duration: 0.35 }}
      >
        Cloud
      </motion.text>
      <motion.text
        x={cloudX + cloudW / 2}
        y={cloudY + cloudH / 2 + 10}
        textAnchor="middle"
        fontSize={8}
        fill="rgba(255,255,255,0.15)"
        fontFamily="var(--font-ixo-mono, monospace)"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.35, duration: 0.35 }}
      >
        (not connected)
      </motion.text>

      {/* Blocked arrow path */}
      <motion.path
        d={arrowBlockedPath}
        fill="none"
        stroke="rgba(239,68,68,0.3)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={inView ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ delay: 1.4, duration: 0.5 }}
      />

      {/* Block circle on arrow */}
      <motion.circle
        cx={(devX + devW + 20 + cloudX) / 2}
        cy={(devY + devH / 2 + cloudY + cloudH / 2) / 2}
        r={12}
        fill="rgba(239,68,68,0.12)"
        stroke="rgba(239,68,68,0.5)"
        strokeWidth={1.5}
        initial={{ opacity: 0, scale: 0 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        style={{ transformOrigin: `${(devX + devW + 20 + cloudX) / 2}px ${(devY + devH / 2 + cloudY + cloudH / 2) / 2}px` }}
        transition={lowEnd ? { duration: 0 } : { delay: 1.6, duration: 0.3, type: 'spring', bounce: 0.5 }}
      />
      {/* X mark */}
      <motion.text
        x={(devX + devW + 20 + cloudX) / 2}
        y={(devY + devH / 2 + cloudY + cloudH / 2) / 2 + 5}
        textAnchor="middle"
        fontSize={14}
        fill="rgba(239,68,68,0.8)"
        fontFamily="var(--font-ixo-mono, monospace)"
        fontWeight={700}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.65, duration: 0.25 }}
      >
        ✕
      </motion.text>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function V4LocalFirst() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (lowEnd) return
    pulse(e.clientX, e.clientY, 0.4)
  }

  return (
    <div
      data-section="local"
      id="local"
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
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.6)', marginBottom: 12 }}
            >
              Privacy architecture
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
              Your data. Your device. Full stop.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono"
              style={{
                fontSize: 14,
                color: 'rgba(243,245,247,0.4)',
                maxWidth: 520,
                margin: '0 auto',
                lineHeight: 1.65,
              }}
            >
              Ixos performs all computation locally. No network calls, no telemetry, no opt-in required.
            </motion.p>
          </div>

          {/* Diagram */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: '32px 24px',
              marginBottom: 48,
            }}
          >
            <ArchDiagram inView={inView} lowEnd={lowEnd} />
          </motion.div>

          {/* Guarantees grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              maxWidth: 640,
              margin: '0 auto',
            }}
            className="md:grid-cols-2"
          >
            {GUARANTEES.map((g, i) => (
              <motion.div
                key={g.label}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  background: 'rgba(45,212,191,0.03)',
                  border: '1px solid rgba(45,212,191,0.1)',
                  borderRadius: 8,
                }}
              >
                <span style={{ color: '#2DD4BF', fontSize: 14, marginTop: 1, flexShrink: 0 }}>■</span>
                <div>
                  <div
                    className="font-mono"
                    style={{ fontSize: 11, color: 'rgba(243,245,247,0.75)', fontWeight: 600, marginBottom: 3 }}
                  >
                    {g.label}
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.03em' }}
                  >
                    {g.source}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
