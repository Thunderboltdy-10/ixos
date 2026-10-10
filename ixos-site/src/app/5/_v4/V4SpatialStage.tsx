"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'

function ScrollProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const p = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      setProgress(p)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 2,
        width: '100%',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          background: '#F59E0B',
          transformOrigin: 'left center',
          transform: `scaleX(${progress})`,
          transition: 'transform 0.1s linear',
          boxShadow: '0 0 8px rgba(245,158,11,0.6)',
        }}
      />
    </div>
  )
}

type Tone = 'cyan' | 'amber' | 'violet'

function headingGradient(tone: Tone): string {
  if (tone === 'amber') return 'linear-gradient(135deg,#FDE68A 0%,#F59E0B 100%)'
  if (tone === 'violet') return 'linear-gradient(135deg,#C4B5FD 0%,#7C3AED 100%)'
  return 'linear-gradient(135deg,#99F6E4 0%,#14B8A6 100%)'
}

function applyHeadingHighlights(root: HTMLElement) {
  const headings = root.querySelectorAll<HTMLElement>('h1, h2, h3')
  headings.forEach((heading) => {
    if (heading.dataset.v4AutoHighlight === 'true') return
    if (heading.querySelector('[data-v4-highlight="true"]')) return
    if (Array.from(heading.children).length > 0) return

    const text = (heading.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text) return
    const words = text.split(' ')
    if (words.length < 3) return

    const take = words.length >= 5 ? 2 : 1
    const prefix = words.slice(0, -take).join(' ')
    const accent = words.slice(-take).join(' ')
    if (!prefix || !accent) return

    const tone =
      (heading.closest('[data-result-node="true"]')?.getAttribute('data-result-tone') as Tone) ||
      'cyan'

    heading.textContent = ''
    heading.append(document.createTextNode(`${prefix} `))
    const span = document.createElement('span')
    span.textContent = accent
    span.dataset.v4Highlight = 'true'
    span.style.background = headingGradient(tone)
    span.style.webkitBackgroundClip = 'text'
    span.style.backgroundClip = 'text'
    span.style.color = 'transparent'
    heading.append(span)
    heading.dataset.v4AutoHighlight = 'true'
  })
}

export function V4SpatialStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const lowEnd = useReducedOrLowEnd()

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ['start start', 'end end'],
  })

  // Removed camera transforms to avoid weird tilt effect on scroll.

  useEffect(() => {
    const root = stageRef.current
    if (!root) return
    const run = () => applyHeadingHighlights(root)
    run()
    const observer = new MutationObserver(run)
    observer.observe(root, { subtree: true, childList: true })
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={stageRef} style={{ position: 'relative' }}>
      <ScrollProgressBar />

      {!lowEnd && (
        <motion.div
          aria-hidden
          animate={{ opacity: [0.012, 0.006, 0.016, 0.01] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 18,
            mixBlendMode: 'screen',
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.045), rgba(255,255,255,0.045) 1px, transparent 1px, transparent 4px)',
          }}
        />
      )}

      <div style={{ position: 'relative' }}>
        {/* Subtle scrim for text legibility over the ambient field */}
        {/* Legibility scrim — stronger mid-page where text sections are denser */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            // Light at top (hero shines), stronger at mid-scroll, fades at bottom
            background: [
              'linear-gradient(to bottom,',
              '  rgba(12,14,16,0.0) 0%,',
              '  rgba(12,14,16,0.0) 18%,',
              '  rgba(12,14,16,0.45) 35%,',
              '  rgba(12,14,16,0.5) 65%,',
              '  rgba(12,14,16,0.35) 85%,',
              '  rgba(12,14,16,0.2) 100%',
              ')',
            ].join(' '),
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <div style={{ position: 'relative', zIndex: 2 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
