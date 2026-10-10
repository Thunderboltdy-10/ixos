"use client";

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DemoSurface } from '@/landing/DemoSurface'

// ─── Chapter definitions ─────────────────────────────────────────────────────
const CHAPTERS = [
  {
    id: 'hero',
    query: 'search reimagined locally',
    kicker: 'Phase 01 / Local-first',
    title: 'Search reimagined',
    highlight: 'locally.',
    content: 'Your codebase never touches a remote server. Ixos builds a cryptographically signed vector index on your filesystem.',
    stat: '0 B', statLabel: 'Data sent to cloud',
    color: '#F6B94C',
  },
  {
    id: 'speed',
    query: 'benchmark file search performance',
    kicker: 'Phase 02 / Speed',
    title: 'Frictionless',
    highlight: 'Speed.',
    content: 'Parallel file loading via rayon. 7ms to scan 1,000 files. Full search completes in under 800ms including cold model inference.',
    stat: '7ms', statLabel: 'Scan latency',
    color: '#14B8A6',
  },
  {
    id: 'pipeline',
    query: 'explain hybrid ranking engine',
    kicker: 'Phase 03 / Intelligence',
    title: 'Adaptive',
    highlight: 'Hybrid Engine.',
    content: 'Begins in fast lexical mode. When confidence is low, the semantic layer activates automatically — no configuration required.',
    stat: '0.92', statLabel: 'MRR@10',
    color: '#7C5CFF',
  },
  {
    id: 'security',
    query: 'enable journalist privacy mode',
    kicker: 'Phase 04 / Security',
    title: 'Zero-trust',
    highlight: 'by default.',
    content: 'Ephemeral session — nothing written to disk, nothing cached. Memory locked with mlock, cleared on drop. Ed25519 session signatures.',
    stat: 'Ed25519', statLabel: 'Session signatures',
    color: '#EC4899',
  },
  {
    id: 'cta',
    query: 'download ixos desktop',
    kicker: 'Phase 05 / Install',
    title: 'Acquire',
    highlight: 'The Protocol.',
    content: 'Download Ixos and install a local model. All search modes are free, with no account or API key required.',
    stat: 'v1.0', statLabel: 'Production ready',
    color: '#14B8A6',
  },
]

export function InsidePhase({ scrollProgress }: { scrollProgress: number }) {
  const chaptersCount = CHAPTERS.length
  const chapterProgress = Math.min(Math.max(scrollProgress * chaptersCount, 0), chaptersCount - 0.001)
  const chapterIndex = Math.floor(chapterProgress)
  const chapter = CHAPTERS[chapterIndex]

  // Results visible in DemoSurface strictly match the current chapter to avoid "creeping" future results
  const overrideResults = [
    {
      id: chapter.id,
      title: chapter.highlight,
      path: `ixos-protocol/phase_0${chapterIndex + 1}/${chapter.id}.md`,
      snippet: chapter.content,
      score: 0.99 - chapterIndex * 0.02,
      rationale: `${chapter.statLabel}: ${chapter.stat}`,
      isCollapsed: false,
    }
  ]

  return (
    <div className="relative">
      <div
        className="sticky top-0 h-screen overflow-hidden"
        style={{ background: '#05070C' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 70% 60% at ${20 + chapterIndex * 15}% 40%, ${chapter.color}10 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 h-full flex">
          {/* ── Left: narrative copy ── */}
          <div className="flex-1 flex flex-col justify-center px-12 xl:px-20 max-w-[45%]">
            <AnimatePresence mode="wait">
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: chapter.color }}>
                  {chapter.kicker}
                </p>

                <h2
                  className="text-5xl xl:text-6xl font-light tracking-tight text-white leading-[1.05] mb-3"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {chapter.title}<br />
                  <span style={{ color: chapter.color }}>{chapter.highlight}</span>
                </h2>

                <p className="text-base font-light leading-relaxed mb-10 max-w-md" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {chapter.content}
                </p>

                <div className="flex items-end gap-4">
                  <span
                    className="text-5xl font-mono font-semibold"
                    style={{ color: chapter.color, textShadow: `0 0 40px ${chapter.color}40` }}
                  >
                    {chapter.stat}
                  </span>
                  <span className="font-mono text-[11px] tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {chapter.statLabel}
                  </span>
                </div>

                {/* Progress pills */}
                <div className="flex gap-2 mt-12">
                  {CHAPTERS.map((_, i) => (
                    <div
                      key={i}
                      className="h-0.5 rounded-full transition-all duration-500"
                      style={{
                        width: i === chapterIndex ? 32 : 16,
                        background: i === chapterIndex ? chapter.color : 'rgba(255,255,255,0.15)',
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Right: DemoSurface mockup ── */}
          <div className="flex-1 flex items-center justify-center pr-10 xl:pr-16">
            <div
              className="w-full h-[78vh] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500"
              style={{
                border: `1px solid ${chapter.color}20`,
                boxShadow: `0 0 80px ${chapter.color}08, 0 32px 80px rgba(0,0,0,0.6)`,
              }}
            >
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#05070A] border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-auto font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: `${chapter.color}80` }}>
                  {chapter.kicker}
                </span>
              </div>
              <div className="h-[calc(100%-36px)]">
                <DemoSurface
                  key="inside-demo"
                  initialQuery={chapter.query}
                  autoRun={false}
                  autoType={false}
                  displayMode="search-results-only"
                  style={{ height: '100%', width: '100%' }}
                  overrideResults={overrideResults}
                  overrideSelectedIndex={chapterIndex}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll spacer */}
      <div style={{ height: `${CHAPTERS.length * 100}vh` }} aria-hidden />
    </div>
  )
}
