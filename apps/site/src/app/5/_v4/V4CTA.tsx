"use client";

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

export function V4CTA() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-120px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()

  return (
    <div
      data-section="cta"
      id="cta"
      ref={sectionRef}
      onMouseEnter={(e) => {
        if (!lowEnd) pulse(e.clientX, e.clientY, 0.4)
      }}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section style={{ backgroundColor: 'transparent', padding: '120px 0 132px', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(50% 50% at 30% 20%, rgba(45,212,191,0.14), transparent 70%), radial-gradient(50% 50% at 80% 30%, rgba(124,58,237,0.14), transparent 72%)',
            pointerEvents: 'none',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.82)', margin: '0 0 12px 0' }}
          >
            Launch local search
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.58, delay: 0.07 }}
            style={{
              margin: '0 0 16px 0',
              fontFamily: 'var(--font-ixo-heading)',
              fontSize: 'clamp(2.2rem, 6vw, 4.3rem)',
              lineHeight: 1.02,
              letterSpacing: '-0.04em',
              color: '#F3F5F7',
            }}
          >
            Your files. Found fast.
            <br />
            <span
              style={{
                background: 'linear-gradient(120deg, #2DD4BF 0%, #7C3AED 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Privately.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.58, delay: 0.13 }}
            style={{
              margin: '0 auto 24px',
              maxWidth: 760,
              fontFamily: 'var(--font-ixo-heading)',
              fontSize: 17,
              lineHeight: 1.55,
              color: 'rgba(243,245,247,0.58)',
            }}
          >
            Desktop and CLI share the same Flash, Auto, Pro, and Memory, Local, Deep Search paths.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.58, delay: 0.2 }}
            style={{
              margin: '0 auto 24px',
              maxWidth: 780,
              // 3D glassmorphic code block
              border: '1px solid rgba(255,255,255,0.1)',
              borderTop: '1px solid rgba(255,255,255,0.18)',
              borderLeft: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(7,9,12,0.88) 100%)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '-8px -8px 24px rgba(0,0,0,0.7), 4px 4px 16px rgba(45,212,191,0.05)',
              textAlign: 'left',
              padding: '12px 14px',
            }}
          >
            <p className="font-mono" style={{ margin: '0 0 8px 0', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em' }}>
              QUICKSTART
            </p>
            <div className="font-mono" style={{ display: 'grid', gap: 5, fontSize: 12, color: 'rgba(243,245,247,0.82)' }}>
              <code>{'ixos search \"token refresh\" --progressive --dir ./repo'}</code>
              <code>{'ixos search \"auth middleware\" --cache-mode native-cache --dir ./repo'}</code>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.58, delay: 0.25 }}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
          >
            <a
              href="/download"
              className="font-mono"
              style={{
                textDecoration: 'none',
                color: '#0C0E10',
                background: '#2DD4BF',
                borderRadius: 7,
                border: '1px solid rgba(45,212,191,0.9)',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                padding: '12px 22px',
                fontWeight: 700,
              }}
            >
              Download app
            </a>

            <a
              href="/docs/cli-reference"
              className="font-mono"
              style={{
                textDecoration: 'none',
                color: 'rgba(243,245,247,0.82)',
                background: 'transparent',
                borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                padding: '12px 22px',
              }}
            >
              Read CLI docs
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
