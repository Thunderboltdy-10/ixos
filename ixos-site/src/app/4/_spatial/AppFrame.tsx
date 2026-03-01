"use client"
import { DemoSurface } from '../../../landing/DemoSurface'
import type { ReactNode } from 'react'

interface AppFrameProps {
  glowOpacity: number
  scanLineOpacity: number
  children?: ReactNode
}

export function AppFrame({ glowOpacity, scanLineOpacity, children }: AppFrameProps) {
  const glow = Math.max(0, Math.min(glowOpacity, 1))

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 'min(1400px, 98vw)',
        height: 'min(850px, 92vh)',
        borderRadius: 14,
        border: `1px solid rgba(124,92,255,${0.3 * glow + 0.08})`,
        boxShadow: `
          0 0 ${80 * glow}px rgba(124,92,255,${0.35 * glow}),
          0 0 ${160 * glow}px rgba(124,92,255,${0.12 * glow}),
          0 ${40 * glow}px 80px rgba(0,0,0,0.7),
          inset 0 0 40px rgba(124,92,255,${0.05 * glow})
        `,
        background: 'rgba(10,12,16,0.98)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* CRT scan line overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          opacity: scanLineOpacity * 0.05,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)',
          backgroundSize: '100% 3px',
        }}
      />

      {/* Title bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 relative z-10 shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(6,8,12,0.92)',
        }}
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.55)' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(234,179,8,0.55)' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(34,197,94,0.55)' }} />
        </div>

        {/* Center title */}
        <div className="flex-1 flex items-center justify-center">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: '0.35em', color: 'rgba(243,245,247,0.3)' }}
          >
            IXOS PROTOCOL — Local Search Engine
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: '#22c55e',
              boxShadow: '0 0 6px rgba(34,197,94,0.8)',
            }}
          />
          <span className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
            local · 0 bytes to cloud
          </span>
        </div>
      </div>

      {/* Content area - either custom children or DemoSurface */}
      <div className="relative" style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
        {children ? children : (
          <DemoSurface
            initialQuery="authentication token refresh"
            autoRun={true}
            style={{ height: '100%', overflow: 'hidden' }}
          />
        )}
      </div>
    </div>
  )
}
