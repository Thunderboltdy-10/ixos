'use client'
import { useCallback } from 'react'

export function usePulse() {
  const triggerPulse = useCallback((x: number, y: number, intensity: number = 1.0) => {
    if (typeof window === 'undefined') return
    const event = new CustomEvent('v4:pulse', {
      detail: { x, y, intensity },
    })
    window.dispatchEvent(event)
  }, [])

  return triggerPulse
}
