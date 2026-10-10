"use client";

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

// ─── Mode data ────────────────────────────────────────────────────────────────

const MODES = [
  {
    id: 'flash',
    label: 'Flash',
    tag: 'ixos-flash-v2 · int8',
    description: 'Optimized for speed. Best for large codebases and quick lookups.',
    weights: { speed: 0.72, accuracy: 0.20, compute: 0.08 },
    metrics: { mrr: '0.8340', latency: '~339ms/1k', ram: '~44 MB' },
    color: '#F59E0B',
    source: 'models/lab/CANONICAL_RESULTS.md',
  },
  {
    id: 'auto',
    label: 'Auto',
    tag: 'adaptive routing',
    description: 'Balances speed and quality. Routes queries intelligently.',
    weights: { speed: 0.33, accuracy: 0.34, compute: 0.33 },
    metrics: { mrr: '0.83–0.92', latency: 'route-dependent', ram: 'dynamic' },
    color: '#2DD4BF',
    source: 'ixos_rank/hybrid_engine.rs',
  },
  {
    id: 'pro',
    label: 'Pro',
    tag: 'flash-v2 + potion-base-8m',
    description: 'Maximum recall. Dual-model fusion for highest quality results.',
    weights: { speed: 0.10, accuracy: 0.72, compute: 0.18 },
    metrics: { mrr: '0.9209', latency: '~431ms/1k', ram: '~102 MB' },
    color: '#7C3AED',
    source: 'models/lab/CANONICAL_RESULTS.md',
  },
] as const

type ModeId = 'flash' | 'auto' | 'pro'

// ─── Triangle geometry ────────────────────────────────────────────────────────

const V_SPEED    = { x: 0,    y: -180 }
const V_ACCURACY = { x: 156,  y: 90  }
const V_COMPUTE  = { x: -156, y: 90  }

function barycentricToCartesian(ws: number, wa: number, wc: number) {
  return {
    x: ws * V_SPEED.x + wa * V_ACCURACY.x + wc * V_COMPUTE.x,
    y: ws * V_SPEED.y + wa * V_ACCURACY.y + wc * V_COMPUTE.y,
  }
}

function modePoint(mode: typeof MODES[number]) {
  return barycentricToCartesian(
    mode.weights.speed,
    mode.weights.accuracy,
    mode.weights.compute
  )
}

function polygonFromWeights(ws: number, wa: number, wc: number, scale = 1): string {
  // Build a filled polygon: center → speed edge → mode barycentric point → compute edge.
  const center = { x: 0, y: 0 }
  const pt = barycentricToCartesian(ws, wa, wc)
  const scaledPt = { x: pt.x * scale, y: pt.y * scale }

  const vS = { x: V_SPEED.x * scale,   y: V_SPEED.y * scale  }
  const vC = { x: V_COMPUTE.x * scale, y: V_COMPUTE.y * scale }

  const pS = lerp2(center, vS, ws * 1.4)
  const pC = lerp2(center, vC, wc * 1.4)

  return `${center.x},${center.y} ${pS.x},${pS.y} ${scaledPt.x},${scaledPt.y} ${pC.x},${pC.y}`
}

