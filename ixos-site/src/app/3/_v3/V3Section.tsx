'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { DemoSurface } from '../../../landing/DemoSurface'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface V3SectionProps {
  id: string
  rank: string
  file: string
  tone: 'cyan' | 'amber' | 'violet'
  title: string
  claim: string
  demoView: 'search' | 'today' | 'workstreams'
  demoQuery: string
  demoAutoRun: boolean
  featureBullets: string[]
  onInView?: (id: string) => void
}

// ─── Tone colors ──────────────────────────────────────────────────────────────

const TONE_COLORS: Record<string, string> = {
  cyan: '#2DD4BF',
  amber: '#F59E0B',
  violet: '#7C3AED',
}

// ─── V3Section ────────────────────────────────────────────────────────────────

export function V3Section({
  id,
  rank,
  file,
  tone,
  title,
  claim,
  demoView,
  demoQuery,
  demoAutoRun,
  featureBullets,
  onInView,
}: V3SectionProps) {
  const color = TONE_COLORS[tone] ?? '#2DD4BF'
  const score = Math.max(68, 98 - parseInt(rank, 10) * 1.5)
  const scoreWidth = Math.max(48, score * 0.8)

  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: false, margin: '-10% 0px -10% 0px' })

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [activeMode, setActiveMode] = useState<string>('auto')

  useEffect(() => {
    if (isInView) {
      onInView?.(id)
    }
  }, [isInView, id, onInView])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setCursorPos(null)
  }, [])

  const handleButtonClick = useCallback((mode: string) => {
    setActiveMode(mode)
    window.dispatchEvent(
      new CustomEvent('v4:pulse', {
        detail: {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          intensity: 0.8,
        },
      })
    )
  }, [])

  const borderOpacity = isInView ? '59' : '26' // hex: 35 = 0.21, 26 = 0.15 approx

  return (
    <div id={`section-${id}`}>
      <div
        ref={sectionRef}
        data-section-id={id}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          margin: '32px 0',
          padding: '20px 24px 24px',
          border: `1px solid ${color}${isInView ? '59' : '26'}`,
          borderRadius: 4,
          transition: 'border-color 0.4s',
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        {/* ── Corner brackets ────────────────────────────────────────────────── */}

        {/* Top-left */}
        <motion.div
          style={{
            position: 'absolute',
            top: -1,
            left: -1,
            width: 12,
            height: 12,
            borderTop: `1.5px solid ${color}`,
            borderLeft: `1.5px solid ${color}`,
            pointerEvents: 'none',
          }}
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />

        {/* Top-right */}
        <motion.div
          style={{
            position: 'absolute',
            top: -1,
            right: -1,
            width: 12,
            height: 12,
            borderTop: `1.5px solid ${color}`,
            borderRight: `1.5px solid ${color}`,
            pointerEvents: 'none',
          }}
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.05 }}
        />

        {/* Bottom-left */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: -1,
            left: -1,
            width: 12,
            height: 12,
            borderBottom: `1.5px solid ${color}`,
            borderLeft: `1.5px solid ${color}`,
            pointerEvents: 'none',
          }}
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
        />

        {/* Bottom-right */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 12,
            height: 12,
            borderBottom: `1.5px solid ${color}`,
            borderRight: `1.5px solid ${color}`,
            pointerEvents: 'none',
          }}
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.15 }}
        />

        {/* ── Top measurement ticks ───────────────────────────────────────────── */}
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={`tick-top-${i}`}
            style={{
              position: 'absolute',
              top: -1,
              left: `${10 + i * 8.5}%`,
              width: 1,
              height: i % 5 === 0 ? 5 : 3,
              background: color,
              opacity: 0.25,
              pointerEvents: 'none',
            }}
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ delay: 0.1 + i * 0.02 }}
          />
        ))}

        {/* Bottom measurement ticks */}
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={`tick-bottom-${i}`}
            style={{
              position: 'absolute',
              bottom: -1,
              left: `${10 + i * 8.5}%`,
              width: 1,
              height: i % 5 === 0 ? 5 : 3,
              background: color,
              opacity: 0.18,
              pointerEvents: 'none',
            }}
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ delay: 0.15 + i * 0.02 }}
          />
        ))}

        {/* ── Privacy LOCAL badge ──────────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            border: '1px solid rgba(45,212,191,0.3)',
            background: 'rgba(45,212,191,0.06)',
            padding: '3px 8px',
            borderRadius: 2,
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#2DD4BF',
            letterSpacing: '0.1em',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          LOCAL
        </div>

        {/* ── Cursor follow ring ──────────────────────────────────────────────── */}
        {cursorPos && (
          <div
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: `1px solid ${color}`,
              opacity: 0.25,
              left: cursorPos.x - 20,
              top: cursorPos.y - 20,
              transition: 'none',
            }}
          />
        )}

        {/* ── Top bar: rank + file + score tick ───────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            fontSize: 10,
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <span style={{ color, opacity: 0.7, flexShrink: 0 }}>
            SECTION {rank}
          </span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            title={file}
          >
            {file}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div
              style={{
                width: scoreWidth,
                height: 2,
                background: color,
                opacity: 0.5,
                borderRadius: 1,
              }}
            />
            <span style={{ color, fontSize: 9 }}>{score.toFixed(0)}</span>
          </div>
        </div>

        {/* ── Section title ────────────────────────────────────────────────────── */}
        <h2
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: 'white',
            margin: '0 0 8px',
            fontFamily: 'monospace',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        <div
          style={{
            height: 1,
            background: color,
            opacity: 0.2,
            margin: '0 0 12px',
          }}
        />

        {/* ── Claim ────────────────────────────────────────────────────────────── */}
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.65,
            margin: '0 0 20px',
            fontFamily: 'monospace',
          }}
        >
          {claim}
        </p>

        {/* ── Two-column layout ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
          }}
        >
          {/* Left: feature bullets + controls */}
          <div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 16px',
              }}
            >
              {featureBullets.map((b, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 8,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  <span style={{ color, flexShrink: 0 }}>→</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.25)',
                fontFamily: 'monospace',
                marginBottom: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              src: {file}
            </div>

            {/* Mode buttons for search sections */}
            {demoView === 'search' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {(['flash', 'auto', 'pro'] as const).map((m) => (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.94, y: 1 }}
                    onClick={() => handleButtonClick(m)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      letterSpacing: '0.08em',
                      background:
                        activeMode === m ? `${color}22` : 'transparent',
                      border: `1px solid ${
                        activeMode === m ? color : 'rgba(255,255,255,0.15)'
                      }`,
                      borderRadius: 3,
                      color:
                        activeMode === m ? color : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {m}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Tab buttons for today/workstreams sections */}
            {demoView !== 'search' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {(['today', 'workstreams'] as const).map((t) => (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.94, y: 1 }}
                    onClick={() => handleButtonClick(t)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      background:
                        activeMode === t ? `${color}22` : 'transparent',
                      border: `1px solid ${
                        activeMode === t ? color : 'rgba(255,255,255,0.15)'
                      }`,
                      borderRadius: 3,
                      color:
                        activeMode === t ? color : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Right: DemoSurface with subtle 3D tilt on hover */}
          <motion.div
            style={{ perspective: 1600 }}
            whileHover={{ rotateX: -3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div
              style={{
                transform: 'translateZ(0)',
                borderRadius: 6,
                overflow: 'hidden',
                border: `1px solid ${color}25`,
              }}
            >
              {isInView && (
                <DemoSurface
                  initialView={demoView}
                  initialQuery={demoQuery || 'authentication token refresh'}
                  autoRun={demoAutoRun}
                  style={{ height: 320 }}
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
