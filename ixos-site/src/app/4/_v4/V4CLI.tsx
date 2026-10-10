"use client";

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

// ─── Command data ─────────────────────────────────────────────────────────────

interface TerminalLine {
  type: 'prompt' | 'output-file' | 'output-meta' | 'output-elapsed' | 'blank'
  content: string
  score?: string
}

interface Command {
  id: number
  prompt: string
  lines: TerminalLine[]
}

const COMMANDS: Command[] = [
  {
    id: 0,
    prompt: 'ixos search "auth token refresh handler" --dir ./src',
    lines: [
      { type: 'output-meta', content: 'Scanning 1,024 files...' },
      { type: 'output-file', content: '  1  middleware/jwt.ts', score: '0.97' },
      { type: 'output-file', content: '  2  auth/session.ts', score: '0.94' },
      { type: 'output-file', content: '  3  lib/tokens.ts', score: '0.91' },
      { type: 'output-file', content: '  4  api/refresh.ts', score: '0.88' },
      { type: 'output-elapsed', content: 'elapsed: 29ms' },
    ],
  },
  {
    id: 1,
    prompt: 'ixos search "database connection pool" --cache-mode native-cache --show-scores',
    lines: [
      { type: 'output-meta', content: 'Using Local Search cache (NTFS ADS / xattr) - 312 entries' },
      { type: 'output-file', content: '  1  lib/db.ts', score: '0.96' },
      { type: 'output-file', content: '  2  config/database.ts', score: '0.93' },
      { type: 'output-file', content: '  3  utils/pool.ts', score: '0.89' },
      { type: 'output-file', content: '  4  services/postgres.ts', score: '0.85' },
      { type: 'output-elapsed', content: 'elapsed: 12ms (cached)' },
    ],
  },
  {
    id: 2,
    prompt: 'ixos search "error handling patterns" --progressive --json',
    lines: [
      { type: 'output-file', content: '{"file":"middleware/errors.ts"', score: '"score":0.98}' },
      { type: 'output-file', content: '{"file":"utils/catchAsync.ts"', score: '"score":0.94}' },
      { type: 'output-file', content: '{"file":"lib/errorBoundary.tsx"', score: '"score":0.90}' },
      { type: 'output-file', content: '{"file":"hooks/useError.ts"', score: '"score":0.86}' },
      { type: 'output-elapsed', content: 'elapsed: 18ms' },
    ],
  },
]

// ─── Flag reference ───────────────────────────────────────────────────────────

const FLAGS = [
  { flag: '--dir <path>', desc: 'Search directory' },
  { flag: '--stub-model', desc: 'Fast mode, no model download' },
  { flag: '--cache-mode native-cache', desc: 'Local Search cache (NTFS ADS / xattr)' },
  { flag: '--show-scores', desc: 'Display similarity scores' },
  { flag: '--progressive', desc: 'Stream results progressively' },
  { flag: '--json', desc: 'Machine-readable output' },
  { flag: '--secure-timing', desc: 'Opt-in timing attack protection' },
  { flag: '--journalist-mode', desc: 'Deep Search evidence path' },
]

// ─── Terminal state machine ────────────────────────────────────────────────────

type Phase = 'typing' | 'executing' | 'output' | 'hold' | 'clear'

interface TerminalState {
  cmdIndex: number
  phase: Phase
  typedChars: number
  outputLines: number
}

// ─── Terminal output line renderer ───────────────────────────────────────────

function TerminalLine({ line, index, visible }: { line: TerminalLine; index: number; visible: boolean }) {
  if (!visible) return null

  if (line.type === 'output-file') {
    return (
      <div className="font-mono" style={{ fontSize: 12, lineHeight: '1.9', display: 'flex', gap: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', flex: 1 }}>{line.content}</span>
        {line.score && (
          <span style={{ color: '#2DD4BF', minWidth: 36, textAlign: 'right' }}>{line.score}</span>
        )}
      </div>
    )
  }

  if (line.type === 'output-meta') {
    return (
      <div
        className="font-mono"
        style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: '1.9', letterSpacing: '0.01em' }}
      >
        {line.content}
      </div>
    )
  }

  if (line.type === 'output-elapsed') {
    return (
      <div
        className="font-mono"
        style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: '1.9', marginTop: 2 }}
      >
        {line.content}
      </div>
    )
  }

  return null
}

// ─── Blinking cursor ─────────────────────────────────────────────────────────

function Cursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: [0, 0, 1, 1] }}
      style={{
        display: 'inline-block',
        width: 2,
        height: '1em',
        background: '#2DD4BF',
        verticalAlign: 'text-bottom',
        marginLeft: 1,
      }}
    />
  )
}

// ─── Terminal panel ───────────────────────────────────────────────────────────