function lerp2(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

// ─── Triangle SVG ─────────────────────────────────────────────────────────────

function TriangleDiagram({
  activeId,
  onSelectMode,
  inView,
}: {
  activeId: ModeId
  onSelectMode: (id: ModeId) => void
  inView: boolean
}) {
  const activeMode = MODES.find((m) => m.id === activeId)!

  const outerPoints = [V_SPEED, V_ACCURACY, V_COMPUTE]
  const outerPath = outerPoints.map((v) => `${v.x},${v.y}`).join(' ')

  function innerPath(scale: number) {
    return outerPoints.map((v) => `${v.x * scale},${v.y * scale}`).join(' ')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg
          viewBox="-215 -215 430 300"
          width="380"
          height="340"
          aria-label="Compute tradeoff triangle diagram"
        >
          {/* Axis lines center to vertex */}
          {[V_SPEED, V_ACCURACY, V_COMPUTE].map((v, i) => (
            <line
              key={i}
              x1={0}
              y1={0}
              x2={v.x}
              y2={v.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          ))}

          {/* Reference triangles */}
          {[0.33, 0.66].map((scale) => (
            <polygon
              key={scale}
              points={innerPath(scale)}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          ))}

          {/* Outer triangle */}
          <polygon
            points={outerPath}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1.5}
          />

          {/* Active mode polygon */}
          <AnimatePresence mode="wait">
            <motion.polygon
              key={activeId}
              points={polygonFromWeights(
                activeMode.weights.speed,
                activeMode.weights.accuracy,
                activeMode.weights.compute
              )}
              fill={activeMode.color}
              fillOpacity={0.12}
              stroke={activeMode.color}
              strokeWidth={1.5}
              strokeOpacity={0.6}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          </AnimatePresence>

          {/* Inactive mode dots */}
          {MODES.filter((m) => m.id !== activeId).map((mode) => {
            const pt = modePoint(mode)
            return (
              <g
                key={mode.id}
                role="button"
                tabIndex={0}
                aria-label={`Select ${mode.label} mode`}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectMode(mode.id as ModeId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectMode(mode.id as ModeId)
                }}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={14}
                  fill="transparent"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={5}
                  fill={mode.color}
                  opacity={0.35}
                />
              </g>
            )
          })}

          {/* Active mode dot */}
          {(() => {
            const pt = modePoint(activeMode)
            return (
              <g>
                {/* Glow ring */}
                <motion.circle
                  cx={pt.x}
                  cy={pt.y}
                  r={18}
                  fill="none"
                  stroke={activeMode.color}
                  strokeWidth={1}
                  strokeOpacity={0.25}
                  animate={{ r: [16, 22, 16] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={11}
                  fill={activeMode.color}
                  opacity={0.15}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={7}
                  fill={activeMode.color}
                  opacity={0.9}
                />
              </g>
            )
          })()}

          {/* Vertex labels */}
          <text
            x={V_SPEED.x}
            y={V_SPEED.y - 14}
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
            fontSize={10}
            fontFamily="var(--font-ixo-mono, monospace)"
            letterSpacing="0.15em"
          >
            SPEED
          </text>
          <text
            x={V_SPEED.x}
            y={V_SPEED.y - 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.22)"
            fontSize={8}
            fontFamily="var(--font-ixo-mono, monospace)"
          >
            latency / throughput
          </text>

          <text
            x={V_ACCURACY.x + 16}
            y={V_ACCURACY.y + 6}
            textAnchor="start"
            fill="rgba(255,255,255,0.55)"
            fontSize={10}
            fontFamily="var(--font-ixo-mono, monospace)"
            letterSpacing="0.15em"
          >
            ACCURACY
          </text>
          <text
            x={V_ACCURACY.x + 16}
            y={V_ACCURACY.y + 16}
            textAnchor="start"
            fill="rgba(255,255,255,0.22)"
            fontSize={8}
            fontFamily="var(--font-ixo-mono, monospace)"
          >
            MRR@10
          </text>

          <text
            x={V_COMPUTE.x - 16}
            y={V_COMPUTE.y + 6}
            textAnchor="end"
            fill="rgba(255,255,255,0.55)"
            fontSize={10}
            fontFamily="var(--font-ixo-mono, monospace)"
            letterSpacing="0.15em"
          >
            COMPUTE
          </text>
          <text
            x={V_COMPUTE.x - 16}
            y={V_COMPUTE.y + 16}
            textAnchor="end"
            fill="rgba(255,255,255,0.22)"
            fontSize={8}
            fontFamily="var(--font-ixo-mono, monospace)"
          >
            RAM / CPU
          </text>

          {/* Mode labels near dots */}
          {MODES.map((mode) => {
            const pt = modePoint(mode)
            const isActive = mode.id === activeId
            const offset = mode.id === 'pro' ? { dx: -14, dy: 0, anchor: 'end' as const }
              : mode.id === 'flash' ? { dx: 14, dy: 0, anchor: 'start' as const }
              : { dx: 0, dy: -14, anchor: 'middle' as const }
            return (
              <text
                key={mode.id}
                x={pt.x + offset.dx}
                y={pt.y + offset.dy}
                textAnchor={offset.anchor}
                fill={isActive ? mode.color : 'rgba(255,255,255,0.25)'}
                fontSize={9}
                fontFamily="var(--font-ixo-mono, monospace)"
                letterSpacing="0.1em"
                style={{ transition: 'fill 0.3s' }}
              >
                {mode.label.toUpperCase()}
              </text>
            )
          })}
        </svg>
      </motion.div>
    </div>
  )
}

// ─── Weight bar ───────────────────────────────────────────────────────────────

function WeightBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)' }}
        >
          {label}
        </span>
        <span className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div
        style={{
          height: 3,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <motion.div
          style={{ height: '100%', background: color, borderRadius: 2 }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

// ─── Mode details panel ───────────────────────────────────────────────────────

function ModePanel({
  activeId,
  onSelectMode,
}: {
  activeId: ModeId
  onSelectMode: (id: ModeId) => void
}) {
  const activeMode = MODES.find((m) => m.id === activeId)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Mode selector buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {MODES.map((mode) => {
          const isActive = mode.id === activeId
          return (
            <button
              key={mode.id}
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={`${mode.label} mode`}
              onClick={() => onSelectMode(mode.id as ModeId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectMode(mode.id as ModeId)
              }}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 8,
                border: `1px solid ${isActive ? mode.color : 'rgba(255,255,255,0.08)'}`,
                background: isActive ? `rgba(${hexToRgb(mode.color)},0.08)` : 'transparent',
                color: isActive ? mode.color : 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-ixo-mono, monospace)',
                fontSize: 11,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {mode.label}
            </button>
          )
        })}
      </div>

      {/* Mode details card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          {/* Tag */}
          <div
            className="font-mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.2em',
              color: activeMode.color,
              textTransform: 'uppercase',
              marginBottom: 8,
              opacity: 0.8,
            }}
          >
            {activeMode.tag}
          </div>

          {/* Description */}
          <p
            className="font-mono"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 16, lineHeight: 1.6 }}
          >
            {activeMode.description}
          </p>

          {/* Metrics table */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              marginBottom: 16,
              padding: '12px 0',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {[
              { label: 'MRR@10', value: activeMode.metrics.mrr },
              { label: 'Latency', value: activeMode.metrics.latency },
              { label: 'RAM', value: activeMode.metrics.ram },
            ].map((m) => (
              <div key={m.label}>
                <div
                  className="font-mono uppercase"
                  style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: 3 }}
                >
                  {m.label}
                </div>
                <div
                  className="font-mono tabular-nums"
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Weight bars */}
          <WeightBar label="Speed" value={activeMode.weights.speed} color="#F59E0B" />
          <WeightBar label="Accuracy" value={activeMode.weights.accuracy} color="#2DD4BF" />
          <WeightBar label="Compute" value={activeMode.weights.compute} color="#7C3AED" />

          {/* Source */}
          <div
            className="font-mono"
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.2)',
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            Source: {activeMode.source}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Privacy badge */}
      <div
        className="font-mono"
        style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(45,212,191,0.04)',
          border: '1px solid rgba(45,212,191,0.15)',
          fontSize: 10,
          color: 'rgba(45,212,191,0.75)',
          lineHeight: 1.5,
          letterSpacing: '0.01em',
        }}
      >
        Local-first · All modes run fully on-device · Zero network egress
      </div>
    </div>
  )
}

