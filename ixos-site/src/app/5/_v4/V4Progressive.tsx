'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'

// ─── Stage data ───────────────────────────────────────────────────────────────

interface FileEntry {
  file: string
  score: number
  rank: number
  locked?: boolean
}

interface Stage {
  label: string
  badge: string
  color: string
  description: string
  files: readonly FileEntry[]
}

const STAGES: readonly Stage[] = [
  {
    label: 'Local Search',
    badge: 'SCANNING',
    color: '#F59E0B',
    description: 'Keyword candidates surface instantly using parallel scoring across all files.',
    files: [
      { file: 'auth/session.ts',    score: 0.87, rank: 1 },
      { file: 'middleware/jwt.ts',  score: 0.82, rank: 2 },
      { file: 'lib/tokens.ts',      score: 0.79, rank: 3 },
      { file: 'api/refresh.ts',     score: 0.74, rank: 4 },
      { file: 'hooks/useAuth.ts',   score: 0.71, rank: 5 },
      { file: 'utils/crypto.ts',    score: 0.63, rank: 6 },
    ],
  },
  {
    label: 'Deep Search',
    badge: 'RERANKING',
    color: '#7C3AED',
    description: 'Embedding similarity re-scores candidates. Intent-aligned results rise above keyword matches.',
    files: [
      { file: 'middleware/jwt.ts',  score: 0.97, rank: 1 },
      { file: 'auth/session.ts',    score: 0.94, rank: 2 },
      { file: 'lib/tokens.ts',      score: 0.91, rank: 3 },
      { file: 'api/refresh.ts',     score: 0.88, rank: 4 },
      { file: 'hooks/useAuth.ts',   score: 0.85, rank: 5 },
      { file: 'utils/crypto.ts',    score: 0.79, rank: 6 },
    ],
  },
  {
    label: 'Why Matched ready',
    badge: 'READY',
    color: '#2DD4BF',
    description: 'Scores stabilize. Results are ready with full confidence ordering.',
    files: [
      { file: 'middleware/jwt.ts',  score: 0.97, rank: 1, locked: true },
      { file: 'auth/session.ts',    score: 0.94, rank: 2, locked: true },
      { file: 'lib/tokens.ts',      score: 0.91, rank: 3, locked: true },
      { file: 'api/refresh.ts',     score: 0.88, rank: 4, locked: true },
      { file: 'hooks/useAuth.ts',   score: 0.85, rank: 5, locked: true },
      { file: 'utils/crypto.ts',    score: 0.79, rank: 6, locked: true },
    ],
  },
] as const

type StageIndex = 0 | 1 | 2

function resolveProgressStage(progress: number): StageIndex {
  if (progress >= 0.62) return 2
  if (progress >= 0.3) return 1
  return 0
}
// ─── File row ─────────────────────────────────────────────────────────────────

