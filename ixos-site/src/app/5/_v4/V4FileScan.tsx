'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

// ─── Tree data ────────────────────────────────────────────────────────────────

interface TreeNode {
  prefix: string
  name: string
  files: number
  color: string
}

const MAX_FILES = 312

const TREE: TreeNode[] = [
  { prefix: '',        name: '~/projects/myapp/', files: 312, color: '#2DD4BF' },
  { prefix: '├── ',   name: 'src/',               files: 189, color: '#7C3AED' },
  { prefix: '│   ├── ', name: 'components/',      files:  47, color: '#F59E0B' },
  { prefix: '│   ├── ', name: 'lib/',              files:  31, color: 'rgba(243,245,247,0.5)' },
  { prefix: '│   ├── ', name: 'api/',              files:  19, color: 'rgba(243,245,247,0.5)' },
  { prefix: '│   ├── ', name: 'hooks/',            files:  12, color: 'rgba(243,245,247,0.5)' },
  { prefix: '│   └── ', name: 'utils/',            files:   8, color: 'rgba(243,245,247,0.5)' },
  { prefix: '├── ',   name: 'tests/',              files:  44, color: 'rgba(243,245,247,0.5)' },
  { prefix: '│   ├── ', name: 'unit/',             files:  28, color: 'rgba(243,245,247,0.5)' },
  { prefix: '│   └── ', name: 'e2e/',              files:  16, color: 'rgba(243,245,247,0.5)' },
  { prefix: '├── ',   name: 'docs/',               files:  23, color: 'rgba(243,245,247,0.5)' },
  { prefix: '├── ',   name: 'config/',             files:   8, color: 'rgba(243,245,247,0.5)' },
  { prefix: '└── ',   name: 'scripts/',            files:   5, color: 'rgba(243,245,247,0.5)' },
]

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    startRef.current = null

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, target, duration])

  return value
}

// ─── Blueprint grid background ────────────────────────────────────────────────

function BlueprintGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    />
  )
}

// ─── Tree card ────────────────────────────────────────────────────────────────

function TreeCard({ inView }: { inView: boolean }) {
  const countDisplay = useCountUp(312, 1600, inView)
  
  // Interactive 3D hover effect
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const rotateXValue = ((y - centerY) / centerY) * -8
    const rotateYValue = ((x - centerX) / centerX) * 8
    
    setRotateX(rotateXValue)
    setRotateY(rotateYValue)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX, rotateY }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1.5 }}
      className="relative overflow-hidden"
      style={{
        // 3D glassmorphic card — shadow top-left
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.1) 100%)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderTop: '1px solid rgba(255,255,255,0.16)',
        borderLeft: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: '24px',
        transformStyle: 'preserve-3d',
        boxShadow: '-8px -8px 24px rgba(0,0,0,0.7), 4px 4px 16px rgba(45,212,191,0.05), 0 20px 40px rgba(0,0,0,0.4)',
        perspective: 1000,
        transition: 'box-shadow 0.25s ease',
      }}
    >
      <BlueprintGrid />

      <div className="relative z-10" style={{ transform: 'translateZ(30px)' }}>
        {/* Card header: counter + progress bar */}
        <div className="flex items-center justify-between mb-4">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="font-mono"
            style={{ fontSize: 11, color: 'rgba(243,245,247,0.3)', letterSpacing: '0.15em' }}
          >
            FILES FOUND
          </motion.span>
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="tabular-nums font-mono"
            style={{ fontSize: 22, color: '#2DD4BF', letterSpacing: '-0.02em', fontWeight: 700 }}
          >
            {countDisplay}
          </motion.div>
        </div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="relative mb-5"
          style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}
        >
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{ background: '#2DD4BF', borderRadius: 1 }}
            initial={{ width: '0%' }}
            animate={inView ? { width: '100%' } : { width: '0%' }}
            transition={{ delay: 0.3, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Pulse dot */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2"
            initial={{ left: '0%' }}
            animate={inView ? { left: '100%' } : { left: '0%' }}
            transition={{ delay: 0.3, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: 6,
              height: 6,
              background: '#2DD4BF',
              borderRadius: '50%',
              boxShadow: '0 0 10px rgba(45,212,191,0.9)',
              marginLeft: -3,
            }}
          />
        </motion.div>

        {/* Directory tree */}
        <div className="font-mono">
          {TREE.map((node, i) => {
            const barWidth = node.files > 0 ? (node.files / MAX_FILES) * 180 : 0
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  delay: 0.25 + i * 0.055,
                  duration: 0.35,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center gap-3 py-1"
              >
                {/* Prefix + name */}
                <div className="flex items-baseline shrink-0" style={{ minWidth: 220 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', whiteSpace: 'pre' }}>
                    {node.prefix}
                  </span>
                  <span style={{ fontSize: 13, color: node.color }}>
                    {node.name}
                  </span>
                </div>

                {/* Bar + count */}
                {node.files > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="overflow-hidden"
                      style={{ height: 2, width: 180, background: 'rgba(255,255,255,0.05)', borderRadius: 1 }}
                    >
                      <motion.div
                        style={{ height: '100%', background: node.color, opacity: 0.5, borderRadius: 1 }}
                        initial={{ width: 0 }}
                        animate={inView ? { width: barWidth } : { width: 0 }}
                        transition={{ delay: 0.4 + i * 0.055, duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span
                      className="tabular-nums"
                      style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', minWidth: 52, textAlign: 'right' }}
                    >
                      ({String(node.files).padStart(3, '\u00A0')} files)
                    </span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Status strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="flex flex-wrap gap-x-8 gap-y-2 mt-6 pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {[
            { label: 'Strategy', value: 'JIT — no daemon required' },
            { label: 'Parallelism', value: 'rayon' },
            { label: 'Telemetry', value: 'none' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)' }}
              >
                {item.label}:
              </span>
              <span className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                {item.value}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Source note */}
        <p
          className="font-mono mt-3"
          style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}
        >
          Source: CLAUDE.md (Architecture)
        </p>
      </div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function V4FileScan() {
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
      data-section="filescan"
      id="filescan"
      ref={sectionRef}
      onMouseEnter={handleMouseEnter}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section className="relative py-28 md:py-36 overflow-hidden" style={{ backgroundColor: 'transparent' }}>
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div>
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="font-mono uppercase mb-3"
                style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.6)' }}
              >
                JIT Filesystem Scan
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
                  lineHeight: 1.1,
                  marginBottom: 20,
                }}
              >
                Zero daemon.<br />Zero index.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="font-mono leading-relaxed"
                style={{ fontSize: 14, color: 'rgba(243,245,247,0.45)', maxWidth: 420 }}
              >
                Every search triggers a fresh JIT scan using rayon&apos;s thread pool.
                No background process, no stale cache — just parallel scanning at native speed.
              </motion.p>

              {/* Feature tags */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap gap-2 mt-8"
              >
                {['rayon parallel', 'no daemon', 'JIT scan', 'zero telemetry'].map((tag) => (
                  <span
                    key={tag}
                    className="font-mono uppercase"
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.18em',
                      padding: '4px 10px',
                      border: '1px solid rgba(45,212,191,0.2)',
                      borderRadius: 4,
                      color: 'rgba(45,212,191,0.7)',
                      background: 'rgba(45,212,191,0.04)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right: tree visualization */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <TreeCard inView={inView} />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
