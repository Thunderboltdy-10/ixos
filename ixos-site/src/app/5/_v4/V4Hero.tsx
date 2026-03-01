'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SearchSurface } from '@ixos/ixos-ui'
import { usePulse } from './hooks/usePulse'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import type { IxosSearchResult } from '@ixos/ixos-ui'

type Phase = 'typing' | 'local' | 'deep' | 'locked'
type Quality = 'flash' | 'auto' | 'pro'
type Mode = 'memory' | 'local' | 'deep'

const QUERY = 'authentication token refresh'

// Cap to exactly 3 results for a clean desktop preview mockup
const LOCAL_ROWS: IxosSearchResult[] = [
  { id: 'auth/session.ts', path: 'src/auth/session.ts', title: 'session.ts', snippet: 'export class SessionManager {\n  async validateToken(token: string) {}', score: 0.87, lexicalScore: 0.82, semanticScore: 0.74, matchedLineNumber: 22 },
  { id: 'middleware/jwt.ts', path: 'src/middleware/jwt.ts', title: 'jwt.ts', snippet: 'export function verifyJWT(token) {\n  return jwt.verify(token, secret)\n}', score: 0.82, lexicalScore: 0.85, semanticScore: 0.65, matchedLineNumber: 42 },
  { id: 'lib/tokens.ts', path: 'src/lib/tokens.ts', title: 'tokens.ts', snippet: 'export const generateToken = () => {\n  return "token"\n}', score: 0.79, lexicalScore: 0.6, semanticScore: 0.8, matchedLineNumber: 15 },
]

const DEEP_ROWS: IxosSearchResult[] = [
  {
    id: 'middleware/jwt.ts',
    path: 'src/middleware/jwt.ts',
    title: 'jwt.ts',
    snippet: 'export function refreshToken(token: string): Promise<TokenPair> {\n  const decoded = verify(token, process.env.JWT_SECRET);\n  return generatePair(decoded.sub);\n}',
    score: 0.97,
    lexicalScore: 0.85,
    semanticScore: 0.94,
    boostScore: 0.05,
    matchedLineNumber: 42,
    rationale: 'Direct match: token refresh function with JWT verification pattern.'
  },
  {
    id: 'auth/session.ts',
    path: 'src/auth/session.ts',
    title: 'session.ts',
    snippet: 'class TokenManager {\n  async rotate(userId: string): Promise<void> {\n    const current = await this.store.get(userId);\n    await this.invalidate(current);\n  }',
    score: 0.94,
    lexicalScore: 0.82,
    semanticScore: 0.96,
    matchedLineNumber: 15,
    rationale: 'Semantic match: token rotation logic with invalidation and re-issuance.'
  },
  {
    id: 'lib/tokens.ts',
    path: 'src/lib/tokens.ts',
    title: 'tokens.ts',
    snippet: 'export const tokenConfig = {\n  expiresIn: "1h",\n  refreshIn: "7d"\n}',
    score: 0.91,
    lexicalScore: 0.6,
    semanticScore: 0.85,
    matchedLineNumber: 12,
  },
]

