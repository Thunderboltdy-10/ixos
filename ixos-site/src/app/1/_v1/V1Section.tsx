'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { DemoSurface } from '../../../landing/DemoSurface'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface V1SectionProps {
  id: string
  rank: string
  file: string
  tone: 'cyan' | 'amber' | 'violet'
  title: string
  claim: string
  demoView: 'search' | 'today' | 'workstreams'
  demoQuery: string
  demoAutoRun: boolean
  onInView?: (id: string) => void
}

// ─── Tone config ────────────────────────────────────────────────────────────────

const TONE_CONFIG = {
  cyan: {
    color: '#2DD4BF',
    bg: 'rgba(45,212,191,0.08)',
    border: 'rgba(45,212,191,0.3)',
    glow: 'rgba(45,212,191,0.15)',
    badge: 'rgba(45,212,191,0.2)',
  },
  amber: {
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
    glow: 'rgba(245,158,11,0.15)',
    badge: 'rgba(245,158,11,0.2)',
  },
  violet: {
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.3)',
    glow: 'rgba(124,58,237,0.15)',
    badge: 'rgba(124,58,237,0.2)',
  },
}

// ─── Feature bullets per section ─────────────────────────────────────────────

const FEATURE_BULLETS: Record<string, string[]> = {
  hero: [
    'Hybrid lexical + semantic retrieval',
    'Progressive 3-stage pipeline',
    'Flash / Auto / Pro modes',
  ],
  filescan: ['Parallel JIT scan — no daemon', 'rayon parallelism', 'No index drift'],
  stats: ['~7ms file load (1,000 files)', '<800ms full search', '0 background processes'],
  progressive: [
    'Stage 1: lexical scan',
    'Stage 2: semantic reranking',
    'Stage 3: evidence lock',
  ],
  pipeline: [
    'JIT Scan → Lexical → Semantic → Hybrid',
    'Attack detection + fallback',
    'Source-labeled stages',
  ],
  benchmarks: [
    'Flash v2: 0.8340 MRR@10, 339ms',
    'Pro v2: 0.9209 MRR@10, 430ms',
    'Canonical runs in models/lab/',
  ],
  compute: ['Flash: speed-first, 16.6MB', 'Auto: adaptive routing', 'Pro: max recall, 102MB'],
  comparison: [
    'Desktop: visual context + Pro views',
    'CLI: JSON/CSV/ripgrep output',
    'Same search engine, different surfaces',
  ],
  techbento: [
    '225-byte HMAC-signed cache entries',
    'ADS on NTFS, xattr on Unix',
    'Ed25519 attestation',
  ],
  cli: [
    '--json / --csv / --ripgrep output',
    '--journalist-mode for max privacy',
    '--progressive to see stages',
  ],
  'ask-mode': [
    'Intent detection routes query',
    'Evidence assembled locally',
    'Works on Auto + Pro',
  ],
  local: ['Zero data egress by design', 'Ephemeral mode: no disk writes', 'No telemetry, no sync'],
  'pro-value': [
    'Today: resume interrupted work',
    'Workstreams: clustered sessions',
    'Ask: Q&A from your files',
  ],
  pricing: [
    'Free: unlimited local search',
    'Pro: Today + Workstreams + Ask',
    'No account needed for search',
  ],
  cta: ['macOS, Windows, Linux', 'Free to download', 'Docs at ixos.app/docs'],
}

// ─── Score bar component ──────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 60,
          height: 3,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color,
          letterSpacing: '0.05em',
        }}
      >
        {(score / 100).toFixed(2)}
      </span>
    </div>
  )
}

// ─── Mode toggle buttons ───────────────────────────────────────────────────────

