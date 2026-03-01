"use client"
import { useEffect, useRef } from 'react'

interface Particle {
  angle: number
  radius: number
  speed: number
  size: number
  opacity: number
  yOffset: number
  colorShift: number // 0=violet, 1=amber
}

export function OrbitalParticles({ fadeOpacity }: { fadeOpacity: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>(0)

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

    // 120 particles on elliptical orbits
    particlesRef.current = Array.from({ length: 120 }, (_, i) => ({
      angle: (i / 120) * Math.PI * 2 + Math.random() * 0.3,
      radius: 280 + Math.random() * 260,
      speed: 0.00015 + Math.random() * 0.00025,
      size: 0.8 + Math.random() * 2.2,
      opacity: 0.1 + Math.random() * 0.45,
      yOffset: (Math.random() - 0.5) * 120,
      colorShift: Math.random() > 0.85 ? 1 : 0, // 15% amber sparks
    }))

    // Secondary ring — tight fast inner ring
    const innerRing = Array.from({ length: 30 }, (_, i) => ({
      angle: (i / 30) * Math.PI * 2,
      radius: 200 + Math.random() * 60,
      speed: 0.0004 + Math.random() * 0.0003,
      size: 0.6 + Math.random() * 1,
      opacity: 0.08 + Math.random() * 0.2,
      yOffset: (Math.random() - 0.5) * 40,
      colorShift: 0,
    }))

    particlesRef.current = [...particlesRef.current, ...innerRing]

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cx = canvas.width / 2
      const cy = canvas.height / 2

      particlesRef.current.forEach(p => {
        p.angle += p.speed

        const x = cx + Math.cos(p.angle) * p.radius
        const y = cy + Math.sin(p.angle) * p.radius * 0.38 + p.yOffset

        // Depth fade: particles at back (top of ellipse) are dimmer
        const depthFactor = (Math.sin(p.angle) + 1) * 0.5 // 0=back, 1=front
        const finalOpacity = p.opacity * (0.3 + depthFactor * 0.7)

        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)

        if (p.colorShift > 0.5) {
          // Amber spark
          ctx.fillStyle = `rgba(246,185,76,${finalOpacity * 0.8})`
        } else {
          ctx.fillStyle = `rgba(124,92,255,${finalOpacity})`
        }
        ctx.fill()

        // Glow for larger particles
        if (p.size > 1.5) {
          ctx.beginPath()
          ctx.arc(x, y, p.size * 3, 0, Math.PI * 2)
          const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3)
          if (p.colorShift > 0.5) {
            grad.addColorStop(0, `rgba(246,185,76,${finalOpacity * 0.25})`)
          } else {
            grad.addColorStop(0, `rgba(124,92,255,${finalOpacity * 0.2})`)
          }
          grad.addColorStop(1, 'rgba(0,0,0,0)')
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
      style={{ opacity: fadeOpacity, transition: 'none' }}
    />
  )
}