export function V4Hero() {
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()
  const shellRef = useRef<HTMLDivElement>(null)

  const [loop, setLoop] = useState(0)
  const [typedChars, setTypedChars] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')
  const [quality, setQuality] = useState<Quality>('auto')
  const [mode, setMode] = useState<Mode>('local')
  const [visibleRows, setVisibleRows] = useState<IxosSearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))

    t(0, () => {
      setTypedChars(0)
      setPhase('typing')
      setQuality('auto')
      setMode('local')
      setVisibleRows([])
      setSelectedIndex(0)
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
      setSelectedIndex(0)
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
  const isSearching = phase === 'local' || phase === 'deep'
  
  const pipelineStats = useMemo(() => {
    if (phase === 'typing') return { stage: 'waiting' }
    if (phase === 'local') return { stage: 'lexical', filesScanned: 312, candidates: 24, scanTrail: ['src/auth/session.ts', 'src/middleware/jwt.ts'] }
    if (phase === 'deep') return { stage: 'semantic', filesScanned: 312, candidates: 47, embedded: 47, cacheHits: 28, scanTrail: ['src/lib/tokens.ts'] }
    return { stage: 'locked', filesScanned: 312, candidates: 47, embedded: 47, cacheHits: 28 }
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

      <div style={{ width: 'min(1300px, calc(100vw - 24px))', margin: '0 auto', position: 'relative', zIndex: 2 }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              style={{
                margin: 0,
                fontFamily: 'var(--font-ixo-heading)',
                fontSize: 'clamp(2.8rem, 5.5vw, 4.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.04em',
                color: '#F3F5F7',
                // Amber glow on the whole headline for depth
                filter: 'drop-shadow(0 0 24px rgba(246,185,76,0.35))',
              }}
            >
              Desktop search,{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #F6B94C 0%, #F59E0B 60%, #7C3AED 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  // Extra amber glow on the accent span
                  filter: 'drop-shadow(0 0 32px rgba(246,185,76,0.6))',
                }}
              >
                fully cinematic.
              </span>
            </motion.h1>
            <p
              style={{
                margin: '20px auto 0',
                fontFamily: 'var(--font-ixo-heading)',
                fontSize: 18,
                lineHeight: 1.6,
                color: 'rgba(243,245,247,0.64)',
              }}
            >
              Flash, Auto, Pro and Memory, Local, Deep Search are shown in the exact desktop interaction language while results
              stream, rerank, and lock with evidence.
            </p>
          </div>

          {/* KPI strip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginTop: 0, paddingTop: 20, paddingBottom: 0 }}>
            {[
              { value: '100%', label: 'Local-First' },
              { value: '0 B', label: 'Data Sent' },
              { value: '<800ms', label: 'Search Latency' },
              { value: '250+', label: 'Tests Passed' },
            ].map(({ value, label }) => (
              <div
                key={label}
                style={{
                  textAlign: 'center',
                  padding: '14px 20px',
                  borderRadius: 12,
                  // 3D glassmorphic card — shadow displaced top-left
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.1) 100%)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderTop: '1px solid rgba(255,255,255,0.18)',
                  borderLeft: '1px solid rgba(255,255,255,0.14)',
                  boxShadow: '-8px -8px 24px rgba(0,0,0,0.65), 4px 4px 16px rgba(246,185,76,0.06)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = 'translateY(-2px) translateZ(4px)'
                  el.style.boxShadow = '-5px -5px 18px rgba(0,0,0,0.55), 6px 6px 20px rgba(246,185,76,0.1)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = ''
                  el.style.boxShadow = '-8px -8px 24px rgba(0,0,0,0.65), 4px 4px 16px rgba(246,185,76,0.06)'
                }}
              >
                <div style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', fontFamily: 'var(--font-ixo-heading)', fontWeight: 700, color: '#F6B94C', letterSpacing: '-0.02em' }}>{value}</div>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-ixo-mono)', color: 'rgba(243,245,247,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            {/* Dramatic bottom-right amber glow behind card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              style={{
                position: 'absolute',
                top: 24,
                left: 24,
                right: -24,
                bottom: -24,
                background: 'linear-gradient(135deg, rgba(246,185,76,0.28) 0%, rgba(124,58,237,0.14) 100%)',
                filter: 'blur(48px)',
                borderRadius: 28,
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />
            {/* Top-left highlight halo (mimics displaced light from 3D lift) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              style={{
                position: 'absolute',
                top: -16,
                left: -16,
                right: '40%',
                bottom: '40%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 100%)',
                filter: 'blur(20px)',
                borderRadius: 28,
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />

            <motion.div
              ref={shellRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                borderRadius: 18,
                // Glassmorphic 3D card — shadow top-left, amber glow bottom-right
                border: '1px solid rgba(255,255,255,0.12)',
                borderTop: '1px solid rgba(255,255,255,0.2)',
                borderLeft: '1px solid rgba(255,255,255,0.16)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.12) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: [
                  '-16px -16px 48px rgba(0,0,0,0.8)',           // dark top-left shadow (3D lift)
                  '8px 8px 32px rgba(246,185,76,0.12)',          // amber glow bottom-right
                  '0 0 60px rgba(246,185,76,0.08)',              // ambient amber
                  'inset 0 1px 1px rgba(255,255,255,0.08)',      // inner top highlight
                  'inset -1px -1px 0 rgba(0,0,0,0.2)',          // inner bottom-right shadow
                ].join(', '),
                // Fixed height container — no overflow scroll in preview
                height: 480,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 1,
              }}
            >
            {/* Window chrome bar */}
            <div style={{
              height: 40,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              background: 'rgba(255,255,255,0.025)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', boxShadow: '0 0 6px rgba(255,95,86,0.5)' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e', boxShadow: '0 0 6px rgba(255,189,46,0.4)' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f', boxShadow: '0 0 6px rgba(39,201,63,0.4)' }} />
              </div>
              <div style={{ margin: '0 auto', fontSize: 11, fontFamily: 'var(--font-ixo-mono)', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>
                IXOS — DESKTOP PREVIEW
              </div>
            </div>
            {/* Content area — scale down to fit, clipping overflow */}
            <div style={{
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                transform: 'scale(0.72)',
                transformOrigin: 'top left',
                width: `${100 / 0.72}%`,
                height: `${100 / 0.72}%`,
                padding: '20px 28px',
                overflowY: 'hidden',
              }}>
                <SearchSurface
                  query={query}
                  mode={quality}
                  interactive={false}
                  isSearching={isSearching}
                  results={visibleRows}
                  selectedIndex={selectedIndex}
                  onSelectResult={setSelectedIndex}
                  pipelineStats={pipelineStats}
                  directoryLabel="~/projects/myapp"
                  showInlineRunButton={false}
                />
              </div>
            </div>
          </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
