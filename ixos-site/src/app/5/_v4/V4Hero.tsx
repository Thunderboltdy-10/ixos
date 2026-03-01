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

          <div style={{ position: 'relative' }}>
            {/* 3D Glass Shadow / Superposition effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              style={{
                position: 'absolute',
                inset: -4,
                top: 12,
                left: 12,
                right: -12,
                bottom: -12,
                background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
                filter: 'blur(32px)',
                borderRadius: 24,
                zIndex: 0,
                pointerEvents: 'none'
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              style={{
                position: 'absolute',
                inset: -2,
                top: -8,
                left: -8,
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
                filter: 'blur(16px)',
                borderRadius: 24,
                zIndex: 0,
                pointerEvents: 'none'
              }}
            />

            <motion.div
              ref={shellRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(6,8,11,0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 0 60px rgba(20, 184, 166, 0.1), 0 28px 72px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)',
                height: 600,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 1
              }}
            >
            {/* Window header */}
            <div style={{ height: 40, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
              </div>
              <div style={{ margin: '0 auto', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
                IXOS DESKTOP PREVIEW
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <SearchSurface
                query={query}
                mode={quality}
                interactive={false}
                isSearching={isSearching}
                results={visibleRows}
                selectedIndex={selectedIndex}
                onSelectResult={setSelectedIndex}
                pipelineStats={pipelineStats}
                directoryLabel="C:\Users\pablo\Downloads\Ixos"
                showInlineRunButton={true}
              />
            </div>
          </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