function FileRow({ entry, color }: { entry: FileEntry; color: string }) {
  return (
    <motion.div
      layout
      layoutId={`prog-file-${entry.file}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.38, ease: 'easeInOut' }}
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Rank */}
      <span
        className="font-mono tabular-nums shrink-0"
        style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', width: 14, textAlign: 'right' }}
      >
        {entry.rank}
      </span>

      <div className="shrink-0" style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />

      {/* Filename */}
      <span
        className="font-mono flex-1 truncate"
        style={{ fontSize: 12, color: 'rgba(243,245,247,0.7)' }}
      >
        {entry.file}
      </span>

      {/* Lock icon */}
      {entry.locked && (
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="font-mono shrink-0"
          style={{ fontSize: 9, color, letterSpacing: '0.1em' }}
        >
          &#9632;
        </motion.span>
      )}

      {/* Score bar + value */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="relative overflow-hidden"
          style={{ height: 2, width: 56, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}
        >
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{ background: color, borderRadius: 1 }}
            initial={{ width: 0 }}
            animate={{ width: `${entry.score * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 10, color, width: 28, textAlign: 'right' }}
        >
          {entry.score.toFixed(2)}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Scroll-driven version ────────────────────────────────────────────────────

function ScrollDrivenProgressive() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<StageIndex>(0)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Regression guard: stage is always derived from one deterministic mapping.
  useEffect(() => {
    setStage(resolveProgressStage(scrollYProgress.get()))
  }, [scrollYProgress])

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setStage(resolveProgressStage(v))
  })

  const current = STAGES[stage]

  return (
    <div ref={containerRef} style={{ height: '160vh' }} data-stage={stage}>
      {/* Sticky panel */}
      <div
        className="sticky top-0 flex flex-col overflow-hidden"
        style={{ height: '100vh', background: 'rgba(14,17,23,0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      >
        {/* Section header */}
        <div
          className="shrink-0 flex flex-col items-center pt-10 pb-6"
        >
          <h2
            style={{
              fontFamily: 'var(--font-ixo-heading)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 700,
              color: '#F3F5F7',
              letterSpacing: '-0.025em',
              textAlign: 'center',
              marginBottom: 6,
            }}
          >
            Watch results progress in real time.
          </h2>
          <p className="font-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
            Scroll to advance
          </p>
        </div>

        {/* Main grid */}
        <div className="flex-1 flex items-center overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* Left: query + stage info */}
              <div>
                {/* Query box */}
                <div
                  className="font-mono mb-8"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8,
                    padding: '14px 16px',
                  }}
                >
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginRight: 8 }}>
                    &gt;
                  </span>
                  <span style={{ fontSize: 16, color: '#F3F5F7', letterSpacing: '-0.01em' }}>
                    authentication token refresh
                  </span>
                </div>

                {/* Stage indicators */}
                <div className="flex flex-col gap-3 mb-8">
                  {STAGES.map((s, i) => (
                    <div
                      key={s.label}
                      className="flex items-center gap-3"
                      style={{ opacity: i <= stage ? 1 : 0.3, transition: 'opacity 0.4s ease' }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: i === stage ? s.color : i < stage ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                          boxShadow: i === stage ? `0 0 8px ${s.color}` : 'none',
                          transition: 'all 0.4s ease',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        className="font-mono uppercase"
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.25em',
                          color: i === stage ? s.color : 'rgba(255,255,255,0.3)',
                          transition: 'color 0.4s ease',
                        }}
                      >
                        {String(i + 1).padStart(2, '0')} / {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Stage description */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={stage}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p
                      className="font-mono leading-relaxed"
                      style={{ fontSize: 13, color: 'rgba(243,245,247,0.45)', maxWidth: 380 }}
                    >
                      {current.description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Progress ticks */}
                <div className="flex items-center gap-2 mt-8">
                  {STAGES.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: 2,
                        borderRadius: 1,
                        width: i === stage ? 32 : 12,
                        background: i === stage
                          ? current.color
                          : i < stage
                          ? 'rgba(255,255,255,0.25)'
                          : 'rgba(255,255,255,0.08)',
                        transition: 'all 0.4s ease',
                      }}
                    />
                  ))}
                  <span
                    className="font-mono uppercase ml-2"
                    style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)' }}
                  >
                    {stage + 1} of 3
                  </span>
                </div>
              </div>

              {/* Right: result list */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: '20px',
                }}
              >
                {/* Panel header */}
                <div
                  className="flex items-center justify-between pb-3 mb-1"
                  style={{ borderBottom: `1px solid ${current.color}22` }}
                >
                  <div className="flex items-center gap-2">
                    <div style={{ width: 6, height: 6, background: current.color, transition: 'background 0.4s ease' }} />
                    <span
                      className="font-mono uppercase"
                      style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)' }}
                    >
                      {current.files.length} candidates
                    </span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={current.badge}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.25 }}
                      className="font-mono uppercase"
                      style={{ fontSize: 9, letterSpacing: '0.2em', color: current.color }}
                    >
                      {current.badge}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Files */}
                <div style={{ minHeight: 240 }}>
                  <AnimatePresence>
                    {current.files.map((entry) => (
                      <FileRow key={entry.file} entry={entry} color={current.color} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Scroll hint (stage 0 only) */}
        {stage === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-7 right-8 flex items-center gap-2 pointer-events-none"
          >
            <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)' }}
            >
              Scroll to advance
            </span>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─── Static low-end fallback ──────────────────────────────────────────────────

function StaticProgressive() {
  return (
    <div className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p
            className="font-mono uppercase mb-3"
            style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.6)' }}
          >
            Pipeline
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-ixo-heading)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              color: '#F3F5F7',
              letterSpacing: '-0.025em',
            }}
          >
            Watch results progress in real time.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STAGES.map((s, si) => (
            <div
              key={s.label}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${s.color}22`,
                borderRadius: 10,
                padding: 20,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.25em', color: s.color }}
                >
                  {String(si + 1).padStart(2, '0')} / {s.label}
                </span>
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.2em', color: s.color }}
                >
                  {s.badge}
                </span>
              </div>
              <p
                className="font-mono mb-4 leading-relaxed"
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}
              >
                {s.description}
              </p>
              {s.files.map((entry) => (
                <div
                  key={entry.file}
                  className="flex items-center gap-2 py-1.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span
                    className="font-mono tabular-nums"
                    style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', width: 12 }}
                  >
                    {entry.rank}
                  </span>
                  <span
                    className="font-mono flex-1 truncate"
                    style={{ fontSize: 11, color: 'rgba(243,245,247,0.65)' }}
                  >
                    {entry.file}
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={{ fontSize: 10, color: s.color }}
                  >
                    {entry.score.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function V4Progressive() {
  const lowEnd = useReducedOrLowEnd()

  return (
    <div
      data-section="progressive"
      id="progressive"
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'transparent' }}
    >
      {lowEnd ? <StaticProgressive /> : <ScrollDrivenProgressive />}
    </div>
  )
}

