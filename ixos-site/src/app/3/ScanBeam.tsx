"use client";

import { useEffect, useState } from 'react'

export function ScanBeam({ onProgress }: { onProgress?: (y: number) => void }) {
  const [y, setY] = useState(-5)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const start = performance.now()
    const dur = 3500
    const tick = (now: number) => {
      const progress = Math.min((now - start) / dur, 1)
      const newY = -5 + progress * 120
      setY(newY)
      onProgress?.(newY)
      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        setDone(true)
      }
    }
    const frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [onProgress])

  if (done) return null

  return (
    <div
      className="fixed left-0 right-0 pointer-events-none z-40"
      style={{ top: `${y}vh` }}
    >
      {/* The beam line */}
      <div
        style={{
          height: '2px',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(246,185,76,0.8) 20%, rgba(246,185,76,1) 50%, rgba(246,185,76,0.8) 80%, transparent 100%)',
          boxShadow: '0 0 16px 3px rgba(246,185,76,0.4)',
        }}
      />
      {/* Gradient fade below beam */}
      <div
        style={{
          height: '80px',
          background:
            'linear-gradient(to bottom, rgba(246,185,76,0.06) 0%, transparent 100%)',
        }}
      />
    </div>
  )
}
