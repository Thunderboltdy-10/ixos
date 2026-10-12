"use client";

import { useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { ChevronRight, FileText } from 'lucide-react'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'

type Tone = 'cyan' | 'violet' | 'amber'

function toneColor(tone: Tone): string {
  if (tone === 'amber') return '#F59E0B'
  if (tone === 'violet') return '#7C3AED'
  return '#14B8A6'
}

export function V4ResultNode({
  rank,
  file,
  tone,
  title,
  sectionId,
  children,
}: {
  rank: string
  file: string
  tone: Tone
  title: string
  sectionId: string
  children: ReactNode
}) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const inView = useInView(nodeRef, { margin: '-18% 0px -22% 0px' })
  const lowEnd = useReducedOrLowEnd()
  const color = toneColor(tone)
  const score = Math.max(72, 98 - Number(rank) * 1.5)

  return (
    <div
      ref={nodeRef}
      data-result-node="true"
      data-result-id={sectionId}
      data-result-rank={rank}
      data-result-file={file}
      data-result-tone={tone}
      data-result-title={title}
      style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.03)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0.45, y: 8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'sticky',
          top: 70,
          zIndex: 38,
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 12,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 'min(1020px, calc(100vw - 20px))',
            borderRadius: 9,
            borderTop: `1px solid ${inView ? `${color}66` : 'rgba(243,245,247,0.12)'}`,
            borderRight: `1px solid ${inView ? `${color}50` : 'rgba(243,245,247,0.08)'}`,
            borderBottom: `1px solid ${inView ? `${color}50` : 'rgba(243,245,247,0.08)'}`,
            borderLeft: `3px solid ${inView ? color : 'rgba(243,245,247,0.12)'}`,
            background: inView
              ? `linear-gradient(120deg, ${color}22 0%, rgba(27,30,35,0.86) 100%)`
              : 'rgba(27,30,35,0.72)',
            boxShadow: inView ? `0 0 22px ${color}26` : 'none',
            padding: '8px 12px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 18px 1fr auto auto',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-ixo-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                color: inView ? color : 'rgba(243,245,247,0.42)',
              }}
            >
              {rank}
            </span>
            <FileText size={14} color={inView ? color : 'rgba(243,245,247,0.44)'} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-ixo-mono)',
                  fontSize: 12,
                  color: 'rgba(243,245,247,0.88)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file}
              </div>
              <AnimatePresence>
                {inView && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24 }}
                    style={{
                      fontFamily: 'var(--font-ixo-mono)',
                      fontSize: 10,
                      color: 'rgba(243,245,247,0.52)',
                      marginTop: 2,
                    }}
                  >
                    {title} · Why this matched
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div style={{ width: 64, height: 2, borderRadius: 2, background: 'rgba(243,245,247,0.12)' }}>
                <div
                  style={{
                    width: `${score}%`,
                    height: '100%',
                    borderRadius: 2,
                    background: color,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-ixo-mono)',
                  fontSize: 10,
                  color,
                }}
              >
                {Math.round(score)}%
              </span>
            </div>
            <ChevronRight size={14} color={inView ? color : 'rgba(243,245,247,0.42)'} />
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={
          lowEnd
            ? undefined
            : inView
              ? { rotateX: 0, rotateY: 0, y: 0, scale: 1 }
              : { rotateX: 1.2, rotateY: -1.2, y: 16, scale: 0.99 }
        }
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={lowEnd ? undefined : { transformStyle: 'preserve-3d' }}
      >
        <div
          style={{
            borderRadius: 12,
            border: `1px solid ${inView ? `${color}42` : 'rgba(243,245,247,0.08)'}`,
            background: 'rgba(21,23,27,0.22)',
            boxShadow: inView ? `0 0 0 1px ${color}24, 0 18px 44px rgba(0,0,0,0.28)` : '0 10px 26px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  )
}