function ModeButtons({
  demoView,
  toneColor,
}: {
  demoView: 'search' | 'today' | 'workstreams'
  toneColor: string
}) {
  const [activeMode, setActiveMode] = useState('auto')

  if (demoView === 'today' || demoView === 'workstreams') {
    const tabs = demoView === 'today' ? ['Today', 'Workstreams'] : ['Workstreams', 'Today']
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveMode(tab.toLowerCase())}
            style={{
              height: 28,
              padding: '0 12px',
              fontFamily: 'monospace',
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: `1px solid ${activeMode === tab.toLowerCase() ? toneColor : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 4,
              background:
                activeMode === tab.toLowerCase() ? `${toneColor}22` : 'rgba(255,255,255,0.03)',
              color: activeMode === tab.toLowerCase() ? toneColor : 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {(['flash', 'auto', 'pro'] as const).map((m) => (
        <button
          key={m}
          onClick={() => setActiveMode(m)}
          style={{
            height: 28,
            padding: '0 12px',
            fontFamily: 'monospace',
            fontSize: 9,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            border: `1px solid ${activeMode === m ? toneColor : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 4,
            background: activeMode === m ? `${toneColor}22` : 'rgba(255,255,255,0.03)',
            color: activeMode === m ? toneColor : 'rgba(255,255,255,0.45)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

// ─── Main V1Section ────────────────────────────────────────────────────────────

export function V1Section({
  id,
  rank,
  file,
  tone,
  title,
  claim,
  demoView,
  demoQuery,
  demoAutoRun,
  onInView,
}: V1SectionProps) {
  const toneConf = TONE_CONFIG[tone]
  const score = Math.max(68, 98 - parseInt(rank, 10) * 1.5)
  const bullets = FEATURE_BULLETS[id] ?? []

  const sectionRef = useRef<HTMLDivElement>(null)
  const [locked, setLocked] = useState(false)
  const [showLockedBadge, setShowLockedBadge] = useState(false)
  const [autoRunTriggered, setAutoRunTriggered] = useState(false)

  const inView = useInView(sectionRef, { once: false, margin: '-15% 0px -15% 0px' })

  // Notify parent when inView changes
  useEffect(() => {
    if (inView && onInView) {
      onInView(id)
    }
  }, [inView, id, onInView])

  // Auto-run demo after entry + show locked state after ~800ms
  useEffect(() => {
    if (!inView) return
    if (autoRunTriggered) return

    if (demoAutoRun) {
      setAutoRunTriggered(true)
    }

    const lockTimer = setTimeout(() => {
      setLocked(true)
      setShowLockedBadge(true)
      const badgeTimer = setTimeout(() => setShowLockedBadge(false), 2000)
      return () => clearTimeout(badgeTimer)
    }, 800)

    return () => clearTimeout(lockTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  // Reset lock when out of view
  useEffect(() => {
    if (!inView) {
      setLocked(false)
      setShowLockedBadge(false)
      setAutoRunTriggered(false)
    }
  }, [inView])

  const borderColor = locked ? toneConf.color : 'rgba(255,255,255,0.08)'
  const glowShadow = locked
    ? `0 0 20px ${toneConf.glow}, 0 0 1px ${toneConf.color}`
    : '0 0 0 rgba(0,0,0,0)'

  return (
    <div id={`section-${id}`}>
      {/* Outer shell — 3D transform only here */}
      <motion.div
        ref={sectionRef}
        style={{
          perspective: 1400,
          transformStyle: 'preserve-3d',
          marginBottom: 0,
        }}
        whileHover={{ rotateX: -3, rotateY: 4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Inner content — always flat */}
        <div
          style={{
            transform: 'translateZ(0)',
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            background: inView ? toneConf.bg : 'rgba(255,255,255,0.01)',
            transition:
              'background 400ms ease, border-color 300ms ease, box-shadow 400ms ease',
            boxShadow: glowShadow,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* ── Header row (always visible) ─────────────────────────────────── */}
          <div
            style={{
              height: 44,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 14px',
              borderBottom: inView
                ? `1px solid ${toneConf.border}`
                : '1px solid rgba(255,255,255,0.06)',
              transition: 'border-color 300ms ease',
            }}
          >
            {/* Rank */}
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 10,
                color: toneConf.color,
                letterSpacing: '0.1em',
                opacity: 0.7,
                flexShrink: 0,
              }}
            >
              {rank}
            </span>

            {/* File path */}
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.04em',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {file}
            </span>

            {/* Score bar + value */}
            <div style={{ flexShrink: 0 }}>
              <ScoreBar score={score} color={toneConf.color} />
            </div>
          </div>

          {/* Collapsed title row (shows when not in view) */}
          {!inView && (
            <div
              style={{
                height: 28,
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {title}
              </span>
            </div>
          )}

          {/* ── Expanded bento panel ─────────────────────────────────────────── */}
          <AnimatePresence>
            {inView && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '55% 45%',
                    minHeight: 340,
                  }}
                >
                  {/* ── Left panel ──────────────────────────────────────────── */}
                  <div
                    style={{
                      padding: '20px 18px 18px',
                      borderRight: `1px solid ${toneConf.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    {/* Section title */}
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 9,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: toneConf.color,
                        opacity: 0.8,
                      }}
                    >
                      {title}
                    </div>

                    {/* Claim */}
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.35 }}
                      style={{
                        margin: 0,
                        fontFamily: 'monospace',
                        fontSize: 14,
                        lineHeight: 1.55,
                        color: 'rgba(243,245,247,0.92)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {claim}
                    </motion.p>

                    {/* Feature bullets */}
                    <motion.ul
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25, duration: 0.3 }}
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        flex: 1,
                      }}
                    >
                      {bullets.map((b, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            fontFamily: 'monospace',
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.6)',
                            lineHeight: 1.5,
                          }}
                        >
                          <span style={{ color: toneConf.color, flexShrink: 0, marginTop: 1 }}>
                            —
                          </span>
                          {b}
                        </li>
                      ))}
                    </motion.ul>

                    {/* Source reference */}
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 9,
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      source: {file}
                    </div>

                    {/* Interaction buttons */}
                    <ModeButtons demoView={demoView} toneColor={toneConf.color} />
                  </div>

                  {/* ── Right panel: DemoSurface ─────────────────────────────── */}
                  <div
                    style={{
                      position: 'relative',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Locked glow overlay */}
                    {locked && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '0 8px 8px 0',
                          boxShadow: `inset 0 0 30px ${toneConf.glow}`,
                          pointerEvents: 'none',
                          transition: 'box-shadow 400ms ease',
                        }}
                      />
                    )}

                    {/* LOCKED badge */}
                    <AnimatePresence>
                      {showLockedBadge && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            position: 'absolute',
                            top: 18,
                            right: 18,
                            zIndex: 10,
                            fontFamily: 'monospace',
                            fontSize: 8,
                            letterSpacing: '0.2em',
                            color: toneConf.color,
                            background: toneConf.badge,
                            border: `1px solid ${toneConf.border}`,
                            borderRadius: 3,
                            padding: '3px 7px',
                          }}
                        >
                          LOCKED
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Demo surface */}
                    <DemoSurface
                      initialView={demoView}
                      initialQuery={demoQuery || 'authentication token refresh'}
                      initialMode="auto"
                      autoRun={demoAutoRun && autoRunTriggered}
                      style={{
                        flex: 1,
                        height: '100%',
                        minHeight: 300,
                        borderRadius: 6,
                        overflow: 'hidden',
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lock flash border animation */}
          {locked && (
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 8,
                border: `1px solid ${toneConf.color}`,
                pointerEvents: 'none',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}
        </div>
      </motion.div>
    </div>
  )
}
