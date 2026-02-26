'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

type AskStage = 'idle' | 'typing' | 'intent' | 'evidence' | 'answer'

const ASK_QUERY = 'Which middleware refreshes JWT tokens and where is TTL handled?'

const TOKENS = ['middleware', 'refresh', 'jwt', 'ttl']

const EVIDENCE = [
  { file: 'middleware/jwt.ts', line: '47-62', note: 'refreshToken(payload.sub) and expiresAt update' },
  { file: 'auth/session.ts', line: '21-39', note: 'session TTL normalization' },
  { file: 'lib/tokens.ts', line: '10-26', note: 'token mint and expiration helpers' },
] as const

const MODE_SEQUENCE = ['Flash', 'Auto', 'Pro'] as const

function useAskStoryboard(active: boolean, lowEnd: boolean) {
  const [stage, setStage] = useState<AskStage>(lowEnd ? 'answer' : 'idle')
  const [typedChars, setTypedChars] = useState(lowEnd ? ASK_QUERY.length : 0)
  const [modeIdx, setModeIdx] = useState(0)

  useEffect(() => {
    if (!active) return
    if (lowEnd) return

    const timers: ReturnType<typeof setTimeout>[] = []
    const add = (delay: number, fn: () => void) => {
      timers.push(setTimeout(fn, delay))
    }

    add(0, () => setStage('idle'))
    add(0, () => setTypedChars(0))
    add(0, () => setModeIdx(0))

    add(240, () => setStage('typing'))

    ASK_QUERY.split('').forEach((_, i) => {
      add(320 + i * 24, () => setTypedChars(i + 1))
    })

    add(1800, () => setStage('intent'))
    add(2800, () => setStage('evidence'))
    add(3700, () => setStage('answer'))

    add(2100, () => setModeIdx(1))
    add(2900, () => setModeIdx(2))

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [active, lowEnd])

  return {
    stage: lowEnd ? 'answer' : stage,
    typed: lowEnd ? ASK_QUERY : ASK_QUERY.slice(0, typedChars),
    mode: lowEnd ? MODE_SEQUENCE[0] : MODE_SEQUENCE[modeIdx],
  }
}

function ExtractionGraph({ stage }: { stage: AskStage }) {
  const ready = stage === 'intent' || stage === 'evidence' || stage === 'answer'

  return (
    <svg viewBox="0 0 360 120" width="100%" height="120" aria-label="Intent extraction graph">
      <defs>
        <linearGradient id="askEdge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(45,212,191,0.1)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0.45)" />
        </linearGradient>
      </defs>

      <line x1="52" y1="60" x2="178" y2="24" stroke="url(#askEdge)" strokeWidth="1.2" />
      <line x1="52" y1="60" x2="178" y2="96" stroke="url(#askEdge)" strokeWidth="1.2" />
      <line x1="178" y1="24" x2="314" y2="60" stroke="url(#askEdge)" strokeWidth="1.2" />
      <line x1="178" y1="96" x2="314" y2="60" stroke="url(#askEdge)" strokeWidth="1.2" />

      <circle cx="52" cy="60" r="10" fill="rgba(245,158,11,0.35)" stroke="rgba(245,158,11,0.7)" />
      <circle cx="178" cy="24" r="8" fill="rgba(45,212,191,0.22)" stroke="rgba(45,212,191,0.7)" />
      <circle cx="178" cy="96" r="8" fill="rgba(45,212,191,0.22)" stroke="rgba(45,212,191,0.7)" />
      <circle cx="314" cy="60" r="10" fill="rgba(124,58,237,0.25)" stroke="rgba(124,58,237,0.7)" />

      <text x="52" y="82" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.55)" style={{ fontFamily: 'var(--font-ixo-mono)' }}>
        query
      </text>
      <text x="178" y="14" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.55)" style={{ fontFamily: 'var(--font-ixo-mono)' }}>
        entity
      </text>
      <text x="178" y="116" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.55)" style={{ fontFamily: 'var(--font-ixo-mono)' }}>
        intent
      </text>
      <text x="314" y="82" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.55)" style={{ fontFamily: 'var(--font-ixo-mono)' }}>
        evidence
      </text>

      {ready && (
        <motion.circle
          cx={52}
          cy={60}
          r={3}
          fill="#2DD4BF"
          animate={{ cx: [52, 178, 314], cy: [60, 24, 60] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </svg>
  )
}

export function V4AskMode() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-100px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()
  const { stage, typed, mode } = useAskStoryboard(inView, lowEnd)

  const tokenVisible = stage === 'intent' || stage === 'evidence' || stage === 'answer'
  const evidenceVisible = stage === 'evidence' || stage === 'answer'
  const answerVisible = stage === 'answer'

  return (
    <div
      data-section="ask-mode"
      id="ask-mode"
      ref={sectionRef}
      onMouseEnter={(e) => {
        if (!lowEnd) pulse(e.clientX, e.clientY, 0.35)
      }}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section className="relative overflow-hidden" style={{ backgroundColor: '#0C0E10', padding: '108px 0 136px' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(80% 60% at 85% 20%, rgba(124,58,237,0.1), transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.25fr] gap-12 xl:gap-16 items-start">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: '0.28em', color: 'rgba(124,58,237,0.8)', marginBottom: 12 }}
              >
                Ask Mode
              </motion.p>

              <motion.h2
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.07 }}
                style={{
                  fontFamily: 'var(--font-ixo-heading)',
                  fontSize: 'clamp(2rem, 3.8vw, 3.1rem)',
                  lineHeight: 1.06,
                  letterSpacing: '-0.03em',
                  color: '#F3F5F7',
                  fontWeight: 700,
                  margin: '0 0 14px 0',
                }}
              >
                Ask a real question. Get cited evidence, not guesses.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.14 }}
                style={{
                  fontFamily: 'var(--font-ixo-heading)',
                  fontSize: 17,
                  lineHeight: 1.58,
                  color: 'rgba(243,245,247,0.58)',
                  margin: 0,
                  maxWidth: 520,
                }}
              >
                Intent extraction runs first, then ranked files provide evidence blocks. Ask mode preserves the selected search mode and does not silently force Pro.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.2 }}
                style={{
                  marginTop: 26,
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                  padding: 14,
                }}
              >
                <ExtractionGraph stage={stage} />
                <p className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', margin: '0 0 3px 0' }}>
                  Source: src/ixos_rank/ask_mode/intent_detector.rs
                </p>
                <p className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', margin: 0 }}>
                  Source: docs/product/DESKTOP_APP.md (Ask mode model selection contract)
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 14,
                background: 'rgba(11,14,19,0.9)',
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
              }}
            >
              <div
                style={{
                  height: 46,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '0 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)' }}>
                  QUESTION PIPELINE
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    color: mode === 'Pro' ? '#7C3AED' : mode === 'Auto' ? '#2DD4BF' : '#F59E0B',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 999,
                    padding: '3px 10px',
                  }}
                >
                  selected mode: {mode}
                </span>
              </div>

              <div style={{ padding: 16 }}>
                <div
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(6,8,11,0.8)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 12,
                  }}
                >
                  <span className="font-mono" style={{ fontSize: 12, color: '#F3F5F7' }}>
                    {typed}
                    {stage !== 'answer' && !lowEnd ? (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        style={{ color: '#2DD4BF', marginLeft: 2 }}
                      >
                        |
                      </motion.span>
                    ) : null}
                  </span>
                </div>

                <div style={{ minHeight: 44, display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {TOKENS.map((token, idx) => (
                    <motion.span
                      key={token}
                      initial={{ opacity: 0, y: 8 }}
                      animate={tokenVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                      transition={{ delay: 0.06 * idx, duration: 0.25 }}
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'rgba(124,58,237,0.9)',
                        border: '1px solid rgba(124,58,237,0.35)',
                        background: 'rgba(124,58,237,0.1)',
                        borderRadius: 999,
                        padding: '4px 10px',
                      }}
                    >
                      {token}
                    </motion.span>
                  ))}
                </div>

                <div
                  style={{
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 12,
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <p className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: '0 0 8px 0', letterSpacing: '0.14em' }}>
                    EVIDENCE CANDIDATES
                  </p>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {EVIDENCE.map((row, idx) => (
                      <motion.div
                        key={row.file}
                        initial={{ opacity: 0, x: -8 }}
                        animate={evidenceVisible ? { opacity: 1, x: 0 } : { opacity: 0.35, x: 0 }}
                        transition={{ delay: 0.06 * idx }}
                        className="font-mono"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: 8,
                          alignItems: 'baseline',
                          fontSize: 11,
                          color: 'rgba(243,245,247,0.72)',
                        }}
                      >
                        <span>{row.file}</span>
                        <span style={{ color: 'rgba(45,212,191,0.75)' }}>L{row.line}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={answerVisible ? { opacity: 1, y: 0 } : { opacity: 0.35, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    border: '1px solid rgba(45,212,191,0.3)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: 'rgba(45,212,191,0.08)',
                  }}
                >
                  <p className="font-mono" style={{ fontSize: 10, color: 'rgba(45,212,191,0.84)', margin: '0 0 6px 0', letterSpacing: '0.14em' }}>
                    ANSWER WITH CITATIONS
                  </p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-ixo-heading)', fontSize: 14, lineHeight: 1.5, color: 'rgba(243,245,247,0.82)' }}>
                    JWT refresh lives in <span style={{ color: '#2DD4BF' }}>middleware/jwt.ts</span> where token renewal and TTL write-back happen.
                  </p>
                  <p className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', margin: '8px 0 0 0' }}>
                    Confidence path: lexical plus semantic plus evidence chain
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
