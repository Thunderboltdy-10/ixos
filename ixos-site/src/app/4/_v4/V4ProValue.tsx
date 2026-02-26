'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

const PRO_SURFACES = [
  {
    id: 'today',
    title: 'Today',
    strap: 'activity_ledger',
    body: 'Recent evidence, resume points, and suggested next actions are surfaced as one focused daily brief.',
    bullets: ['resume context', 'recent files', 'next-step suggestion'],
    source: 'src/activity_ledger/mod.rs',
    color: '#2DD4BF',
  },
  {
    id: 'workstreams',
    title: 'Workstreams',
    strap: 'auto-clustered sessions',
    body: 'Search activity is grouped into coherent work threads so evidence and movement history stay connected.',
    bullets: ['session clustering', 'evidence continuity', 'workflow replay'],
    source: 'src/workstreams/mod.rs',
    color: '#F59E0B',
  },
  {
    id: 'ask',
    title: 'Ask',
    strap: 'model-respecting Q&A',
    body: 'Ask mode extracts intent, cites supporting files, and follows selected mode constraints without hidden Pro forcing.',
    bullets: ['intent extraction', 'citation path', 'mode safety guard'],
    source: 'docs/product/DESKTOP_APP.md',
    color: '#7C3AED',
  },
] as const

export function V4ProValue() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-100px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()
  const [active, setActive] = useState<(typeof PRO_SURFACES)[number]['id']>('today')

  return (
    <div
      data-section="pro-value"
      id="pro-value"
      ref={sectionRef}
      onMouseEnter={(e) => {
        if (!lowEnd) pulse(e.clientX, e.clientY, 0.28)
      }}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section style={{ backgroundColor: '#0C0E10', padding: '112px 0 136px', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(70% 80% at 50% 30%, rgba(45,212,191,0.08), transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.75)', margin: '0 0 12px 0' }}
          >
            Pro workflow loop
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.56, delay: 0.08 }}
            style={{
              fontFamily: 'var(--font-ixo-heading)',
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              lineHeight: 1.06,
              letterSpacing: '-0.03em',
              color: '#F3F5F7',
              margin: '0 0 14px 0',
              maxWidth: 860,
            }}
          >
            Today and Workstreams keep context alive. Ask turns it into answers.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.56, delay: 0.14 }}
            style={{
              fontFamily: 'var(--font-ixo-heading)',
              fontSize: 17,
              lineHeight: 1.55,
              color: 'rgba(243,245,247,0.58)',
              maxWidth: 760,
              margin: '0 0 34px 0',
            }}
          >
            These surfaces are designed as one loop, not isolated features: discover context, cluster work, then interrogate evidence directly.
          </motion.p>

          <div
            aria-hidden
            style={{
              position: 'relative',
              height: 18,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 8,
                height: 1,
                background: 'linear-gradient(90deg, rgba(45,212,191,0.35), rgba(245,158,11,0.35), rgba(124,58,237,0.35))',
              }}
            />
            <motion.div
              style={{
                position: 'absolute',
                top: 5,
                width: 7,
                height: 7,
                borderRadius: 999,
                background: '#F3F5F7',
                boxShadow: '0 0 10px rgba(243,245,247,0.9)',
              }}
              animate={
                inView && !lowEnd
                  ? { left: ['0%', '50%', '100%', '0%'] }
                  : { left: '0%' }
              }
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PRO_SURFACES.map((surface, idx) => {
              const selected = active === surface.id
              return (
                <motion.button
                  key={surface.id}
                  type="button"
                  initial={{ opacity: 0, y: 18 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.55, delay: 0.08 + idx * 0.08 }}
                  onMouseEnter={(e) => {
                    setActive(surface.id)
                    if (!lowEnd) pulse(e.clientX, e.clientY, 0.24)
                  }}
                  onFocus={() => setActive(surface.id)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 12,
                    border: selected
                      ? `1px solid ${surface.color}66`
                      : '1px solid rgba(255,255,255,0.09)',
                    background: selected
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(255,255,255,0.02)',
                    padding: 18,
                    transition: 'border-color 220ms ease, background 220ms ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: surface.color }}>
                      {surface.strap}
                    </span>
                    <span
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: surface.color,
                        boxShadow: selected ? `0 0 12px ${surface.color}` : 'none',
                      }}
                    />
                  </div>

                  <h3
                    style={{
                      margin: '0 0 9px 0',
                      fontFamily: 'var(--font-ixo-heading)',
                      fontSize: 26,
                      letterSpacing: '-0.02em',
                      color: '#F3F5F7',
                    }}
                  >
                    {surface.title}
                  </h3>

                  <p style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-ixo-heading)', fontSize: 15, lineHeight: 1.5, color: 'rgba(243,245,247,0.62)' }}>
                    {surface.body}
                  </p>

                  <ul style={{ display: 'grid', gap: 6, margin: 0, padding: 0, listStyle: 'none' }}>
                    {surface.bullets.map((bullet) => (
                      <li key={bullet} className="font-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        [{bullet}]
                      </li>
                    ))}
                  </ul>

                  <p className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', margin: '12px 0 0 0' }}>
                    Source: {surface.source}
                  </p>
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}