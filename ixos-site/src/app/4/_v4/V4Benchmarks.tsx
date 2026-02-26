'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(
  target: number,
  duration: number,
  active: boolean
): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    startRef.current = null

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setValue(eased * target)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, target, duration])

  return value
}

// ─── Metric row ───────────────────────────────────────────────────────────────

interface MetricProps {
  label: string
  value: number
  displayValue: string
  maxValue: number
  color: string
  active: boolean
  duration: number
  isRaw?: boolean
}

function MetricRow({ label, value, displayValue, maxValue, color, active, duration, isRaw }: MetricProps) {
  const rawCount = useCountUp(value, duration, active)
  const barPct = (value / maxValue) * 100

  // Format the animated number based on display pattern
  function formatAnimated(v: number): string {
    if (isRaw) return displayValue
    // Detect format from displayValue
    if (displayValue.includes('~')) {
      // e.g. "~339ms", "~431ms", "~44 MB"
      const numStr = displayValue.replace(/[^0-9.]/g, '')
      const suffix = displayValue.replace(/[~0-9.]/g, '')
      const parsed = parseFloat(numStr)
      if (Number.isInteger(parsed)) return `~${Math.round(v)}${suffix}`
      return `~${v.toFixed(2)}${suffix}`
    }
    if (displayValue.includes('ms')) {
      return `${v.toFixed(2)}ms`
    }
    if (displayValue.includes(' MB')) {
      return `${Math.round(v)} MB`
    }
    return v.toFixed(4)
  }

  return (
    <div className="flex flex-col gap-1.5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-baseline justify-between gap-4">
        <span
          className="font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}
        >
          {label}
        </span>
        <span
          className="font-mono tabular-nums"
          style={{
            fontFamily: 'var(--font-ixo-heading)',
            fontSize: 22,
            fontWeight: 700,
            color: '#F3F5F7',
            letterSpacing: '-0.02em',
          }}
        >
          {isRaw ? displayValue : formatAnimated(rawCount)}
        </span>
      </div>
      {/* Progress bar */}
      <div
        className="relative overflow-hidden"
        style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}
      >
        <motion.div
          style={{ position: 'absolute', inset: 0, background: color, opacity: 0.65, borderRadius: 1 }}
          initial={{ width: 0 }}
          animate={active ? { width: `${barPct}%` } : { width: 0 }}
          transition={{ duration: duration / 1000, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ─── Model card ───────────────────────────────────────────────────────────────

interface ModelCardProps {
  badge: string
  color: string
  metrics: MetricDef[]
  source: string
  inView: boolean
  delay: number
}

function ModelCard({ badge, color, metrics, source, inView, delay }: ModelCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden flex-1"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}18`,
        borderRadius: 12,
        padding: 24,
        minWidth: 0,
      }}
    >
      {/* Corner glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          background: `radial-gradient(circle at top right, ${color}14, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div className="relative z-10">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 font-mono mb-5"
          style={{
            background: `${color}10`,
            border: `1px solid ${color}30`,
            borderRadius: 5,
            padding: '4px 10px',
          }}
        >
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 9, letterSpacing: '0.15em', color, textTransform: 'uppercase' }}>
            {badge}
          </span>
        </div>

        {/* Metrics */}
        <div>
          {metrics.map((m) => (
            <MetricRow key={m.label} {...m} color={color} active={inView} />
          ))}
        </div>

        {/* Source */}
        <p
          className="font-mono mt-4"
          style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}
        >
          {source}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Hero stat ────────────────────────────────────────────────────────────────

function HeroStat({ inView }: { inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="text-center mb-16"
    >
      <div
        className="tabular-nums font-mono"
        style={{
          fontFamily: 'var(--font-ixo-heading)',
          fontSize: 'clamp(4rem, 10vw, 7rem)',
          fontWeight: 700,
          color: '#2DD4BF',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: 12,
        }}
      >
        ~7ms
      </div>
      <p
        style={{
          fontFamily: 'var(--font-ixo-heading)',
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'rgba(243,245,247,0.6)',
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        to load 1,000 files
      </p>
      <p
        className="font-mono"
        style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}
      >
        via rayon parallel · CLAUDE.md
      </p>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

// All values from models/lab/CANONICAL_RESULTS.md
type MetricDef = Omit<MetricProps, 'color' | 'active'>

const FLASH_METRICS: MetricDef[] = [
  { label: 'MRR@10',            value: 0.8340, displayValue: '0.8340', maxValue: 1.0,  duration: 900  },
  { label: 'Recall@10',         value: 0.925,  displayValue: '0.9250', maxValue: 1.0,  duration: 950  },
  { label: 'Latency / 1k files',value: 339,    displayValue: '~339ms', maxValue: 431,  duration: 1000, isRaw: false },
  { label: 'Load time',         value: 74.85,  displayValue: '74.85ms',maxValue: 355,  duration: 900  },
  { label: 'RAM',               value: 44,     displayValue: '~44 MB', maxValue: 102,  duration: 950, isRaw: false },
]

const PRO_METRICS: MetricDef[] = [
  { label: 'MRR@10',            value: 0.9209, displayValue: '0.9209', maxValue: 1.0,  duration: 1000 },
  { label: 'Recall@10',         value: 0.97,   displayValue: '0.9700', maxValue: 1.0,  duration: 1050 },
  { label: 'Latency / 1k files',value: 431,    displayValue: '~431ms', maxValue: 431,  duration: 1100, isRaw: false },
  { label: 'Load time',         value: 355,    displayValue: '~355ms', maxValue: 355,  duration: 1000 },
  { label: 'RAM',               value: 102,    displayValue: '~102 MB',maxValue: 102,  duration: 1050, isRaw: false },
]

export function V4Benchmarks() {
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
      data-section="benchmarks"
      id="benchmarks"
      ref={sectionRef}
      onMouseEnter={handleMouseEnter}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section className="py-28 md:py-36" style={{ backgroundColor: '#0C0E10' }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Section label + heading */}
          <div className="text-center mb-4">
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono uppercase mb-3"
              style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.6)' }}
            >
              Benchmarks
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
              Benchmarked. Not estimated.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono"
              style={{ fontSize: 14, color: 'rgba(243,245,247,0.4)', maxWidth: 480, margin: '0 auto' }}
            >
              Real MRR@10 scores from our test corpus. Published benchmark harness at models/lab/
            </motion.p>
          </div>

          {/* Hero stat */}
          <div className="mt-16">
            <HeroStat inView={inView} />
          </div>

          {/* Model cards */}
          <div className="flex flex-col md:flex-row gap-6">
            <ModelCard
              badge="ixos-flash-v2 · int8 · 512-dim"
              color="#2DD4BF"
              metrics={FLASH_METRICS}
              source="models/lab/CANONICAL_RESULTS.md · 2026-02-03"
              inView={inView}
              delay={0.2}
            />
            <ModelCard
              badge="flash-v2 + potion-base-8m · fusion"
              color="#7C3AED"
              metrics={PRO_METRICS}
              source="models/lab/CANONICAL_RESULTS.md · 2026-02-03"
              inView={inView}
              delay={0.28}
            />
          </div>

          {/* Disclaimer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="font-mono text-center mt-8"
            style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}
          >
            All numbers from models/lab/CANONICAL_RESULTS.md · benchmark run 2026-02-03
          </motion.p>
        </div>
      </section>
    </div>
  )
}
