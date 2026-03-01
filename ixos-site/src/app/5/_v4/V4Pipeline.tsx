'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'
import { usePulse } from './hooks/usePulse'

// ─── Stage data ───────────────────────────────────────────────────────────────

interface PipelineStage {
  number: string
  name: string
  description: string
  source: string
  color: string
}

const STAGES: PipelineStage[] = [
  {
    number: '01',
    name: 'JIT Scan',
    description: 'rayon parallelizes file loading across all CPU cores with no background daemon',
    source: 'ixos_rank/lexical_engine.rs',
    color: '#F59E0B',
  },
  {
    number: '02',
    name: 'Lexical Engine',
    description: 'keyword scoring with BM25-like ranking surfaces candidates in milliseconds',
    source: 'ixos_rank/lexical_engine.rs',
    color: '#F59E0B',
  },
  {
    number: '03',
    name: 'Semantic Engine',
    description: 'Model2Vec embedding similarity reorders candidates by intent, not keyword frequency',
    source: 'ixos_rank/semantic_engine.rs',
    color: '#7C3AED',
  },
  {
    number: '04',
    name: 'Hybrid Merge',
    description: 'adaptive blend with attack detection fallback converges to a final ranked list',
    source: 'ixos_rank/hybrid_engine.rs',
    color: '#2DD4BF',
  },
]

// ─── Arrow between cards ──────────────────────────────────────────────────────

