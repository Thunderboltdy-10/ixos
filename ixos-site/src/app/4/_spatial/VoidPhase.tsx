"use client"
import { OrbitalParticles } from './OrbitalParticles'
import { AppFrame } from './AppFrame'

interface Props {
  scrollProgress: number
  phase: 'void' | 'zoom' | 'inside'
}

// Smooth cubic easing
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function VoidPhase({ scrollProgress, phase }: Props) {
  // --- Phase 1: void float (0 → 0.25) ---
  const voidT = clamp(scrollProgress / 0.25, 0, 1)

  // --- Phase 2: zoom-in (0.25 → 0.50) ---
  const zoomRaw = clamp((scrollProgress - 0.25) / 0.25, 0, 1)
  const zoomT = easeInOutCubic(zoomRaw)

  // Transform values
  // Phase 1: gentle drift toward camera (slight float feel)
  const floatTranslateZ = voidT * 100 // 0 → 100px as we scroll in void
  // Phase 2: rush forward into frame
  const zoomTranslateZ = zoomT * 600  // 100 → 700px total

  const translateZ = -700 + floatTranslateZ + zoomTranslateZ

  // Scale: starts tiny, grows to full
  const scale = 0.42 + voidT * 0.15 + zoomT * 0.43

  // Rotation: gentle tilt in void, straightens as we zoom
  const rotateX = (8 - voidT * 3) * (1 - zoomT)
  const rotateY = (-5 + voidT * 2) * (1 - zoomT)

  // Opacity: fades in during void, full during zoom
  const opacity = 0.55 + voidT * 0.35 + zoomT * 0.1

  // Glow: bright in void, fades as we enter
  const glowOpacity = 1 - zoomT * 1.2
  const scanLineOpacity = 0.6 + voidT * 0.4

  // Particles: orbit in void, fade during zoom
  const particleFade = clamp(1 - zoomRaw * 2.5, 0, 1)

  // During inside phase, hide everything
  const frameVisible = scrollProgress < 0.55

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Orbital particles */}
      <OrbitalParticles fadeOpacity={particleFade} />

      {/* Nebula gradient rings around app — visible in void phase */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 900,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(124,92,255,${0.04 * (1 - zoomT)}) 0%, transparent 70%)`,
          opacity: 1 - zoomT,
          transform: 'scale(1.8)',
        }}
      />

      {/* The floating app frame */}
      {frameVisible && (
        <div
          style={{
            transform: `perspective(1400px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
            opacity: clamp(opacity, 0, 1),
            willChange: 'transform, opacity',
            // No CSS transition — purely scroll-driven
          }}
        >
          <AppFrame glowOpacity={clamp(glowOpacity, 0, 1)} scanLineOpacity={scanLineOpacity} />
        </div>
      )}

      {/* Ambient floor glow */}
      <div
        className="absolute bottom-0 left-1/2 pointer-events-none"
        style={{
          transform: 'translateX(-50%)',
          width: 800,
          height: 200,
          background: `radial-gradient(ellipse 80% 100% at 50% 100%, rgba(124,92,255,${0.06 * (1 - zoomT * 0.8)}) 0%, transparent 70%)`,
          opacity: 1 - zoomT * 0.7,
        }}
      />
    </div>
  )
}
