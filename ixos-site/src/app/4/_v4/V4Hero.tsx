"use client";

import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Layers, Lock, Shield, Sparkles, Zap } from 'lucide-react'
import { SearchBar } from '@ixos/ui'
import { usePulse } from './hooks/usePulse'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'

type Phase = 'typing' | 'local' | 'deep' | 'locked'
type Quality = 'flash' | 'auto' | 'pro'
type Mode = 'memory' | 'local' | 'deep'

type Row = {
  id: string
  filename: string
  directory: string
  score: number
}

const QUERY = 'authentication token refresh'

const LOCAL_ROWS: Row[] = [
  { id: 'auth/session.ts', filename: 'session.ts', directory: 'auth', score: 0.87 },
  { id: 'middleware/jwt.ts', filename: 'jwt.ts', directory: 'middleware', score: 0.82 },
  { id: 'lib/tokens.ts', filename: 'tokens.ts', directory: 'lib', score: 0.79 },
  { id: 'api/refresh.ts', filename: 'refresh.ts', directory: 'api', score: 0.74 },
  { id: 'hooks/useAuth.ts', filename: 'useAuth.ts', directory: 'hooks', score: 0.71 },
  { id: 'utils/crypto.ts', filename: 'crypto.ts', directory: 'utils', score: 0.64 },
]

const DEEP_ROWS: Row[] = [
  { id: 'middleware/jwt.ts', filename: 'jwt.ts', directory: 'middleware', score: 0.97 },
  { id: 'auth/session.ts', filename: 'session.ts', directory: 'auth', score: 0.94 },
  { id: 'lib/tokens.ts', filename: 'tokens.ts', directory: 'lib', score: 0.91 },
  { id: 'api/refresh.ts', filename: 'refresh.ts', directory: 'api', score: 0.88 },
  { id: 'hooks/useAuth.ts', filename: 'useAuth.ts', directory: 'hooks', score: 0.85 },
  { id: 'utils/crypto.ts', filename: 'crypto.ts', directory: 'utils', score: 0.79 },
]

function tone(phase: Phase): string {
  if (phase === 'deep') return '#7C3AED'
  if (phase === 'locked') return '#14B8A6'
  return '#F59E0B'
}

function modeTone(mode: Mode): string {
  if (mode === 'deep') return '#7C3AED'
  if (mode === 'local') return '#14B8A6'
  return '#F6B94C'
}

function qualityTone(quality: Quality): string {
  if (quality === 'pro') return '#7C5CFF'
  if (quality === 'auto') return '#14B8A6'
  return '#F6B94C'
}

