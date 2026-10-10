"use client";

import { useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { FileText } from 'lucide-react'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'

type Tone = 'cyan' | 'violet' | 'amber'

function toneColor(tone: Tone): string {
  if (tone === 'amber') return '#F59E0B'
  if (tone === 'violet') return '#7C3AED'
  return '#14B8A6'
}

// ─── Slide-in search result annotation ────────────────────────────────────────
// Full-width card that expands as user scrolls past

function ResultAnnotation({
  rank,
  file,
  tone,
  title,
  score,
  inView,
  isExpanded,
}: {
  rank: string
  file: string
  tone: Tone
  title: string
  score: number
  inView: boolean
  isExpanded: boolean
}) {
  const color = toneColor(tone)
  const lowEnd = useReducedOrLowEnd()

  if (lowEnd) return null

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        paddingTop: 20,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        overflow: 'hidden',
      }}
    >
      <AnimatePresence>
        {inView && (
          <motion.div
            key={`annotation-${rank}`}
            initial={{ opacity: 0, x: -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: '100%',
              maxWidth: '100vw',
              borderRadius: isExpanded ? 12 : 8,
              background: `linear-gradient(120deg, ${color}22 0%, rgba(18,20,26,0.98) 100%)`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: `${color}44`,
              borderTopWidth: 1,
              borderTopStyle: 'solid',
              borderTopColor: `${color}66`,
              borderLeftWidth: 3,
              borderLeftStyle: 'solid',
              borderLeftColor: color,
              boxShadow: [
                `-6px -6px 18px rgba(0,0,0,0.6)`,
                `3px 3px 12px ${color}10`,
                `0 0 16px ${color}1a`,
              ].join(', '),
              padding: '7px 12px',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '22px 16px 1fr auto auto',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-ixo-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color,
                }}
              >
                {rank}
              </span>
              <FileText size={13} color={color} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-ixo-mono)',
                    fontSize: 11,
                    color: 'rgba(243,245,247,0.9)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-ixo-mono)',
                    fontSize: 9,
                    color: 'rgba(243,245,247,0.45)',
                    marginTop: 2,
                  }}
                >
                  {title} · why this matched
                </div>
              </div>
              {/* Score bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 56, height: 2, borderRadius: 2, background: 'rgba(243,245,247,0.1)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      borderRadius: 2,
                      background: color,
                      boxShadow: `0 0 6px ${color}80`,
                    }}
                  />
                </div>
                <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, color }}>
                  {Math.round(score)}%
                </span>
              </div>
              {/* Pulse indicator */}
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main result node ──────────────────────────────────────────────────────────

export function V4ResultNode({
  rank,
  file,
  tone,
  title,
  sectionId,
  isRevealed = false,
  children,
}: {
  rank: string
  file: string
  tone: Tone
  title: string
  sectionId: string
  isRevealed?: boolean
  children: ReactNode
}) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const rankNum = Number(rank)
  const isInitial = rankNum <= 3
  const inViewRaw = useInView(nodeRef, { once: true, margin: isInitial ? '0px' : '-2% 0px -2% 0px' })
  const inView = isInitial || inViewRaw
  const lowEnd = useReducedOrLowEnd()
  const color = toneColor(tone)
  const score = Math.max(72, 98 - rankNum * 1.5)

  return (
    <div
      ref={nodeRef}
      data-result-node="true"
      data-result-id={sectionId}
      data-result-rank={rank}
      data-result-file={file}
      data-result-tone={tone}
      data-result-title={title}
      style={{ position: 'relative', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255,255,255,0.03)' }}
    >
      {/* Slide-in annotation */}
      <ResultAnnotation
        rank={rank}
        file={file}
        tone={tone}
        title={title}
        score={score}
        inView={inView}
        isExpanded={true}
      />

      {/* Section content */}
      <motion.div
        initial={{ height: 0, opacity: 0, scale: 0.98, overflow: 'hidden' }}
        animate={
          isRevealed
            ? { height: 'auto', opacity: 1, scale: 1, transitionEnd: { overflow: 'visible' } }
            : { height: 0, opacity: 0, scale: 0.98, overflow: 'hidden' }
        }
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: `${color}40`,
          background: 'linear-gradient(135deg, rgba(18,20,26,0.85) 0%, rgba(12,14,18,0.88) 60%, rgba(8,10,12,0.92) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: `-8px -8px 24px rgba(0,0,0,0.6), 4px 4px 16px ${color}08, 0 18px 44px rgba(0,0,0,0.28)`,
          marginTop: 8,
          marginBottom: isRevealed ? 40 : 0,
        }}
      >
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}