// ─── Hex to RGB helper ────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '255,255,255'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}

// ─── Main component ───────────────────────────────────────────────────────────

export function V4ComputeBudget() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()

  const [activeId, setActiveId] = useState<ModeId>('flash')
  const lastInteractionRef = useRef<number>(0)
  const modeOrder: ModeId[] = ['flash', 'auto', 'pro']

  // Auto-cycle every 4s when idle
  useEffect(() => {
    if (lowEnd) return
    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastInteractionRef.current >= 4000) {
        setActiveId((prev) => {
          const idx = modeOrder.indexOf(prev)
          return modeOrder[(idx + 1) % modeOrder.length]
        })
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [lowEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectMode = useCallback(
    (id: ModeId) => {
      lastInteractionRef.current = Date.now()
      setActiveId(id)
    },
    []
  )

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (lowEnd) return
    pulse(e.clientX, e.clientY, 0.35)
  }

  return (
    <div
      data-section="compute"
      id="compute"
      ref={sectionRef}
      onMouseEnter={handleMouseEnter}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: '#0C0E10', padding: '112px 0 144px' }}
      >
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          {/* Header */}
          <div style={{ marginBottom: 64 }}>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.6)', marginBottom: 12 }}
            >
              Performance profiles
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
              Compute tradeoffs, clearly mapped.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono"
              style={{ fontSize: 14, color: 'rgba(243,245,247,0.4)', maxWidth: 480 }}
            >
              Choose your quality vs. speed point. Privacy is not a trade-off — it&apos;s constant.
            </motion.p>
          </div>

          {/* Two-column layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '55% 45%',
              gap: 48,
              alignItems: 'center',
            }}
            className="flex-col md:grid-cols-2"
          >
            {/* Left: Triangle */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '16px 8px',
              }}
            >
              <TriangleDiagram
                activeId={activeId}
                onSelectMode={handleSelectMode}
                inView={inView}
              />
            </motion.div>

            {/* Right: Mode panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <ModePanel activeId={activeId} onSelectMode={handleSelectMode} />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