export function V4Hero() {
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()
  const shellRef = useRef<HTMLDivElement>(null)

  const [loop, setLoop] = useState(0)
  const [typedChars, setTypedChars] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')
  const [quality, setQuality] = useState<Quality>('auto')
  const [mode, setMode] = useState<Mode>('local')
  const [visibleRows, setVisibleRows] = useState<Row[]>([])
  const [selectedId, setSelectedId] = useState('middleware/jwt.ts')

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))

    t(0, () => {
      setTypedChars(0)
      setPhase('typing')
      setQuality('auto')
      setMode('local')
      setVisibleRows([])
      setSelectedId('middleware/jwt.ts')
    })

    QUERY.split('').forEach((_, i) => t(35 * (i + 1), () => setTypedChars(i + 1)))

    t(1200, () => {
      setPhase('local')
      setVisibleRows(LOCAL_ROWS)
      const rect = shellRef.current?.getBoundingClientRect()
      if (rect) pulse(rect.left + rect.width * 0.35, rect.top + rect.height * 0.4, 0.9)
    })

    t(2600, () => {
      setPhase('deep')
      setMode('deep')
      setQuality('pro')
      setVisibleRows(DEEP_ROWS)
      setSelectedId('middleware/jwt.ts')
      const rect = shellRef.current?.getBoundingClientRect()
      if (rect) pulse(rect.left + rect.width * 0.66, rect.top + rect.height * 0.48, 0.9)
    })

    t(4200, () => {
      setPhase('locked')
      setMode('local')
      setQuality('auto')
      const rect = shellRef.current?.getBoundingClientRect()
      if (rect) pulse(rect.left + rect.width * 0.5, rect.top + rect.height * 0.52, 0.6)
    })

    t(7800, () => setLoop((n) => n + 1))
    return () => timers.forEach(clearTimeout)
  }, [loop, pulse])

  const query = QUERY.slice(0, typedChars)
  const currentRows = visibleRows.length > 0 ? visibleRows : LOCAL_ROWS
  const currentColor = tone(phase)
  const selectedRow = currentRows.find((r) => r.id === selectedId) || currentRows[0]

  const qualityButtons: Array<{ id: Quality; label: string; icon: JSX.Element }> = [
    { id: 'flash', label: 'Flash', icon: <Zap size={12} /> },
    { id: 'auto', label: 'Auto', icon: <Sparkles size={12} /> },
    { id: 'pro', label: 'Pro', icon: <Layers size={12} /> },
  ]
  const modeButtons: Array<{ id: Mode; label: string; icon: JSX.Element }> = [
    { id: 'memory', label: 'Memory', icon: <Zap size={12} /> },
    { id: 'local', label: 'Local', icon: <Shield size={12} /> },
    { id: 'deep', label: 'Deep', icon: <Lock size={12} /> },
  ]

  const phaseText = useMemo(() => {
    if (phase === 'typing') return 'waiting for query'
    if (phase === 'local') return 'local search scanning'
    if (phase === 'deep') return 'deep search reranking'
    return 'why matched ready'
  }, [phase])

  return (
    <section
      data-section="hero"
      id="hero"
      style={{
        minHeight: '100dvh',
        paddingTop: 104,
        paddingBottom: 84,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(243,245,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(243,245,247,0.03) 1px, transparent 1px)',
          backgroundSize: '84px 84px',
        }}
      />

      <div style={{ width: 'min(1220px, calc(100vw - 24px))', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{ marginBottom: 18 }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-ixo-mono)',
              fontSize: 10,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'rgba(243,245,247,0.52)',
            }}
          >
            Desktop Search Preview
          </p>
        </div>

        <div style={{ display: 'grid', gap: 22 }}>
          <motion.div
            ref={shellRef}
            animate={
              lowEnd
                ? undefined
                : phase === 'deep'
                  ? { rotateX: 0.9, rotateY: -1.3, y: -4 }
                  : phase === 'locked'
                    ? { rotateX: 0, rotateY: 0, y: 0 }
                    : { rotateX: -0.6, rotateY: 0.8, y: 0 }
            }
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              transformStyle: 'preserve-3d',
              borderRadius: 14,
              borderTop: `1px solid ${currentColor}77`,
              borderRight: `1px solid ${currentColor}55`,
              borderBottom: `1px solid ${currentColor}55`,
              borderLeft: `3px solid ${currentColor}`,
              background: 'rgba(21,23,27,0.82)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: `0 0 26px ${currentColor}28, 0 28px 72px rgba(0,0,0,0.34)`,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 12px 8px' }}>
              <div
                style={{
                  borderRadius: 10,
                  border: `1px solid ${currentColor}66`,
                  background: 'rgba(27,30,35,0.86)',
                  overflow: 'hidden',
                }}
              >
                <SearchBar
                  value={query}
                  onChange={() => undefined}
                  isSearching={phase === 'local' || phase === 'deep'}
                  placeholder="Type what you remember..."
                  tone={mode === 'deep' ? 'journalist' : mode === 'memory' ? 'jit' : 'cache'}
                  withFrame={false}
                  showClear={false}
                  autoFocus={false}
                  rightSlot={
                    <div
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${currentColor}55`,
                        background: `${currentColor}22`,
                        fontFamily: 'var(--font-ixo-mono)',
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: currentColor,
                        padding: '3px 10px',
                      }}
                    >
                      {phase === 'typing' ? 'ready' : phase === 'locked' ? 'locked' : 'running'}
                    </div>
                  }
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: 8,
                    alignItems: 'center',
                    padding: '0 10px 10px',
                  }}
                >
                  <div
                    style={{
                      height: 34,
                      borderRadius: 8,
                      border: '1px solid rgba(243,245,247,0.1)',
                      background: 'rgba(14,17,23,0.76)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      fontFamily: 'var(--font-ixo-mono)',
                      fontSize: 11,
                      color: 'rgba(243,245,247,0.58)',
                    }}
                  >
                    C:\Users\pablo\Downloads\Ixos
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    {qualityButtons.map((button) => {
                      const selected = quality === button.id
                      const color = qualityTone(button.id)
                      return (
                        <button
                          key={button.id}
                          type="button"
                          onClick={() => setQuality(button.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            height: 30,
                            borderRadius: 7,
                            border: `1px solid ${selected ? `${color}88` : 'rgba(243,245,247,0.12)'}`,
                            background: selected ? `${color}26` : 'rgba(243,245,247,0.03)',
                            color: selected ? color : 'rgba(243,245,247,0.55)',
                            padding: '0 9px',
                            fontFamily: 'var(--font-ixo-mono)',
                            fontSize: 10,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {button.icon}
                          {button.label}
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    {modeButtons.map((button) => {
                      const selected = mode === button.id
                      const color = modeTone(button.id)
                      return (
                        <button
                          key={button.id}
                          type="button"
                          onClick={() => setMode(button.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            height: 30,
                            borderRadius: 7,
                            border: `1px solid ${selected ? `${color}88` : 'rgba(243,245,247,0.12)'}`,
                            background: selected ? `${color}26` : 'rgba(243,245,247,0.03)',
                            color: selected ? color : 'rgba(243,245,247,0.55)',
                            padding: '0 9px',
                            fontFamily: 'var(--font-ixo-mono)',
                            fontSize: 10,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {button.icon}
                          {button.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid rgba(243,245,247,0.08)',
                borderBottom: '1px solid rgba(243,245,247,0.08)',
                padding: '10px 12px',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-ixo-mono)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: currentColor,
                }}
              >
                {phaseText}
              </span>
              <div style={{ height: 2, borderRadius: 2, background: 'rgba(243,245,247,0.1)' }}>
                <motion.div
                  animate={{
                    width:
                      phase === 'typing' ? '10%' : phase === 'local' ? '42%' : phase === 'deep' ? '76%' : '100%',
                  }}
                  transition={{ duration: 0.32, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 2, background: currentColor }}
                />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-ixo-mono)',
                  fontSize: 10,
                  color: 'rgba(243,245,247,0.54)',
                }}
              >
                312 files
              </span>
            </div>

            <div style={{ padding: 10 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                {currentRows.map((row, i) => {
                  const selected = row.id === selectedId
                  return (
                    <motion.button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.24, delay: i * 0.02 }}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        borderRadius: 8,
                        borderLeft: selected ? `3px solid ${currentColor}` : '3px solid transparent',
                        borderTop: `1px solid ${selected ? `${currentColor}55` : 'rgba(243,245,247,0.08)'}`,
                        borderRight: `1px solid ${selected ? `${currentColor}55` : 'rgba(243,245,247,0.08)'}`,
                        borderBottom: `1px solid ${selected ? `${currentColor}55` : 'rgba(243,245,247,0.08)'}`,
                        background: selected
                          ? `linear-gradient(120deg, ${currentColor}22 0%, rgba(27,30,35,0.86) 100%)`
                          : 'rgba(243,245,247,0.02)',
                        padding: '9px 10px',
                        display: 'grid',
                        gridTemplateColumns: '16px 14px 1fr auto auto',
                        alignItems: 'center',
                        gap: 9,
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, color: 'rgba(243,245,247,0.38)' }}>
                        {i + 1}
                      </span>
                      <FileText size={13} color={selected ? currentColor : 'rgba(243,245,247,0.45)'} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-ixo-mono)',
                            fontSize: 12,
                            color: 'rgba(243,245,247,0.86)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.filename}
                        </div>
                        <div style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, color: 'rgba(243,245,247,0.45)' }}>
                          {row.directory}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 11, color: currentColor }}>
                        {Math.round(row.score * 100)}%
                      </span>
                      <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, color: 'rgba(243,245,247,0.42)' }}>
                        {'>'}
                      </span>
                    </motion.button>
                  )
                })}
              </div>

              <AnimatePresence>
                {phase === 'locked' && selectedRow && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      overflow: 'hidden',
                      marginTop: 8,
                      borderRadius: 8,
                      border: '1px solid rgba(20,184,166,0.32)',
                      background: 'rgba(20,184,166,0.12)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, letterSpacing: '0.12em', color: '#14B8A6', textTransform: 'uppercase' }}>
                      Why this matched
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontFamily: 'var(--font-ixo-mono)',
                        fontSize: 11,
                        lineHeight: 1.6,
                        color: 'rgba(243,245,247,0.76)',
                      }}
                    >
                      <span style={{ color: 'rgba(243,245,247,0.3)' }}>23: </span>
                      <span style={{ color: '#14B8A6' }}>const</span> refreshed = <span style={{ color: '#F59E0B' }}>await</span>{' '}
                      refreshToken(payload.sub)
                      <br />
                      <span style={{ color: 'rgba(243,245,247,0.3)' }}>47: </span>
                      return {`{ token, expiresAt: Date.now() + TTL }`}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              style={{
                margin: 0,
                fontFamily: 'var(--font-ixo-heading)',
                fontSize: 'clamp(2.4rem, 5.3vw, 4rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.04em',
                color: '#F3F5F7',
              }}
            >
              Desktop search,{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #14B8A6 0%, #7C3AED 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                fully cinematic.
              </span>
            </motion.h1>
            <p
              style={{
                margin: 0,
                maxWidth: 760,
                fontFamily: 'var(--font-ixo-heading)',
                fontSize: 16,
                lineHeight: 1.6,
                color: 'rgba(243,245,247,0.64)',
              }}
            >
              Flash, Auto, Pro and Memory, Local, Deep Search are shown in the exact desktop interaction language while results
              stream, rerank, and lock with evidence.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
