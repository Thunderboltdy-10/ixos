"use client";

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

type Accent = 'cyan' | 'violet' | 'amber' | 'dim'

const ACCENT_COLORS: Record<Accent, string> = {
  cyan:   'rgba(45,212,191,0.55)',
  violet: 'rgba(124,58,237,0.45)',
  amber:  'rgba(245,158,11,0.45)',
  dim:    'rgba(255,255,255,0.08)',
}

const ACCENT_GLOW: Record<Accent, string> = {
  cyan:   'rgba(45,212,191,0.2)',
  violet: 'rgba(124,58,237,0.18)',
  amber:  'rgba(245,158,11,0.2)',
  dim:    'rgba(255,255,255,0.04)',
}

const ACCENT_SOLID: Record<Accent, string> = {
  cyan:   '#2DD4BF',
  violet: '#7C3AED',
  amber:  '#F59E0B',
  dim:    'rgba(255,255,255,0.35)',
}

const ACCENT_LABELS: Record<Accent, string> = {
  cyan:   'semantic match',
  violet: 'vector match',
  amber:  'lexical match',
  dim:    'indexed',
}

// Deterministic floating particles
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 11) % 85}%`,
  delay: i * 0.15,
  size: 1 + (i % 3),
  duration: 2 + (i % 3) * 0.5,
}))

export function V4SectionDivider({ accent = 'dim' }: { accent?: Accent }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-5% 0px' })
  const color = ACCENT_COLORS[accent]
  const glow = ACCENT_GLOW[accent]
  const solid = ACCENT_SOLID[accent]
  const label = ACCENT_LABELS[accent]

  return (
    <div
      ref={ref}
      style={{ position: 'relative', height: 28, overflow: 'visible', display: 'flex', alignItems: 'center' }}
    >
      {/* Floating particles */}
      {accent !== 'dim' && PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '50%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: solid,
            opacity: 0.3,
            pointerEvents: 'none',
          }}
          animate={{
            y: [-8, 8, -8],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Main gradient line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={inView ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 1,
          transformOrigin: 'left center',
          background: `linear-gradient(90deg, transparent 0%, ${color} 20%, ${color} 80%, transparent 100%)`,
          boxShadow: `0 0 8px ${glow}`,
        }}
      />

      {/* Traveling pulse dot */}
      {accent !== 'dim' && inView && (
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            translateY: '-50%',
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: solid,
            boxShadow: `0 0 10px ${solid}, 0 0 20px ${glow}`,
            pointerEvents: 'none',
          }}
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.4, delay: 0.3, ease: 'easeInOut' }}
        />
      )}

      {/* Score annotation pill — centered */}
      {accent !== 'dim' && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.9 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.5 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px 3px 7px',
            borderRadius: 999,
            // 3D glassmorphic pill
            background: `linear-gradient(135deg, ${glow} 0%, rgba(14,17,23,0.98) 100%)`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1px solid ${color}`,
            borderTop: `1px solid ${solid}55`,
            boxShadow: `-4px -4px 10px rgba(0,0,0,0.6), 2px 2px 8px ${glow}`,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: solid,
              boxShadow: `0 0 6px ${solid}`,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-ixo-mono)',
              fontSize: 8,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: solid,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        </motion.div>
      )}
    </div>
  )
}
