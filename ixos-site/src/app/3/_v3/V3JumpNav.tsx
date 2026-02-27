'use client'

import { useState } from 'react'

interface V3JumpNavProps {
  sectionIds: string[]
  tones: Array<'cyan' | 'amber' | 'violet'>
  activeSectionId: string | null
}

const TONE_COLORS: Record<string, string> = {
  cyan: '#2DD4BF',
  amber: '#F59E0B',
  violet: '#7C3AED',
}

export function V3JumpNav({ sectionIds, tones, activeSectionId }: V3JumpNavProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 60,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {sectionIds.map((id, i) => {
        const isActive = activeSectionId === id
        const isHovered = hoveredIndex === i
        const toneColor = TONE_COLORS[tones[i]] ?? '#2DD4BF'

        return (
          <div
            key={id}
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            {isHovered && (
              <div
                style={{
                  position: 'absolute',
                  right: 20,
                  whiteSpace: 'nowrap',
                  background: 'rgba(12,14,16,0.9)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontFamily: 'monospace',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.7)',
                  pointerEvents: 'none',
                  textTransform: 'uppercase',
                }}
              >
                {id}
              </div>
            )}
            <button
              onClick={() => scrollToSection(id)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              aria-label={`Jump to section ${id}`}
              style={{
                width: isActive ? 10 : 8,
                height: isActive ? 10 : 8,
                borderRadius: '50%',
                background: isActive ? toneColor : 'transparent',
                border: `1.5px solid ${isActive ? toneColor : 'rgba(255,255,255,0.3)'}`,
                cursor: 'pointer',
                padding: 0,
                opacity: isActive ? 1 : 0.4,
                transition: 'all 200ms ease',
                boxShadow: isActive ? `0 0 6px ${toneColor}` : 'none',
                outline: 'none',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
