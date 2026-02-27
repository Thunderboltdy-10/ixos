'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, animate } from 'framer-motion'

interface V1ConnectorProps {
  activeSectionId: string | null
  sectionIds: string[]
  onNodeClick: (id: string) => void
}

const SECTION_TONES: Record<string, string> = {
  hero: '#2DD4BF',
  filescan: '#F59E0B',
  stats: '#F59E0B',
  progressive: '#7C3AED',
  pipeline: '#7C3AED',
  benchmarks: '#2DD4BF',
  compute: '#2DD4BF',
  comparison: '#2DD4BF',
  techbento: '#2DD4BF',
  cli: '#F59E0B',
  'ask-mode': '#7C3AED',
  local: '#2DD4BF',
  'pro-value': '#F59E0B',
  pricing: '#7C3AED',
  cta: '#2DD4BF',
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'live search cockpit',
  filescan: 'filesystem sweep',
  stats: 'performance cluster',
  progressive: 'progressive lock',
  pipeline: 'pipeline map',
  benchmarks: 'bench board',
  compute: 'compute map',
  comparison: 'capability matrix',
  techbento: 'system internals',
  cli: 'terminal commands',
  'ask-mode': 'ask pathway',
  local: 'local privacy',
  'pro-value': 'pro loop',
  pricing: 'plan split',
  cta: 'launch deck',
}

export function V1Connector({ activeSectionId, sectionIds, onNodeClick }: V1ConnectorProps) {
  const [windowHeight, setWindowHeight] = useState(800)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [pulseY, setPulseY] = useState(80)
  const pulseYRef = useRef(80)
  const animControlRef = useRef<ReturnType<typeof animate> | null>(null)

  useEffect(() => {
    const update = () => setWindowHeight(window.innerHeight)
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  const totalNodes = sectionIds.length
  const topY = 80
  const bottomY = windowHeight - 40
  const trackHeight = bottomY - topY
  const nodePositions = sectionIds.map((_, i) =>
    totalNodes <= 1 ? topY : topY + (trackHeight / (totalNodes - 1)) * i
  )

  // Animate pulse dot to active section
  useEffect(() => {
    if (activeSectionId === null) return
    const idx = sectionIds.indexOf(activeSectionId)
    if (idx === -1) return
    const targetY = nodePositions[idx]

    if (animControlRef.current) {
      animControlRef.current.stop()
    }

    const ctrl = animate(pulseYRef.current, targetY, {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      onUpdate: (v) => {
        pulseYRef.current = v
        setPulseY(v)
      },
    })
    animControlRef.current = ctrl
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionId])

  const handleNodeClick = useCallback(
    (id: string) => {
      onNodeClick(id)
      window.dispatchEvent(
        new CustomEvent('v4:pulse', {
          detail: {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            intensity: 1.2,
          },
        })
      )
    },
    [onNodeClick]
  )

  const activeIndex = activeSectionId ? sectionIds.indexOf(activeSectionId) : -1
  const activeToneColor = activeSectionId
    ? (SECTION_TONES[activeSectionId] ?? '#2DD4BF')
    : '#2DD4BF'

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 56,
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <svg
        width={56}
        height={windowHeight}
        style={{ position: 'absolute', top: 0, left: 0 }}
        aria-hidden
      >
        <defs>
          <linearGradient id="v1-thread-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Main vertical thread */}
        <motion.path
          d={`M28,${topY} L28,${bottomY}`}
          stroke="url(#v1-thread-grad)"
          strokeWidth={1}
          fill="none"
          strokeDasharray="4 3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />

        {/* Node dots */}
        {sectionIds.map((id, i) => {
          const cy = nodePositions[i]
          const isActive = i === activeIndex
          const toneColor = SECTION_TONES[id] ?? '#2DD4BF'
          const r = isActive ? 5 : 3

          return (
            <g key={id}>
              {/* Pulsing ring for active */}
              {isActive && (
                <motion.circle
                  cx={28}
                  cy={cy}
                  r={10}
                  fill="none"
                  stroke={toneColor}
                  strokeWidth={1}
                  initial={{ opacity: 0.8, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              {/* Node circle — pointer-events active */}
              <circle
                cx={28}
                cy={cy}
                r={r}
                fill={isActive ? toneColor : 'rgba(255,255,255,0.15)'}
                stroke={toneColor}
                strokeWidth={1}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleNodeClick(id)}
              />
            </g>
          )
        })}

        {/* Query pulse dot */}
        <circle
          cx={28}
          cy={pulseY}
          r={4}
          fill={activeToneColor}
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
          filter="url(#v1-pulse-glow)"
        />
        <defs>
          <filter id="v1-pulse-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Hover label — rendered outside SVG so we can use HTML */}
      {hoveredIndex !== null && (
        <div
          style={{
            position: 'absolute',
            left: 44,
            top: nodePositions[hoveredIndex] - 10,
            pointerEvents: 'none',
            background: 'rgba(12,14,16,0.9)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 4,
            padding: '3px 8px',
            fontFamily: 'monospace',
            fontSize: 9,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.75)',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}
        >
          {SECTION_LABELS[sectionIds[hoveredIndex]] ?? sectionIds[hoveredIndex]}
        </div>
      )}
    </div>
  )
}
