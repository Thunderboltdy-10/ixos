'use client'

import { useRef, useState, type CSSProperties } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

const FREE_POINTS = [
  'Fast local search',
  'Lexical plus semantic ranking',
  'CLI and desktop access',
  'Privacy-first local execution',
]

const PRO_POINTS = [
  'Ask Mode with citations',
  'Today brief and resumable context',
  'Workstreams session continuity',
  'Why Matched and Deep Search depth',
]

export function V4Pricing() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-100px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  return (
    <div
      data-section="pricing"
      id="pricing"
      ref={sectionRef}
      onMouseEnter={(e) => {
        if (!lowEnd) pulse(e.clientX, e.clientY, 0.3)
      }}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section style={{ backgroundColor: '#0C0E10', padding: '110px 0 138px', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(70% 60% at 50% 30%, rgba(124,58,237,0.12), transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(124,58,237,0.8)', margin: '0 0 12px 0' }}
          >
            Plans
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.56, delay: 0.07 }}
            style={{
              margin: '0 0 12px 0',
              fontFamily: 'var(--font-ixo-heading)',
              fontSize: 'clamp(2rem, 3.9vw, 3rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.06,
              color: '#F3F5F7',
            }}
          >
            Start with core search. Unlock Today, Workstreams, and Ask Mode when needed.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.56, delay: 0.13 }}
            style={{
              margin: '0 0 24px 0',
              fontFamily: 'var(--font-ixo-heading)',
              fontSize: 16,
              lineHeight: 1.55,
              color: 'rgba(243,245,247,0.58)',
              maxWidth: 720,
            }}
          >
            Billing values can change. The live source of truth is the dedicated pricing route.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.56, delay: 0.19 }}
            style={{
              marginBottom: 26,
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.03)',
              padding: 4,
              position: 'relative',
            }}
          >
            <motion.span
              aria-hidden
              style={{
                position: 'absolute',
                top: 4,
                bottom: 4,
                left: billing === 'monthly' ? 4 : '50%',
                right: billing === 'monthly' ? '50%' : 4,
                borderRadius: 999,
                background: 'rgba(124,58,237,0.25)',
                border: '1px solid rgba(124,58,237,0.45)',
              }}
              animate={billing === 'monthly' ? { left: 4, right: '50%' } : { left: '50%', right: 4 }}
              transition={{ duration: 0.22 }}
            />
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              style={pillButtonStyle}
            >
              monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              style={pillButtonStyle}
            >
              annual
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            <PlanCard
              inView={inView}
              delay={0.12}
              title="Free"
              subtitle="Core local search"
              accent="#2DD4BF"
              points={FREE_POINTS}
              badge="included"
            />
            <PlanCard
              inView={inView}
              delay={0.2}
              title="Pro"
              subtitle={billing === 'annual' ? 'Deep Search depth (annual)' : 'Deep Search depth (monthly)'}
              accent="#7C3AED"
              points={PRO_POINTS}
              badge="upgrade"
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="font-mono"
            style={{ margin: '14px 0 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}
          >
            Source: src/app/pricing/page.tsx and src/components/sections/PricingProFlow.tsx
          </motion.p>
        </div>
      </section>
    </div>
  )
}

const pillButtonStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: 108,
  height: 34,
  border: 0,
  borderRadius: 999,
  background: 'transparent',
  color: 'rgba(243,245,247,0.82)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontFamily: 'var(--font-ixo-mono)',
  fontSize: 10,
  cursor: 'pointer',
}

function PlanCard({
  inView,
  delay,
  title,
  subtitle,
  accent,
  points,
  badge,
}: {
  inView: boolean
  delay: number
  title: string
  subtitle: string
  accent: string
  points: readonly string[]
  badge: string
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay }}
      style={{
        border: `1px solid ${accent}55`,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        padding: 20,
      }}
    >
      <span
        className="font-mono"
        style={{
          display: 'inline-block',
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: accent,
          border: `1px solid ${accent}55`,
          borderRadius: 999,
          padding: '4px 10px',
          marginBottom: 14,
        }}
      >
        {badge}
      </span>

      <h3 style={{ margin: '0 0 8px 0', fontFamily: 'var(--font-ixo-heading)', fontSize: 30, color: '#F3F5F7' }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 14px 0', fontFamily: 'var(--font-ixo-heading)', fontSize: 15, color: 'rgba(243,245,247,0.6)' }}>
        {subtitle}
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {points.map((point) => (
          <li key={point} className="font-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.58)' }}>
            + {point}
          </li>
        ))}
      </ul>

      <a
        href="/pricing"
        className="font-mono"
        style={{
          marginTop: 16,
          display: 'inline-block',
          fontSize: 10,
          color: '#F3F5F7',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(243,245,247,0.35)',
          paddingBottom: 2,
        }}
      >
        view live pricing
      </a>
    </motion.article>
  )
}
