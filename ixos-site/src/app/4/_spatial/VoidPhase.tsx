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
  // --- Phase 1: void float (0 → 0.08) ---
  const voidT = clamp(scrollProgress / 0.08, 0, 1)

  // --- Phase 2: zoom-in (0.08 → 0.20) ---
  const zoomRaw = clamp((scrollProgress - 0.08) / 0.12, 0, 1)
  const zoomT = easeInOutCubic(zoomRaw)

  // Transform values
  // Phase 1: gentle drift toward camera (slight float feel)
  const floatTranslateZ = voidT * 80 // 0 → 80px as we scroll in void
  // Phase 2: rush forward into frame — seamless continuous motion
  const zoomTranslateZ = zoomT * 520  // total 600px of Z travel

  const translateZ = -600 + floatTranslateZ + zoomTranslateZ

  // Scale: starts at 1.0 (show full size immediately), slight shrink during void then grow
  // void: 1.0 → 0.95, zoom: 0.95 → 1.0
  const scale = 1.0 - voidT * 0.05 + zoomT * 0.05

  // Rotation: gentle tilt in void, straightens as we zoom
  const rotateX = (6 - voidT * 2) * (1 - zoomT)
  const rotateY = (-4 + voidT * 1.5) * (1 - zoomT)

  // Opacity: fades in nicely during void, full during zoom
  const opacity = 0.75 + voidT * 0.15 + zoomT * 0.1

  // Glow: bright in void, fades as we enter
  const glowOpacity = 1 - zoomT * 1.2
  const scanLineOpacity = 0.5 + voidT * 0.5

  // Particles: orbit in void, move WITH the app then fade
  const particleFade = clamp(1 - zoomRaw * 2.2, 0, 1)

  // During inside phase, fade out gradually instead of hard cut
  const frameOpacity = scrollProgress < 0.18 ? 1 : Math.max(0, 1 - (scrollProgress - 0.18) / 0.06)
  const frameVisible = frameOpacity > 0.01

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Orbital particles — aware of scroll for compression effect */}
      <OrbitalParticles fadeOpacity={particleFade} scrollProgress={scrollProgress} />

      {/* Nebula gradient rings around app — visible in void phase */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 1100,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(124,92,255,${0.05 * (1 - zoomT)}) 0%, transparent 70%)`,
          opacity: 1 - zoomT,
          transform: 'scale(1.6)',
        }}
      />

      {/* The floating app frame */}
      {frameVisible && (
        <div
          style={{
            transform: `perspective(1400px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
            opacity: clamp(frameOpacity * opacity, 0, 1),
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
          width: 900,
          height: 250,
          background: `radial-gradient(ellipse 80% 100% at 50% 100%, rgba(124,92,255,${0.07 * (1 - zoomT * 0.8)}) 0%, transparent 70%)`,
          opacity: 1 - zoomT * 0.7,
        }}
      />
    </div>
  )
}
