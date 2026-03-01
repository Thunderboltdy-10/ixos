'use client'
import { useRef, useEffect, useState } from 'react'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'

function useScrollIntensity() {
  const [intensity, setIntensity] = useState(1)

  useEffect(() => {
    const onScroll = () => {
      const progress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      // Full intensity in hero, dims aggressively as you scroll:
      // 0%   scroll → 1.0
      // 20%  scroll → 0.5
      // 60%  scroll → 0.25
      // 100% scroll → 0.15
      let val: number
      if (progress < 0.2) {
        val = 1 - progress * 2.5  // 1.0 → 0.5
      } else if (progress < 0.6) {
        val = 0.5 - (progress - 0.2) * 0.625  // 0.5 → 0.25
      } else {
        val = 0.25 - (progress - 0.6) * 0.25   // 0.25 → 0.15
      }
      setIntensity(Math.max(0.15, val))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return intensity
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pixel {
  x: number
  y: number
  size: number       // 5 (90%) or 9 (10%)
  brightness: number // 0.0 to 1.0, decays toward 0
  hue: number        // 0=cyan, 0.33=amber, 0.66=violet
}

interface Wave {
  cx: number
  cy: number
  radius: number
  maxRadius: number
  speed: number      // px per ms
  intensity: number
  hue: number        // wave color bias
  createdAt: number
}

// ─── Color lookup ─────────────────────────────────────────────────────────────

function hueToRGB(hue: number): [number, number, number] {
  if (hue < 0.165) return [45, 212, 191]   // cyan   0
  if (hue < 0.495) return [245, 158, 11]   // amber  0.33
  return [124, 58, 237]                     // violet 0.66
}

// ─── Canvas implementation ────────────────────────────────────────────────────

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

    const CELL_SIZE = 22

    // ── Grid initialisation ─────────────────────────────────────────────────
    function buildGrid(W: number, H: number) {
      const px: Pixel[] = []
      const cols = Math.ceil(W / CELL_SIZE) + 1
      const rows = Math.ceil(H / CELL_SIZE) + 1
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rand = Math.random()
          const size = rand < 0.90 ? 5 : 9
          const hueRand = Math.random()
          const hue = hueRand < 0.33 ? 0 : hueRand < 0.66 ? 0.33 : 0.66
          px.push({
            x: c * CELL_SIZE,
            y: r * CELL_SIZE,
            size,
            brightness: 0,
            hue,
          })
        }
      }
      pixelsRef.current = px
    }

    // ── Resize handler ──────────────────────────────────────────────────────
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
      // Trigger a gentle wave from center on resize
      spawnWave(W / 2, H / 2, 0.25, 0.10, Math.min(W, H) * 0.8, 0)
    }

    // ── Wave factory ────────────────────────────────────────────────────────
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
        speed,
        intensity,
        hue,
        createdAt: performance.now(),
      })
    }

    // ── Initial center wave ─────────────────────────────────────────────────
    // Deferred so dims are set first
    const initTimer = setTimeout(() => {
      const { W, H } = dimsRef.current
      spawnWave(
        W / 2, H / 2,
        0.4,
        0.10,
        1.5 * Math.hypot(W / 2, H / 2),
        0
      )
    }, 50)

    // ── Auto-wave every 5s ──────────────────────────────────────────────────
    const autoWaveInterval = setInterval(() => {
      const { W, H } = dimsRef.current
      const x = Math.random() * W
      const y = Math.random() * H
      const hues = [0, 0.33, 0.66]
      const hue = hues[Math.floor(Math.random() * hues.length)]
      spawnWave(x, y, 0.25, 0.12, Math.hypot(W, H), hue)
    }, 5000)

    // ── Pulse event listener ────────────────────────────────────────────────
    function onPulse(e: Event) {
      const ce = e as CustomEvent<{ x: number; y: number; intensity: number }>
      const { x, y, intensity } = ce.detail
      const { W, H } = dimsRef.current
      spawnWave(x, y, intensity, 0.15, 0.8 * Math.hypot(W, H), 0)
    }
    window.addEventListener('v4:pulse', onPulse)

    // ── Animation loop ──────────────────────────────────────────────────────
    function draw(ts: number) {
      const dt = Math.min(ts - lastFrameRef.current, 50)
      lastFrameRef.current = ts

      const { W, H } = dimsRef.current
      const pixels = pixelsRef.current
      const waves = wavesRef.current

      // Advance waves
      for (let wi = waves.length - 1; wi >= 0; wi--) {
        const wave = waves[wi]
        wave.radius += wave.speed * dt

        // Influence nearby pixels
        const lo = wave.radius - 18
        const hi = wave.radius + 6

        for (let pi = 0; pi < pixels.length; pi++) {
          const p = pixels[pi]
          const dx = p.x - wave.cx
          const dy = p.y - wave.cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist >= lo && dist <= hi) {
            const boost = wave.intensity * Math.max(0, 1 - Math.abs(dist - wave.radius) / 18)
            p.brightness = Math.min(1, p.brightness + boost * 0.6)
            // Nudge hue toward wave hue (weighted blend)
            p.hue = p.hue * 0.85 + wave.hue * 0.15
          }
        }

        if (wave.radius > wave.maxRadius) {
          waves.splice(wi, 1)
        }
      }

      // Decay all pixels
      for (let pi = 0; pi < pixels.length; pi++) {
        pixels[pi].brightness *= 0.97
      }

      // Render
      ctx.fillStyle = '#0C0E10'
      ctx.fillRect(0, 0, W, H)

      for (let pi = 0; pi < pixels.length; pi++) {
        const p = pixels[pi]
        if (p.brightness < 0.002) continue
        const alpha = p.brightness * 0.12
        const [r, g, b] = hueToRGB(p.hue)
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

// ─── Static fallback ──────────────────────────────────────────────────────────

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
          radial-gradient(circle, rgba(45,212,191,0.018) 1px, transparent 1px),
          radial-gradient(circle, rgba(124,58,237,0.012) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px, 48px 48px',
      }}
    />
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function V4AmbientField() {
  const lowEnd = useReducedOrLowEnd()
  return lowEnd ? <StaticAmbient /> : <PixelWaveCanvas />
}
