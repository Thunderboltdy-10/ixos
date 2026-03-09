"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { VoidPhase } from './VoidPhase'
import { InsidePhase } from './InsidePhase'
import { useV4Layout } from '../V4LayoutState'

type Phase = 'void' | 'zoom' | 'inside'

// Precomputed deterministic particle attributes — squared style
const STARS = Array.from({ length: 45 }, (_, i) => {
  const isLarge = ((i * 137.5) % 10) > 7;
  const size = isLarge ? 12 : 5;
  return {
    width: size,
    height: size,
    left: `${(i * 137.5) % 100}%`,
    top: `${(i * 97.3 + 13) % 100}%`,
    baseOpacity: 0.12 + ((i * 31.7) % 100) / 100 * 0.15,
    borderRadius: 1, // subtle rounding for the "pixels"
  };
});

export function ScrollStage() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [phase, setPhase] = useState<Phase>('void')
  const [enterProgress, setEnterProgress] = useState(0) // 0 to 1 time-based
  const stars = useMemo(() => STARS, [])
  const rafRef = useRef<number>(0)
  const pendingScrollRef = useRef<number | null>(null)
  const { setSidebarVisible } = useV4Layout()

  // Time-driven enter animation
  useEffect(() => {
    const startTime = performance.now()
    const voidDuration = 400
    const zoomDuration = 1200

    const tick = (now: number) => {
      const elapsed = now - startTime
      if (elapsed < voidDuration) {
        setPhase('void')
        setEnterProgress(elapsed / voidDuration * 0.2) // 0 to 0.2
      } else if (elapsed < voidDuration + zoomDuration) {
        setPhase('zoom')
        setEnterProgress(0.2 + ((elapsed - voidDuration) / zoomDuration) * 0.8) // 0.2 to 1.0
      } else {
        setPhase('inside')
        setEnterProgress(1)
        setSidebarVisible(true) // Show sidebar when phase inside is reached
        return // done
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [setSidebarVisible])

  // Scroll-driven progress for InsidePhase
  useEffect(() => {
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

  return (
    <div className="relative bg-[#04050A]" style={{ minHeight: '400vh' }}>
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

      {/* ── Hologram Projector Effect ── */}
      <div
        className="fixed bottom-[-10vh] left-1/2 -translate-x-1/2 w-[100vw] h-[40vh] z-10 pointer-events-none transition-opacity duration-1000"
        style={{
          opacity: phase === 'inside' ? 1 : 0,
          background: 'radial-gradient(ellipse at bottom, rgba(45,212,191,0.15) 0%, transparent 70%)',
          borderBottom: '2px solid rgba(45,212,191,0.5)',
          filter: 'blur(30px)',
        }}
      />

      {/* ── Star field (deterministic, fades out during enter) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: star.width,
              height: star.height,
              left: star.left,
              top: star.top,
              background: `rgba(255,255,255,${star.baseOpacity.toFixed(3)})`,
              opacity: Math.max(0, 1 - enterProgress * 1.5),
              borderRadius: star.borderRadius,
            }}
          />
        ))}
      </div>

      {/* ── Scroll progress bar ── */}
      <div
        className="fixed top-0 left-0 z-50 pointer-events-none"
        style={{
          height: 2,
          width: `${scrollProgress * 100}%`,
          background: 'linear-gradient(90deg, rgba(124,92,255,0.6), rgba(246,185,76,0.6))',
          transition: 'width 0.1s linear',
          boxShadow: '0 0 12px rgba(124,92,255,0.6)',
          opacity: phase === 'inside' ? 1 : 0,
        }}
      />

      {/* ── Void + Zoom phase: sticky viewport ── */}
      {phase !== 'inside' && (
        <div className="fixed inset-0 z-10 pointer-events-none">
          <VoidPhase enterProgress={enterProgress} phase={phase} />
        </div>
      )}

      {/* ── Inside phase: layered below, fades in fully at phase inside ── */}
      <div
        className="relative z-20"
        style={{
          opacity: enterProgress > 0.7 ? (enterProgress - 0.7) * 3.33 : 0, // fade in at the very end
          transform: `scale(${enterProgress > 0.7 ? 0.9 + ((enterProgress - 0.7) * 3.33) * 0.1 : 0.9})`, // scale from 0.9 to 1.0
          pointerEvents: phase === 'inside' ? 'auto' : 'none',
        }}
      >
        <InsidePhase scrollProgress={scrollProgress} />
      </div>
    </div>
  )
}