function Arrow({ active, color }: { active: boolean; color: string }) {
  return (
    <div
      className="hidden lg:flex items-center justify-center shrink-0 relative"
      style={{ width: 48 }}
    >
      <motion.div
        animate={{ opacity: active ? 1 : 0.2 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-center"
      >
        <div style={{ position: 'relative', width: 32, height: 2, background: active ? `${color}40` : 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
          {active && (
            <motion.div
              style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '40%', background: color, filter: `drop-shadow(0 0 6px ${color})` }}
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>
        <motion.div
          animate={{ borderLeftColor: active ? color : 'rgba(255,255,255,0.2)' }}
          transition={{ duration: 0.4 }}
          style={{
            width: 0,
            height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderLeft: `8px solid`,
            filter: active ? `drop-shadow(0 0 4px ${color})` : 'none',
          }}
        />
      </motion.div>
    </div>
  )
}

function StageCard({
  stage,
  active,
  delay,
  inView,
}: {
  stage: PipelineStage
  active: boolean
  delay: number
  inView: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    setRotateX(((y - centerY) / centerY) * -12)
    setRotateY(((x - centerX) / centerX) * 12)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0, rotateX, rotateY, scale: active ? 1.05 : 1 } : { rotateX: 0, rotateY: 0 }}
      transition={{ 
        opacity: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
        rotateX: { type: 'spring', stiffness: 300, damping: 30 },
        rotateY: { type: 'spring', stiffness: 300, damping: 30 },
        scale: { duration: 0.4, ease: 'easeOut' }
      }}
      style={{
        width: '100%',
        maxWidth: 240,
        background: active ? 'rgba(20,24,30,0.9)' : 'rgba(10,12,16,0.6)',
        border: `1px solid ${active ? stage.color + '60' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 16,
        padding: 24,
        boxShadow: active ? `0 20px 40px rgba(0,0,0,0.5), 0 0 30px ${stage.color}20 inset, 0 0 20px ${stage.color}40` : '0 10px 20px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden',
        transformStyle: 'preserve-3d',
        perspective: 1000,
        zIndex: active ? 10 : 1,
      }}
    >
      <div style={{ transform: 'translateZ(30px)' }}>
        {/* Glow backdrop */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            background: `radial-gradient(circle, ${stage.color}${active ? '40' : '10'}, transparent 70%)`,
            transition: 'background 0.5s ease',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />

        {/* Number circle */}
        <div
          className="flex items-center justify-center font-mono mb-6"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: `1px solid ${active ? stage.color : 'rgba(255,255,255,0.1)'}`,
            background: active ? `${stage.color}20` : 'rgba(255,255,255,0.02)',
            fontSize: 13,
            color: active ? stage.color : 'rgba(255,255,255,0.4)',
            fontWeight: 700,
            boxShadow: active ? `0 0 15px ${stage.color}60` : 'none',
          }}
        >
          {stage.number}
        </div>

        {/* Stage name */}
        <h3
          style={{
            fontFamily: 'var(--font-ixo-heading)',
            fontSize: 20,
            fontWeight: 700,
            color: active ? '#F3F5F7' : 'rgba(243,245,247,0.5)',
            marginBottom: 10,
            letterSpacing: '-0.02em',
          }}
        >
          {stage.name}
        </h3>

        {/* Description */}
        <p
          style={{
            fontFamily: 'var(--font-ixo-heading)',
            fontSize: 13,
            lineHeight: 1.5,
            color: active ? 'rgba(243,245,247,0.7)' : 'rgba(243,245,247,0.3)',
            marginBottom: 16,
          }}
        >
          {stage.description}
        </p>

        {/* Source */}
        <p
          className="font-mono"
          style={{ fontSize: 10, color: active ? stage.color : 'rgba(255,255,255,0.2)', opacity: 0.8 }}
        >
          {stage.source}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Result row that appears after all stages activate ────────────────────────

function FinalResult({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10 flex justify-center"
    >
      <div
        className="inline-flex items-center gap-4 font-mono"
        style={{
          background: 'rgba(45,212,191,0.06)',
          border: '1px solid rgba(45,212,191,0.25)',
          borderRadius: 8,
          padding: '12px 20px',
        }}
      >
        <span style={{ fontSize: 10, color: 'rgba(45,212,191,0.6)' }}>&#9632;</span>
        <span style={{ fontSize: 12, color: '#2DD4BF' }}>middleware/jwt.ts</span>
        <div style={{ width: 1, height: 14, background: 'rgba(45,212,191,0.2)' }} />
        <div
          className="relative overflow-hidden"
          style={{ height: 2, width: 64, background: 'rgba(45,212,191,0.15)', borderRadius: 1 }}
        >
          <motion.div
            style={{ position: 'absolute', inset: 0, background: '#2DD4BF', borderRadius: 1 }}
            initial={{ width: 0 }}
            animate={visible ? { width: '97%' } : { width: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span style={{ fontSize: 11, color: '#2DD4BF', letterSpacing: '-0.01em' }}>0.97</span>
        <span style={{ fontSize: 9, color: 'rgba(45,212,191,0.5)', letterSpacing: '0.15em' }}>LOCKED</span>
      </div>
    </motion.div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function V4Pipeline() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const lowEnd = useReducedOrLowEnd()
  const pulse = usePulse()

  // Activate stages sequentially
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (lowEnd) {
      setActiveCount(STAGES.length)
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    STAGES.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setActiveCount(i + 1)
        }, 400 + i * 300)
      )
    })

    return () => timers.forEach(clearTimeout)
  }, [inView, lowEnd])

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (lowEnd) return
    pulse(e.clientX, e.clientY, 0.35)
  }

  const allActive = activeCount >= STAGES.length

  return (
    <div
      data-section="pipeline"
      id="pipeline"
      ref={sectionRef}
      onMouseEnter={handleMouseEnter}
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <section className="py-28 md:py-36 overflow-hidden" style={{ backgroundColor: '#0C0E10' }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono uppercase mb-3"
              style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(45,212,191,0.6)' }}
            >
              Architecture
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: 'var(--font-ixo-heading)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                color: '#F3F5F7',
                letterSpacing: '-0.025em',
                marginBottom: 12,
              }}
            >
              One local pipeline behind Flash, Auto, and Pro.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono"
              style={{ fontSize: 14, color: 'rgba(243,245,247,0.4)', maxWidth: 480, margin: '0 auto' }}
            >
              Every query runs through this pipeline. Auto routes between speed and depth without changing your local-first posture.
            </motion.p>
          </div>

          {/* Pipeline flow */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-start justify-center gap-4 lg:gap-0">
            {STAGES.map((stage, i) => (
              <div key={stage.number} className="flex flex-col lg:flex-row items-center lg:items-start gap-4 lg:gap-0">
                <StageCard
                  stage={stage}
                  active={activeCount > i}
                  delay={0.2 + i * 0.08}
                  inView={inView}
                />
                {i < STAGES.length - 1 && (
                  <Arrow active={activeCount > i + 1} color={STAGES[i + 1].color} />
                )}
              </div>
            ))}
          </div>

          {/* Final result row */}
          <FinalResult visible={allActive} />

          {/* Source note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="font-mono text-center mt-8"
            style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}
          >
            Source: ixos_rank/ module — CLAUDE.md (Architecture)
          </motion.p>
        </div>
      </section>
    </div>
  )
}
