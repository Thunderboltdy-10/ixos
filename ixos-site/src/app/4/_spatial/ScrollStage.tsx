"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { VoidPhase } from './VoidPhase'
import { InsidePhase } from './InsidePhase'
import { EnteringText } from './EnteringText'

type Phase = 'void' | 'zoom' | 'inside'

// Precomputed deterministic star attributes — no Math.random() in render
const STARS = Array.from({ length: 80 }, (_, i) => ({
  width: ((i * 137.5) % 7) > 5.95 ? 2 : 1,
  height: ((i * 137.5) % 7) > 5.95 ? 2 : 1,
  left: `${(i * 137.5) % 100}%`,
  top: `${(i * 97.3 + 13) % 100}%`,
  baseOpacity: 0.04 + ((i * 31.7) % 100) / 100 * 0.15,
}))

export function ScrollStage() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [phase, setPhase] = useState<Phase>('void')
  // stars is a module-level constant but typed here for IDE clarity
  const stars = useMemo(() => STARS, [])
  const rafRef = useRef<number>(0)
  const pendingScrollRef = useRef<number | null>(null)

  useEffect(() => {
    // Use RAF-batched scroll updates to avoid layout thrashing
    const onScroll = () => {
      pendingScrollRef.current = window.scrollY
    }

    const tick = () => {
      if (pendingScrollRef.current !== null) {
        const scrollY = pendingScrollRef.current
        pendingScrollRef.current = null

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0

        setScrollProgress(progress)
        setPhase(
          progress < 0.08 ? 'void'
          : progress < 0.20 ? 'zoom'
          : 'inside'
        )
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Showing entering text between 12% and 18% of scroll
  const showEntering = scrollProgress > 0.12 && scrollProgress < 0.18

  return (
    <div className="relative" style={{ minHeight: '250vh' }}>

      {/* ── Background: Deep void nebula ── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: '#04050A',
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 20% 30%, rgba(124,92,255,0.09) 0%, transparent 65%),
            radial-gradient(ellipse 60% 80% at 80% 70%, rgba(124,58,237,0.07) 0%, transparent 65%),
            radial-gradient(ellipse 40% 40% at 50% 10%, rgba(246,185,76,0.035) 0%, transparent 60%),
            radial-gradient(ellipse 100% 100% at 50% 50%, rgba(4,5,10,0) 30%, rgba(4,5,10,0.8) 100%)
          `,
        }}
      />

      {/* ── Star field (deterministic, no flicker on scroll) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: star.width,
              height: star.height,
              left: star.left,
              top: star.top,
              background: `rgba(255,255,255,${star.baseOpacity.toFixed(3)})`,
              opacity: Math.max(0, 1 - scrollProgress * 1.5),
            }}
          />
        ))}
      </div>

      {/* ── Scroll progress bar ── */}
      <div
        className="fixed top-0 left-0 z-50 pointer-events-none"
        style={{
          height: 1,
          width: `${scrollProgress * 100}%`,
          background: 'linear-gradient(90deg, rgba(124,92,255,0.6), rgba(246,185,76,0.6))',
          transition: 'width 0.1s linear',
          boxShadow: '0 0 8px rgba(124,92,255,0.4)',
        }}
      />

      {/* ── Phase label (void phase only) ── */}
      {scrollProgress < 0.15 && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 6),
            transition: 'opacity 0.3s ease',
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <span
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.2)' }}
            >
              scroll to enter
            </span>
            <div className="flex flex-col gap-1 items-center">
              <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: 'rgba(124,92,255,0.6)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Void + Zoom phase: sticky viewport ── */}
      <div className="sticky top-0 h-screen z-10">
        <VoidPhase scrollProgress={scrollProgress} phase={phase} />
        <EnteringText visible={showEntering} />
      </div>

      {/* ── Inside phase: layered below, fades in at 20% ── */}
      <div
        className="relative z-20"
        style={{
          // Overlap with the sticky section so transition is seamless
          marginTop: '-100vh',
          // Only becomes interactive and visible at/after 20%
          pointerEvents: scrollProgress >= 0.20 ? 'auto' : 'none',
        }}
      >
        <InsidePhase scrollProgress={scrollProgress} />
      </div>
    </div>
  )
}
