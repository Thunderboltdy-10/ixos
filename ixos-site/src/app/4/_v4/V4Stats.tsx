'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatDef {
  value: string
  label: string
  sublabel: string
  source: string
  color: string
  numericTarget: number
  numericSuffix: string
  numericPrefix: string
  tickCount: number
  tickProgress: number // 0–1 where the tick marker should stop
}

// ─── Stats data ───────────────────────────────────────────────────────────────

const STATS: StatDef[] = [
  {
    value: '~7ms',
    label: 'file loading',
    sublabel: '1,000 files',
    source: 'CLAUDE.md',
    color: '#2DD4BF',
    numericTarget: 7,
    numericSuffix: 'ms',
    numericPrefix: '~',
    tickCount: 10,
    tickProgress: 0.07, // 7 out of ~100ms scale
  },
  {
    value: '<800ms',
    label: 'full search',
    sublabel: 'stub model',
    source: 'CLAUDE.md',
    color: '#7C3AED',
    numericTarget: 800,
    numericSuffix: 'ms',
    numericPrefix: '<',
    tickCount: 10,
    tickProgress: 0.8,
  },
  {
    value: '0',
    label: 'daemons',
    sublabel: 'no background process',
    source: 'CLAUDE.md',
    color: '#F59E0B',
    numericTarget: 0,
    numericSuffix: '',
    numericPrefix: '',
    tickCount: 10,
    tickProgress: 0, // zero — sits at the start
  },
]

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number, active: boolean): number {
  const [val, setVal] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || target === 0) {
      if (target === 0) setVal(0)
      return
    }
    startRef.current = null

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(eased * target))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, target, duration])

  return val
}

// ─── SVG tick rule ────────────────────────────────────────────────────────────

function TickRule({
  color,
  progress,
  active,
  count,
}: {
  color: string
  progress: number
  active: boolean
  count: number
}) {
  const width = 200
  const height = 20

  // Generate tick positions
  const ticks = Array.from({ length: count + 1 }, (_, i) => ({
    x: (i / count) * width,
    isMajor: i === 0 || i === count || i === Math.floor(count / 2),
  }))

  const markerX = progress * width

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      {/* Base line */}
      <line
        x1={0}
        y1={height - 1}
        x2={width}
        y2={height - 1}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />

      {/* Filled line up to marker */}
      <motion.line
        x1={0}
        y1={height - 1}
        x2={0}
        y2={height - 1}
        stroke={color}
        strokeWidth={1}
        opacity={0.5}
        animate={active ? { x2: markerX } : { x2: 0 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
      />

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x}
          y1={height - 1}
          x2={t.x}
          y2={t.isMajor ? height - 9 : height - 5}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />
      ))}

      {/* Marker dot */}
      <motion.circle
        cx={0}
        cy={height - 1}
        r={3}
        fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        animate={active ? { cx: markerX } : { cx: 0 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Single stat card ─────────────────────────────────────────────────────────

function StatCard({
  stat,
  inView,
  delay,
}: {
  stat: StatDef
  inView: boolean
  delay: number
}) {
  const count = useCountUp(stat.numericTarget, 950, inView)

  const displayValue =
    stat.numericTarget === 0
      ? '0'
      : `${stat.numericPrefix}${count}${stat.numericSuffix}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4 py-8 px-2"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Tick rule */}
      <TickRule
        color={stat.color}
        progress={stat.tickProgress}
        active={inView}
        count={stat.tickCount}
      />

      {/* Main value */}
      <div
        className="tabular-nums font-mono"
        style={{
          fontFamily: 'var(--font-ixo-heading)',
          fontSize: 'clamp(3rem, 6vw, 5rem)',
          fontWeight: 700,
          color: stat.color,
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {displayValue}
        {stat.numericTarget === 0 && (
          <span
            style={{
              fontFamily: 'var(--font-ixo-heading)',
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              color: stat.color,
              marginLeft: 8,
              letterSpacing: '-0.02em',
            }}
          >
            daemons
          </span>
        )}
      </div>

      {/* Label + sublabel */}
      <div>
        <p
          className="font-mono uppercase"
          style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(243,245,247,0.55)', marginBottom: 3 }}
        >
          {stat.numericTarget === 0 ? 'no background process' : stat.label}
        </p>
        <p
          className="font-mono"
          style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}
        >
          {stat.numericTarget === 0 ? 'JIT scan · on demand' : stat.sublabel}
        </p>
      </div>

      {/* Source */}
      <p
        className="font-mono"
        style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}
      >
        Source: {stat.source}
      </p>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function V4Stats() {
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
      data-section="stats"
      id="stats"
      ref={sectionRef}
      onMouseEnter={handleMouseEnter}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section className="py-28 md:py-36" style={{ backgroundColor: '#0C0E10' }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="mb-16">
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono uppercase mb-3"
              style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.6)' }}
            >
              Performance
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: 'var(--font-ixo-heading)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                color: '#F3F5F7',
                letterSpacing: '-0.025em',
                marginBottom: 12,
              }}
            >
              Numbers from the test harness.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono"
              style={{ fontSize: 14, color: 'rgba(243,245,247,0.4)', maxWidth: 480 }}
            >
              Measured on real workloads, not synthetic benchmarks.
            </motion.p>
          </div>

          {/* Stats grid */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-10"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {STATS.map((stat, i) => (
              <StatCard
                key={stat.value + stat.label}
                stat={stat}
                inView={inView}
                delay={0.1 * i}
              />
            ))}
          </div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="font-mono mt-8"
            style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}
          >
            250 tests passing · CLAUDE.md (Performance Benchmarks)
          </motion.p>
        </div>
      </section>
    </div>
  )
}
