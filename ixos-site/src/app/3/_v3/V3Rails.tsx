'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface V3RailsProps {
  activeSectionId: string | null
  sectionIds: string[]
  activeTone: 'cyan' | 'amber' | 'violet'
}

interface PulseEntry {
  id: string
  y: number
  color: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TONE_COLORS: Record<string, string> = {
  cyan: '#2DD4BF',
  amber: '#F59E0B',
  violet: '#7C3AED',
}

const TICK_COUNT = 28

// ─── Rail tick strip ─────────────────────────────────────────────────────────

function RailStrip({
  activeSectionIndex,
  sectionCount,
  color,
  side,
}: {
  activeSectionIndex: number
  sectionCount: number
  color: string
  side: 'left' | 'right'
}) {
  return (
    <div
      style={{
        position: 'fixed',
        [side]: 0,
        top: 80,
        bottom: 0,
        width: 20,
        zIndex: 10,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-evenly',
        alignItems: side === 'left' ? 'flex-end' : 'flex-start',
      }}
    >
      {Array.from({ length: TICK_COUNT }).map((_, i) => {
        // Determine if this tick is in the "aligned zone" near the active section
        const normalizedActive =
          sectionCount > 1 ? (activeSectionIndex / (sectionCount - 1)) * (TICK_COUNT - 1) : 0
        const distFromActive = Math.abs(i - normalizedActive)
        const inAlignedZone = distFromActive < 4

        return (
          <motion.div
            key={i}
            style={{
              height: 1,
              background: color,
              borderRadius: 1,
            }}
            animate={{
              width: inAlignedZone ? (distFromActive < 1.5 ? 10 : 7) : 4,
              opacity: inAlignedZone ? (distFromActive < 1.5 ? 0.55 : 0.35) : 0.12,
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        )
      })}
    </div>
  )
}

// ─── V3Rails ─────────────────────────────────────────────────────────────────

export function V3Rails({ activeSectionId, sectionIds, activeTone }: V3RailsProps) {
  const color = TONE_COLORS[activeTone] ?? '#2DD4BF'
  const activeSectionIndex = activeSectionId
    ? sectionIds.indexOf(activeSectionId)
    : 0
  const safeActiveIndex = activeSectionIndex < 0 ? 0 : activeSectionIndex

  // ── Phase-lock pulses ────────────────────────────────────────────────────
  const [pulses, setPulses] = useState<PulseEntry[]>([])

  useEffect(() => {
    if (!activeSectionId) return
    const newPulse: PulseEntry = {
      id: `p-${Date.now()}`,
      y: window.innerHeight * 0.4,
      color,
    }
    setPulses((prev) => [...prev.slice(-2), newPulse])
    const tid = setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.id !== newPulse.id))
    }, 1200)
    return () => clearTimeout(tid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionId])

  // ── Scan line ─────────────────────────────────────────────────────────────
  const [scanLine, setScanLine] = useState(false)

  useEffect(() => {
    if (!activeSectionId) return
    setScanLine(true)
    const tid = setTimeout(() => setScanLine(false), 400)
    return () => clearTimeout(tid)
  }, [activeSectionId])

  return (
    <>
      {/* Left rail */}
      <RailStrip
        activeSectionIndex={safeActiveIndex}
        sectionCount={sectionIds.length}
        color={color}
        side="left"
      />

      {/* Right rail */}
      <RailStrip
        activeSectionIndex={safeActiveIndex}
        sectionCount={sectionIds.length}
        color={color}
        side="right"
      />

      {/* Phase-lock pulse rings */}
      {pulses.map((pulse) => (
        <div
          key={pulse.id}
          style={{
            position: 'fixed',
            left: '50%',
            top: pulse.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 8,
            pointerEvents: 'none',
          }}
        >
          {[0, 1, 2].map((ring) => (
            <motion.div
              key={ring}
              style={{
                position: 'absolute',
                borderRadius: '50%',
                border: `1px solid ${pulse.color}`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ width: 4, height: 4, opacity: 0.8 }}
              animate={{
                width: 80 + ring * 50,
                height: 80 + ring * 50,
                opacity: 0,
              }}
              transition={{
                duration: 0.7 + ring * 0.15,
                ease: 'easeOut',
                delay: ring * 0.08,
              }}
            />
          ))}
        </div>
      ))}

      {/* Scan line */}
      <AnimatePresence>
        {scanLine && (
          <motion.div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              height: 1,
              top: '18%',
              zIndex: 9,
              pointerEvents: 'none',
              background: `linear-gradient(90deg, transparent, ${color}60, ${color}80, transparent)`,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
