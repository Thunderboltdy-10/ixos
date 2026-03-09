'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ConnectorComponent } from './types'

const SCAN_PATHS = [
  "src/auth/token-manager.ts",
  "src/api/rate-limiter.rs",
  "db/migrations/003_add_refresh.sql",
  "src/core/embeddings/indexer.rs",
  "docs/architecture/caching.md",
  "src/ui/components/Navbar.tsx",
  "src/utils/crypto/hmac.c",
  "tests/e2e/auth_flow.spec.ts",
  "src/storage/lru_cache.rs",
  "packages/core/package.json",
  "src/models/flash_v2.bin",
  "src/config/telemetry_bypass.go"
]

export const SearchResultStackConnector: ConnectorComponent = ({
  sections,
  activeSectionId,
  sectionMap,
  pulseAt
}) => {
  const [phase, setPhase] = useState<'idle' | 'typing' | 'searching' | 'streaming'>('idle')
  const [typedQuery, setTypedQuery] = useState('')
  const [scanLines, setScanLines] = useState<{ id: number; path: string; x: number; y: number; speed: number }[]>([])
  
  const queryToType = 'ixos search "privacy-first file search" --dir ./project --progressive'
  const maxSections = sectionMap.length

  // Calculate revealed count
  const revealedCount = sections.filter(s => s.inView || sections.indexOf(s) <= sections.findIndex(sec => sec.inView)).length || 1
  const prevRevealed = useRef(revealedCount)

  // Trigger pulse effect when new result reveals
  const [pulses, setPulses] = useState<{ id: number; y: number }[]>([])

  useEffect(() => {
    if (revealedCount > prevRevealed.current) {
      // Find the y position of the newly revealed section
      const newlyRevealed = sections[revealedCount - 1]
      if (newlyRevealed && newlyRevealed.node && typeof newlyRevealed.node.getBoundingClientRect === 'function') {
        const y = newlyRevealed.node.getBoundingClientRect().top + window.scrollY
        setPulses(p => [...p, { id: Date.now(), y }])
        setTimeout(() => {
          setPulses(p => p.slice(1))
        }, 2000)
      }
    }
    prevRevealed.current = revealedCount
  }, [revealedCount, sections])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let charIndex = 0

    if (phase === 'idle') {
      timeoutId = setTimeout(() => setPhase('typing'), 500)
    } else if (phase === 'typing') {
      const typeNextChar = () => {
        if (charIndex < queryToType.length) {
          setTypedQuery(queryToType.substring(0, charIndex + 1))
          charIndex++
          timeoutId = setTimeout(typeNextChar, 30)
        } else {
          setPhase('searching')
        }
      }
      typeNextChar()
    } else if (phase === 'searching') {
      // Matrix rain of paths
      const generateScanLine = () => {
        setScanLines(lines => [
          ...lines.slice(-20),
          {
            id: Date.now() + Math.random(),
            path: SCAN_PATHS[Math.floor(Math.random() * SCAN_PATHS.length)],
            x: Math.random() * 100,
            y: -10,
            speed: 1 + Math.random() * 2
          }
        ])
      }
      const scanInterval = setInterval(generateScanLine, 50)
      timeoutId = setTimeout(() => {
        clearInterval(scanInterval)
        setPhase('streaming')
      }, 1500)
      return () => {
        clearInterval(scanInterval)
        clearTimeout(timeoutId)
      }
    }

    return () => clearTimeout(timeoutId)
  }, [phase])

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] font-mono">
      
      {/* Cinematic Pulses on New Result */}
      <AnimatePresence>
        {pulses.map(pulse => (
          <motion.div
            key={pulse.id}
            initial={{ opacity: 0.8, scale: 0.8, y: pulse.y - window.scrollY }}
            animate={{ opacity: 0, scale: 1.5, y: pulse.y - window.scrollY }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-5xl h-[1px] bg-cyan-400 shadow-[0_0_40px_10px_rgba(34,211,238,0.5)]"
          />
        ))}
      </AnimatePresence>

      {/* Searching Phase Matrix Rain */}
      <AnimatePresence>
        {phase === 'searching' && scanLines.map(line => (
          <motion.div
            key={line.id}
            initial={{ opacity: 0, top: '-5%' }}
            animate={{ opacity: [0, 0.5, 0], top: '105%' }}
            transition={{ duration: line.speed, ease: "linear" }}
            className="absolute whitespace-nowrap text-[10px] text-cyan-500/40"
            style={{ left: `${line.x}%` }}
          >
            {line.path}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Top Terminal Strip */}
      <div 
        className="absolute top-[62px] left-0 right-0 h-14 bg-gradient-to-b from-[#0C0E10] to-[#0C0E10]/80 backdrop-blur-xl border-b border-cyan-500/20 flex items-center px-8"
        style={{ zIndex: 100 }}
      >
        <div className="flex items-center gap-4 w-full max-w-7xl mx-auto">
          <span className="text-cyan-500 font-bold">{'>'}</span>
          <span className="text-[#F3F5F7] text-sm tracking-wide">
            {typedQuery}
            {phase !== 'streaming' && (
              <motion.span 
                animate={{ opacity: [1, 0] }} 
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-2 h-4 bg-cyan-400 ml-1 align-middle shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              />
            )}
          </span>
          
          <div className="ml-auto flex items-center gap-4">
            {phase === 'searching' && (
              <span className="text-cyan-400 text-xs uppercase tracking-[0.2em] animate-pulse font-bold flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                INDEXING_FS
              </span>
            )}
            {phase === 'streaming' && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-3 bg-cyan-500/10 px-3 py-1.5 rounded border border-cyan-500/30"
              >
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" />
                <span className="text-cyan-400 text-[10px] uppercase tracking-widest font-bold">
                  STREAM_ACTIVE
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
