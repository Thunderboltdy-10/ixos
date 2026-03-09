'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const BOOT_QUERY = 'authentication token refresh'

const BOOT_RESULTS = [
  { file: 'middleware/jwt.ts', score: 0.97 },
  { file: 'auth/session.ts', score: 0.94 },
  { file: 'lib/tokens.ts', score: 0.91 },
  { file: 'api/refresh.ts', score: 0.88 },
  { file: 'hooks/useAuth.ts', score: 0.85 },
  { file: 'services/auth.ts', score: 0.82 },
  { file: 'utils/crypto.ts', score: 0.79 },
  { file: 'config/auth.ts', score: 0.76 },
  { file: 'types/session.ts', score: 0.73 },
  { file: 'lib/session.ts', score: 0.7 },
]

export function V4Loader({ onComplete }: { onComplete: () => void }) {
  const [visibleRows, setVisibleRows] = useState(0)
  const [filesScanned, setFilesScanned] = useState(0)
  const [status, setStatus] = useState<'indexing' | 'ready'>('indexing')
  const [opacity, setOpacity] = useState(1)
  const [pointerEvents, setPointerEvents] = useState<'auto' | 'none'>('auto')

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([])

  const visibleList = useMemo(() => BOOT_RESULTS.slice(0, visibleRows), [visibleRows])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete()
      return
    }

    const addTimeout = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms)
      timersRef.current.push(id)
      return id
    }

    const rowInterval = setInterval(() => {
      setVisibleRows((v) => {
        if (v >= BOOT_RESULTS.length) {
          clearInterval(rowInterval)
          return v
        }
        return v + 1
      })
    }, 46)
    intervalsRef.current.push(rowInterval)

    const scanInterval = setInterval(() => {
      setFilesScanned((v) => {
        if (v >= 312) {
          clearInterval(scanInterval)
          return 312
        }
        const next = v + Math.max(12, Math.round((312 - v) * 0.26))
        return next > 312 ? 312 : next
      })
    }, 42)
    intervalsRef.current.push(scanInterval)

    addTimeout(640, () => setStatus('ready'))

    addTimeout(1040, () => {
      setOpacity(0)
      setPointerEvents('none')
    })

    addTimeout(1360, () => onComplete())
    addTimeout(2500, () => onComplete()) // Fallback guard

    return () => {
      timersRef.current.forEach(clearTimeout)
      intervalsRef.current.forEach(clearInterval)
      timersRef.current = []
      intervalsRef.current = []
    }
  }, [onComplete])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: '#0B0E12',
        opacity,
        pointerEvents,
        transition: 'opacity 320ms ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 'min(1080px, 100%)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(6,8,11,0.92)',
          boxShadow: '0 50px 100px rgba(0,0,0,0.5), 0 0 120px rgba(45,212,191,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 42,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.46)' }}>
            IXOS DESKTOP
          </span>
          <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, color: status === 'ready' ? '#2DD4BF' : '#F59E0B' }}>
            {status === 'ready' ? 'results ready' : `scanning ${filesScanned} files...`}
          </span>
        </div>

        <div style={{ padding: 14 }}>
          <div
            style={{
              height: 46,
              borderRadius: 8,
              border: '1px solid rgba(45,212,191,0.35)',
              background: 'rgba(10,14,18,0.85)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 12px',
              marginBottom: 10,
            }}
          >
            <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              query
            </span>
            <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 13, color: '#F3F5F7' }}>{BOOT_QUERY}</span>
            <span
              style={{
                marginLeft: 'auto',
                borderRadius: 999,
                border: '1px solid rgba(45,212,191,0.4)',
                background: 'rgba(45,212,191,0.16)',
                color: '#2DD4BF',
                fontFamily: 'var(--font-ixo-mono)',
                fontSize: 10,
                padding: '4px 10px',
              }}
            >
              Flash
            </span>
          </div>

          <div
            style={{
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            {visibleList.map((row, i) => (
              <div
                key={row.file}
                style={{
                  height: 36,
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr auto',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0 12px',
                  borderBottom: i === visibleList.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  background: i === 0 ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.015)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 12, color: 'rgba(243,245,247,0.9)' }}>{row.file}</span>
                <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 11, color: '#2DD4BF' }}>{row.score.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>
              {'lexical -> semantic -> lock'}
            </span>
            <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, color: 'rgba(45,212,191,0.9)' }}>
              7ms load | local-first
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
