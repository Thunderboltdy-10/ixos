"use client";

import { OrbitalParticles } from './OrbitalParticles'
import { AppFrame } from './AppFrame'

interface Props {
  enterProgress: number
  phase: 'void' | 'zoom' | 'inside'
}

// Smooth cubic easing
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function VoidPhase({ enterProgress, phase }: Props) {
  // enterProgress: 0 to 0.2 (void), 0.2 to 1.0 (zoom)

  const voidT = clamp(enterProgress / 0.2, 0, 1)
  const zoomRaw = clamp((enterProgress - 0.2) / 0.8, 0, 1)
  const zoomT = easeInOutCubic(zoomRaw)

  // Phase 1: gentle drift
  const floatTranslateZ = voidT * 80
  // Phase 2: rush forward into frame - exponential curve for massive depth zoom
  const zoomTranslateZ = Math.pow(zoomT, 3) * 2500

  const translateZ = -600 + floatTranslateZ + zoomTranslateZ

  // Scale: dramatically increase scale at the very end to swallow the camera
  const scale = 1.0 - voidT * 0.05 + Math.pow(zoomT, 4) * 4.0

  // Rotation: straightens as we zoom
  const rotateX = (6 - voidT * 2) * (1 - Math.pow(zoomT, 0.5))
  const rotateY = (-4 + voidT * 1.5) * (1 - Math.pow(zoomT, 0.5))

  const opacity = 0.75 + voidT * 0.15 + (zoomT < 0.9 ? zoomT * 0.1 : (1 - zoomT) * 1)
  const glowOpacity = 1 - zoomT * 0.5
  const scanLineOpacity = 0.5 + voidT * 0.5

  const particleFade = clamp(1 - zoomRaw * 2.2, 0, 1)

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <OrbitalParticles fadeOpacity={particleFade} scrollProgress={enterProgress} />

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

      <div
        style={{
          transform: `perspective(1400px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
          opacity: opacity,
          willChange: 'transform, opacity',
        }}
      >
        <AppFrame glowOpacity={clamp(glowOpacity, 0, 1)} scanLineOpacity={scanLineOpacity} />
      </div>

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
