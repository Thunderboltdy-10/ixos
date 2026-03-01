"use client"
import { useEffect, useRef } from 'react'

// Deterministic particle data — no Math.random() in render or initialization
// Using golden-ratio spacing and prime-based pseudo-randomness
const MAIN_PARTICLES = Array.from({ length: 120 }, (_, i) => ({
  angle: (i / 120) * Math.PI * 2 + ((i * 0.618) % 1) * 0.3,
  radius: 280 + ((i * 137.508) % 260),
  speed: 0.00015 + ((i * 73.1) % 100) / 100 * 0.00025,
  size: 0.8 + ((i * 41.7) % 100) / 100 * 2.2,
  opacity: 0.1 + ((i * 61.3) % 100) / 100 * 0.45,
  yOffset: (((i * 53.9) % 100) / 100 - 0.5) * 120,
  colorShift: ((i * 17.3) % 100) > 85 ? 1 : 0, // ~15% amber
}))

const INNER_PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  angle: (i / 30) * Math.PI * 2,
  radius: 200 + ((i * 83.1) % 60),
  speed: 0.0004 + ((i * 29.7) % 100) / 100 * 0.0003,
  size: 0.6 + ((i * 67.3) % 100) / 100 * 1.0,
  opacity: 0.08 + ((i * 43.1) % 100) / 100 * 0.2,
  yOffset: (((i * 37.9) % 100) / 100 - 0.5) * 40,
  colorShift: 0,
}))

const ALL_PARTICLES = [...MAIN_PARTICLES, ...INNER_PARTICLES]

interface OrbitalParticlesProps {
  fadeOpacity: number
  // scrollProgress 0..1 — used to compress orbits toward center
  scrollProgress?: number
}

export function OrbitalParticles({ fadeOpacity, scrollProgress = 0 }: OrbitalParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const anglesRef = useRef<number[]>(ALL_PARTICLES.map(p => p.angle))
  const frameRef = useRef<number>(0)
  const scrollRef = useRef(scrollProgress)

  // Keep scrollRef in sync without re-running the animation loop
  useEffect(() => {
    scrollRef.current = scrollProgress
  }, [scrollProgress])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const sp = scrollRef.current

      // Phase 1 (0-0.25): orbit normally, sinusoidal drift
      // Phase 2 (0.25-0.5): compress inward toward center, fade by 0.45
      // Phase 3 (0.5+): invisible
      const zoomPhase = Math.max(0, (sp - 0.25) / 0.25) // 0..1 during zoom

      // Sinusoidal time-based drift for x: particles move WITH the app approach
      const time = performance.now() * 0.001

      ALL_PARTICLES.forEach((p, i) => {
        anglesRef.current[i] += p.speed

        const angle = anglesRef.current[i]

        // Base orbit position
        const baseX = cx + Math.cos(angle) * p.radius
        const baseY = cy + Math.sin(angle) * p.radius * 0.38 + p.yOffset

        // Sinusoidal lateral drift — moves with the camera zoom
        const drift = Math.sin(time * 0.4 + p.opacity * 12) * 8 * (1 - zoomPhase)

        // As zoom increases, compress particles toward center (simulate moving WITH app)
        const compressX = baseX + drift + (cx - baseX) * zoomPhase * zoomPhase * 1.2
        const compressY = baseY + (cy - baseY) * zoomPhase * zoomPhase * 1.2

        const x = compressX
        const y = compressY

        // Depth fade
        const depthFactor = (Math.sin(angle) + 1) * 0.5
        const finalOpacity = p.opacity * (0.3 + depthFactor * 0.7)

        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)

        if (p.colorShift > 0.5) {
          ctx.fillStyle = `rgba(246,185,76,${finalOpacity * 0.8})`
        } else {
          ctx.fillStyle = `rgba(124,92,255,${finalOpacity})`
        }
        ctx.fill()

        // Glow for larger particles
        if (p.size > 1.5) {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3)
          if (p.colorShift > 0.5) {
            grad.addColorStop(0, `rgba(246,185,76,${finalOpacity * 0.25})`)
          } else {
            grad.addColorStop(0, `rgba(124,92,255,${finalOpacity * 0.2})`)
          }
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.beginPath()
          ctx.arc(x, y, p.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
        }
      })

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ opacity: fadeOpacity, transition: 'none', zIndex: 1 }}
    />
  )
}
