'use client'
import { useRef, useEffect, useState } from 'react'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'

function useScrollIntensity() {
  const [intensity, setIntensity] = useState(1)

  useEffect(() => {
    const onScroll = () => {
      const progress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      let val: number
      if (progress < 0.2) {
        val = 0.8 - progress * 2.5
      } else if (progress < 0.6) {
        val = 0.3 - (progress - 0.2) * 0.375
      } else {
        val = 0.15
      }
      const next = Math.max(0.15, val)
      setIntensity(prev => {
        if (Math.abs(prev - next) < 0.005) return prev
        return next
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return intensity
}

interface Pixel {
  x: number
  y: number
  vx: number
  vy: number
  originX: number
  originY: number
  size: number
  brightness: number
  hue: number
  wanderPhase: number
}

interface Wave {
  cx: number
  cy: number
  radius: number
  maxRadius: number
  speed: number
  intensity: number
  hue: number
  createdAt: number
}

function hueToRGB(hue: number): [number, number, number] {
  if (hue < 0.165) return [45, 212, 191]
  if (hue < 0.495) return [245, 158, 11]
  return [124, 58, 237]
}

function PixelWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const pixelsRef = useRef<Pixel[]>([])
  const wavesRef = useRef<Wave[]>([])
  const lastFrameRef = useRef<number>(0)
  const dimsRef = useRef<{ W: number; H: number; dpr: number }>({ W: 0, H: 0, dpr: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const CELL_SIZE = 140 // Much larger cells = fewer particles

    function buildGrid(W: number, H: number) {
      const px: Pixel[] = []
      const cols = Math.ceil(W / CELL_SIZE) + 1
      const rows = Math.ceil(H / CELL_SIZE) + 1
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rand = Math.random()
          const size = rand < 0.8 ? 6 : 10
          const hueRand = Math.random()
          const hue = hueRand < 0.33 ? 0 : hueRand < 0.66 ? 0.33 : 0.66
          const originX = c * CELL_SIZE + (Math.random() - 0.5) * 20
          const originY = r * CELL_SIZE + (Math.random() - 0.5) * 20
          px.push({
            x: originX,
            y: originY,
            vx: 0,
            vy: 0,
            originX,
            originY,
            size,
            brightness: 0,
            hue,
            wanderPhase: Math.random() * Math.PI * 2,
          })
        }
      }
      pixelsRef.current = px
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const W = window.innerWidth
      const H = window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dimsRef.current = { W, H, dpr }
      buildGrid(W, H)
      spawnWave(W / 2, H / 2, 0.2, 0.1, Math.min(W, H) * 1.2, 0)
    }

    function spawnWave(
      cx: number,
      cy: number,
      intensity: number,
      speed: number,
      maxRadius: number,
      hue: number
    ) {
      wavesRef.current.push({
        cx, cy,
        radius: 0,
        maxRadius,
        speed: speed * 0.4, // Slower ripples
        intensity,
        hue,
        createdAt: performance.now(),
      })
    }

    const initTimer = setTimeout(() => {
      const { W, H } = dimsRef.current
      spawnWave(W / 2, H / 2, 0.3, 0.1, 1.5 * Math.hypot(W / 2, H / 2), 0)
    }, 50)

    const autoWaveInterval = setInterval(() => {
      const { W, H } = dimsRef.current
      const x = Math.random() * W
      const y = Math.random() * H
      const hues = [0, 0.33, 0.66]
      const hue = hues[Math.floor(Math.random() * hues.length)]
      spawnWave(x, y, 0.2, 0.12, Math.hypot(W, H), hue)
    }, 6000)

    function onPulse(e: Event) {
      const ce = e as CustomEvent<{ x: number; y: number; intensity: number }>
      const { x, y, intensity } = ce.detail
      const { W, H } = dimsRef.current
      spawnWave(x, y, intensity * 0.8, 0.15, 0.8 * Math.hypot(W, H), 0)
    }
    window.addEventListener('v4:pulse', onPulse)

    function draw(ts: number) {
      const dt = Math.min(ts - lastFrameRef.current, 50)
      lastFrameRef.current = ts

      const { W, H } = dimsRef.current
      const pixels = pixelsRef.current
      const waves = wavesRef.current

      for (let wi = waves.length - 1; wi >= 0; wi--) {
        const wave = waves[wi]
        wave.radius += wave.speed * dt

        const lo = wave.radius - 40
        const hi = wave.radius + 20

        for (let pi = 0; pi < pixels.length; pi++) {
          const p = pixels[pi]
          const dx = p.x - wave.cx
          const dy = p.y - wave.cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist >= lo && dist <= hi) {
            const force = wave.intensity * Math.max(0, 1 - Math.abs(dist - wave.radius) / 30)
            p.brightness = Math.min(1, p.brightness + force * 0.6)
            p.hue = p.hue * 0.85 + wave.hue * 0.15

            if (dist > 0) {
              const pushX = (dx / dist) * force * 0.3
              const pushY = (dy / dist) * force * 0.3
              p.vx += pushX
              p.vy += pushY
            }
          }
        }

        if (wave.radius > wave.maxRadius) {
          waves.splice(wi, 1)
        }
      }

      ctx.fillStyle = '#0C0E10'
      ctx.fillRect(0, 0, W, H)

      for (let pi = 0; pi < pixels.length; pi++) {
        const p = pixels[pi]

        p.wanderPhase += dt * 0.001
        const wanderX = Math.sin(p.wanderPhase) * 0.1
        const wanderY = Math.cos(p.wanderPhase * 0.8) * 0.1

        const dxOrigin = p.originX - p.x
        const dyOrigin = p.originY - p.y
        p.vx += dxOrigin * 0.01 + wanderX
        p.vy += dyOrigin * 0.01 + wanderY

        p.vx *= 0.85
        p.vy *= 0.85

        p.x += p.vx
        p.y += p.vy

        p.brightness *= 0.96

        // Reduced baseline visibility and alpha for more controlled look
        const alpha = Math.max(0.02, p.brightness * 0.3)
        const [r, g, b] = hueToRGB(p.hue)

        // Subtle glow only for very bright squares
        if (p.brightness > 0.2) {
          ctx.shadowBlur = p.size * 2
          ctx.shadowColor = `rgba(${r},${g},${b},${p.brightness * 0.15})`
        } else {
          ctx.shadowBlur = 0
        }

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.fillRect(
          p.x - p.size / 2,
          p.y - p.size / 2,
          p.size,
          p.size
        )
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize, { passive: true })
    resize()
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(initTimer)
      clearInterval(autoWaveInterval)
      window.removeEventListener('resize', resize)
      window.removeEventListener('v4:pulse', onPulse)
    }
  }, [])

  const intensity = useScrollIntensity()

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: intensity,
        transition: 'opacity 0.15s linear',
      }}
    />
  )
}

function StaticAmbient() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: '#0C0E10',
        backgroundImage: `
          radial-gradient(circle, rgba(45,212,191,0.02) 1px, transparent 1px),
          radial-gradient(circle, rgba(124,58,237,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px, 48px 48px',
      }}
    />
  )
}

export function V4AmbientField() {
  const lowEnd = useReducedOrLowEnd()
  return lowEnd ? <StaticAmbient /> : <PixelWaveCanvas />
}