function TerminalPanel({ lowEnd }: { lowEnd: boolean }) {
  const [state, setState] = useState<TerminalState>({
    cmdIndex: 0,
    phase: 'typing',
    typedChars: 0,
    outputLines: 0,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const tick = useCallback(() => {
    const s = stateRef.current
    const cmd = COMMANDS[s.cmdIndex]

    if (s.phase === 'typing') {
      const nextChars = s.typedChars + 1
      if (nextChars >= cmd.prompt.length) {
        setState((prev) => ({ ...prev, typedChars: nextChars, phase: 'executing' }))
      } else {
        setState((prev) => ({ ...prev, typedChars: nextChars }))
      }
      return 22 // ms per char

    } else if (s.phase === 'executing') {
      setState((prev) => ({ ...prev, phase: 'output', outputLines: 0 }))
      return 200

    } else if (s.phase === 'output') {
      const nextLines = s.outputLines + 1
      if (nextLines >= cmd.lines.length) {
        setState((prev) => ({ ...prev, outputLines: nextLines, phase: 'hold' }))
        return 2600
      } else {
        setState((prev) => ({ ...prev, outputLines: nextLines }))
        return 100
      }

    } else if (s.phase === 'hold') {
      setState((prev) => ({ ...prev, phase: 'clear' }))
      return 200

    } else if (s.phase === 'clear') {
      const nextCmd = (s.cmdIndex + 1) % COMMANDS.length
      setState({ cmdIndex: nextCmd, phase: 'typing', typedChars: 0, outputLines: 0 })
      return 350
    }

    return 100
  }, [])

  useEffect(() => {
    if (lowEnd) {
      // In low-end mode show the first command fully static
      setState({ cmdIndex: 0, phase: 'hold', typedChars: COMMANDS[0].prompt.length, outputLines: COMMANDS[0].lines.length })
      return
    }

    let timeoutId: ReturnType<typeof setTimeout>

    function schedule(delay: number) {
      timeoutId = setTimeout(() => {
        const nextDelay = tick()
        schedule(nextDelay ?? 100)
      }, delay)
    }

    schedule(600)
    return () => clearTimeout(timeoutId)
  }, [lowEnd, tick])

  const cmd = COMMANDS[state.cmdIndex]
  const displayPrompt = state.phase === 'hold'
    ? cmd.prompt
    : cmd.prompt.slice(0, state.typedChars)

  const showOutputLines = state.phase === 'output' || state.phase === 'hold' || state.phase === 'clear'
  const showExecuting = state.phase === 'executing'

  return (
    <div
      style={{
        background: 'rgba(10,12,14,0.9)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        overflow: 'hidden',
        fontFamily: 'var(--font-ixo-mono, monospace)',
      }}
    >
      {/* Terminal header bar */}
      <div
        style={{
          height: 36,
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <div
              key={c}
              style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.3 }}
            />
          ))}
        </div>
        <span
          className="font-mono"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.05em',
          }}
        >
          ixos
        </span>
      </div>

      {/* Terminal body */}
      <div style={{ padding: '16px 20px', minHeight: 220 }}>
        {/* Prompt line */}
        <div className="font-mono" style={{ fontSize: 12, lineHeight: '1.9', display: 'flex', alignItems: 'baseline' }}>
          <span style={{ color: '#2DD4BF', marginRight: 8, flexShrink: 0 }}>$</span>
          <span style={{ color: '#F3F5F7' }}>{displayPrompt}</span>
          {(state.phase === 'typing' || state.phase === 'executing') && <Cursor />}
        </div>

        {/* Executing indicator */}
        {showExecuting && (
          <div className="font-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: '1.9' }}>
            <Cursor />
          </div>
        )}

        {/* Output lines */}
        {showOutputLines && (
          <div style={{ marginTop: 4 }}>
            {cmd.lines.map((line, i) => (
              <TerminalLine
                key={`${state.cmdIndex}-${i}`}
                line={line}
                index={i}
                visible={i < state.outputLines}
              />
            ))}
            {state.phase === 'hold' && <Cursor />}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function V4CLI() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (lowEnd) return
    pulse(e.clientX, e.clientY, 0.35)
  }

  return (
    <div
      data-section="cli"
      id="cli"
      ref={sectionRef}
      onMouseEnter={handleMouseEnter}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: '#0C0E10', padding: '112px 0 144px' }}
      >
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          {/* Two-column layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 64,
              alignItems: 'start',
            }}
            className="md:grid"
          >
            {/* Left: Copy + flags */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <p
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.6)', marginBottom: 12 }}
              >
                Command-line interface
              </p>
              <h2
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
                Every feature.<br />One command.
              </h2>
              <p
                className="font-mono"
                style={{ fontSize: 13, color: 'rgba(243,245,247,0.4)', marginBottom: 36, lineHeight: 1.6 }}
              >
                The full power of Ixos from the command line.{' '}
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Source: CLAUDE.md</span>
              </p>

              {/* Flag reference */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <p
                  className="font-mono uppercase"
                  style={{ fontSize: 8, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)', marginBottom: 8 }}
                >
                  Flags
                </p>
                {FLAGS.map((f, i) => (
                  <motion.div
                    key={f.flag}
                    initial={{ opacity: 0, x: -10 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.2 + i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '4px 0' }}
                  >
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: '#2DD4BF',
                        opacity: 0.8,
                        minWidth: 200,
                        flexShrink: 0,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {f.flag}
                    </span>
                    <span
                      className="font-mono"
                      style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.01em' }}
                    >
                      {f.desc}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right: Terminal */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <TerminalPanel lowEnd={lowEnd} />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}

