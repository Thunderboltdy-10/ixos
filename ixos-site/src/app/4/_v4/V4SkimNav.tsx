'use client'

import { useEffect, useMemo, useState } from 'react'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

const SECTION_ORDER = [
  { id: 'hero', label: 'Hero' },
  { id: 'filescan', label: 'Scan' },
  { id: 'progressive', label: 'Flow' },
  { id: 'benchmarks', label: 'Proof' },
  { id: 'compute', label: 'Modes' },
  { id: 'cli', label: 'CLI' },
  { id: 'ask-mode', label: 'Ask' },
  { id: 'pro-value', label: 'Pro' },
  { id: 'pricing', label: 'Plan' },
  { id: 'cta', label: 'Launch' },
] as const

function clampIndex(idx: number): number {
  if (idx < 0) return 0
  if (idx > SECTION_ORDER.length - 1) return SECTION_ORDER.length - 1
  return idx
}

export function V4SkimNav() {
  const [activeId, setActiveId] = useState<string>('hero')
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null

        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = entry.target.getAttribute('id')
          if (!id) continue
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { id, ratio: entry.intersectionRatio }
          }
        }

        if (best) setActiveId(best.id)
      },
      {
        threshold: [0.2, 0.35, 0.55, 0.75],
        rootMargin: '-20% 0px -30% 0px',
      }
    )

    for (const section of SECTION_ORDER) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  const activeIndex = useMemo(() => {
    return clampIndex(SECTION_ORDER.findIndex((s) => s.id === activeId))
  }, [activeId])

  return (
    <aside
      className="hidden xl:flex"
      aria-label="Section skim navigation"
      style={{
        position: 'fixed',
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 45,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          background: 'rgba(9,11,13,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '12px 10px',
          width: 118,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-ixo-mono)',
            fontSize: 9,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.32)',
            margin: '0 0 10px 2px',
          }}
        >
          skim
        </p>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 4,
              top: 8,
              bottom: 8,
              width: 1,
              background: 'rgba(255,255,255,0.08)',
            }}
          />

          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 4,
              top: 8,
              width: 1,
              height: `${Math.max(8, activeIndex * 24 + 8)}px`,
              background: 'rgba(45,212,191,0.8)',
              boxShadow: '0 0 10px rgba(45,212,191,0.6)',
              transition: 'height 260ms ease',
            }}
          />

          {SECTION_ORDER.map((section, idx) => {
            const isActive = section.id === activeId
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  const target = document.getElementById(section.id)
                  target?.scrollIntoView({ behavior: lowEnd ? 'auto' : 'smooth', block: 'start' })
                }}
                onMouseEnter={(e) => {
                  if (!lowEnd) pulse(e.clientX, e.clientY, 0.2)
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '10px 1fr',
                  alignItems: 'center',
                  gap: 8,
                  background: 'transparent',
                  border: 0,
                  textAlign: 'left',
                  padding: '2px 2px',
                  cursor: 'pointer',
                }}
                aria-current={isActive ? 'location' : undefined}
                aria-label={`Go to ${section.label}`}
              >
                <span
                  aria-hidden
                  style={{
                    width: isActive ? 7 : 5,
                    height: isActive ? 7 : 5,
                    borderRadius: 999,
                    background: isActive ? '#2DD4BF' : 'rgba(255,255,255,0.2)',
                    boxShadow: isActive ? '0 0 10px rgba(45,212,191,0.8)' : 'none',
                    transition: 'all 220ms ease',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-ixo-mono)',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: isActive ? 'rgba(243,245,247,0.9)' : 'rgba(255,255,255,0.4)',
                    transition: 'color 180ms ease',
                  }}
                >
                  {String(idx + 1).padStart(2, '0')} {section.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}