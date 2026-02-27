'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { V4AmbientField } from '../../5/_v4/V4AmbientField'
import { V4Loader } from '../../5/_v4/V4Loader'

import { V3Nav } from './V3Nav'
import { V3Footer } from './V3Footer'
import { V3Section } from './V3Section'
import { V3Rails } from './V3Rails'
import { V3JumpNav } from './V3JumpNav'

// ─── Section definitions (all 15, matching canonical list) ───────────────────

const SECTIONS = [
  {
    id: 'hero',
    rank: '01',
    file: 'src/ixos_rank/hybrid_engine.rs',
    tone: 'cyan' as const,
    title: 'live search cockpit',
    claim:
      'Ixos converges from lexical to semantic to locked evidence — in one query.',
    demoView: 'search' as const,
    demoQuery: 'authentication token refresh',
    demoAutoRun: true,
    featureBullets: [
      'Hybrid lexical + semantic retrieval',
      'Progressive 3-stage pipeline',
      'Flash / Auto / Pro modes',
    ],
  },
  {
    id: 'filescan',
    rank: '02',
    file: 'src/ixos_rank/lexical_engine.rs',
    tone: 'amber' as const,
    title: 'filesystem sweep',
    claim:
      'No daemon. No stale index. Search starts with a parallel JIT scan — fresh every time.',
    demoView: 'search' as const,
    demoQuery: 'config files',
    demoAutoRun: false,
    featureBullets: [
      'Parallel JIT scan — no daemon',
      'rayon parallelism',
      'No index drift',
    ],
  },
  {
    id: 'stats',
    rank: '03',
    file: 'CLAUDE.md#benchmarks',
    tone: 'amber' as const,
    title: 'performance cluster',
    claim: '7ms file load. <800ms full search. Zero background processes.',
    demoView: 'search' as const,
    demoQuery: 'performance benchmarks',
    demoAutoRun: false,
    featureBullets: [
      '~7ms file load (1,000 files)',
      '<800ms full search',
      '0 background processes',
    ],
  },
  {
    id: 'progressive',
    rank: '04',
    file: 'src/ixos_rank/progressive.rs',
    tone: 'violet' as const,
    title: 'progressive lock',
    claim:
      'Three deterministic stages. Each scroll position resolves to exactly one state.',
    demoView: 'search' as const,
    demoQuery: 'token expiry handling',
    demoAutoRun: false,
    featureBullets: [
      'Stage 1: lexical scan',
      'Stage 2: semantic reranking',
      'Stage 3: evidence lock',
    ],
  },
  {
    id: 'pipeline',
    rank: '05',
    file: 'src/ixos_rank/hybrid_engine.rs',
    tone: 'violet' as const,
    title: 'pipeline map',
    claim: 'Four explicit stages. Labeled sources. No black box.',
    demoView: 'search' as const,
    demoQuery: 'rate limiter implementation',
    demoAutoRun: false,
    featureBullets: [
      'JIT Scan → Lexical → Semantic → Hybrid',
      'Attack detection + fallback',
      'Source-labeled stages',
    ],
  },
  {
    id: 'benchmarks',
    rank: '06',
    file: 'models/lab/CANONICAL_RESULTS.md',
    tone: 'cyan' as const,
    title: 'bench board',
    claim:
      'Flash: 0.8340 MRR@10, 339ms. Pro: 0.9209 MRR@10, 430ms. From canonical runs.',
    demoView: 'search' as const,
    demoQuery: 'model benchmarks',
    demoAutoRun: false,
    featureBullets: [
      'Flash v2: 0.8340 MRR@10, 339ms',
      'Pro v2: 0.9209 MRR@10, 430ms',
      'Canonical runs in models/lab/',
    ],
  },
  {
    id: 'compute',
    rank: '07',
    file: 'src/ixos_rank/hybrid_engine.rs#auto',
    tone: 'cyan' as const,
    title: 'compute map',
    claim:
      'Every query picks its budget. Speed, accuracy, RAM — you control the trade-off.',
    demoView: 'search' as const,
    demoQuery: 'compute budget',
    demoAutoRun: false,
    featureBullets: [
      'Flash: speed-first, 16.6MB',
      'Auto: adaptive routing',
      'Pro: max recall, 102MB',
    ],
  },
  {
    id: 'comparison',
    rank: '08',
    file: 'docs/product/DESKTOP_APP.md',
    tone: 'cyan' as const,
    title: 'capability matrix',
    claim: 'Desktop vs CLI. What each surface can do — without inflating either.',
    demoView: 'workstreams' as const,
    demoQuery: '',
    demoAutoRun: false,
    featureBullets: [
      'Desktop: visual context + Pro views',
      'CLI: JSON/CSV/ripgrep output',
      'Same search engine, different surfaces',
    ],
  },
  {
    id: 'techbento',
    rank: '09',
    file: 'src/storage/validator.rs',
    tone: 'cyan' as const,
    title: 'system internals',
    claim:
      'HMAC-signed cache. ADS on NTFS. Ed25519 attestation. Inspectable by design.',
    demoView: 'search' as const,
    demoQuery: 'cache signing validation',
    demoAutoRun: false,
    featureBullets: [
      '225-byte HMAC-signed cache entries',
      'ADS on NTFS, xattr on Unix',
      'Ed25519 attestation',
    ],
  },
  {
    id: 'cli',
    rank: '10',
    file: 'CLAUDE.md#cli',
    tone: 'amber' as const,
    title: 'terminal commands',
    claim:
      'Scriptable. JSON/CSV/ripgrep output. Journalist mode. Works anywhere Rust runs.',
    demoView: 'search' as const,
    demoQuery: 'journalist mode privacy',
    demoAutoRun: false,
    featureBullets: [
      '--json / --csv / --ripgrep output',
      '--journalist-mode for max privacy',
      '--progressive to see stages',
    ],
  },
  {
    id: 'ask-mode',
    rank: '11',
    file: 'src/ixos_rank/ask_mode/intent_detector.rs',
    tone: 'violet' as const,
    title: 'ask pathway',
    claim:
      'Ask without forcing Pro. Intent detection routes your question to evidence first.',
    demoView: 'search' as const,
    demoQuery: 'How does token refresh work?',
    demoAutoRun: false,
    featureBullets: [
      'Intent detection routes query',
      'Evidence assembled locally',
      'Works on Auto + Pro',
    ],
  },
  {
    id: 'local',
    rank: '12',
    file: 'CLAUDE.md#architecture',
    tone: 'cyan' as const,
    title: 'local privacy',
    claim: 'Computation stays on your device. No telemetry, no egress, no exceptions.',
    demoView: 'search' as const,
    demoQuery: 'ephemeral mode privacy',
    demoAutoRun: false,
    featureBullets: [
      'Zero data egress by design',
      'Ephemeral mode: no disk writes',
      'No telemetry, no sync',
    ],
  },
  {
    id: 'pro-value',
    rank: '13',
    file: 'src/activity_ledger/mod.rs',
    tone: 'amber' as const,
    title: 'pro loop',
    claim: 'Today + Workstreams + Ask. Context that persists, sessions that cluster.',
    demoView: 'today' as const,
    demoQuery: '',
    demoAutoRun: false,
    featureBullets: [
      'Today: resume interrupted work',
      'Workstreams: clustered sessions',
      'Ask: Q&A from your files',
    ],
  },
  {
    id: 'pricing',
    rank: '14',
    file: 'src/app/pricing/page.tsx',
    tone: 'violet' as const,
    title: 'plan split',
    claim: 'Free search, forever. Pro adds context, history, and Ask mode.',
    demoView: 'search' as const,
    demoQuery: '',
    demoAutoRun: false,
    featureBullets: [
      'Free: unlimited local search',
      'Pro: Today + Workstreams + Ask',
      'No account needed for search',
    ],
  },
  {
    id: 'cta',
    rank: '15',
    file: 'src/lib/downloads.ts',
    tone: 'cyan' as const,
    title: 'launch deck',
    claim: 'Download for macOS, Windows, Linux. Docs included.',
    demoView: 'search' as const,
    demoQuery: '',
    demoAutoRun: false,
    featureBullets: [
      'macOS, Windows, Linux',
      'Free to download',
      'Docs at ixos.app/docs',
    ],
  },
]

// ─── V3Page ───────────────────────────────────────────────────────────────────

export function V3Page() {
  const [loaded, setLoaded] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>('hero')

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el)
  }, [])

  const handleLoaderComplete = useCallback(() => {
    setLoaded(true)
  }, [])

  const activeTone =
    SECTIONS.find((s) => s.id === activeSectionId)?.tone ?? 'cyan'

  return (
    <main
      style={{
        backgroundColor: '#0C0E10',
        minHeight: '100vh',
        color: 'white',
        fontFamily: 'monospace',
        overflowX: 'clip',
      }}
    >
      {/* Pixel-square ripple background */}
      <V4AmbientField />

      {/* Boot loader */}
      <V4Loader onComplete={handleLoaderComplete} />

      {/* Calibration rails — always rendered */}
      <V3Rails
        activeSectionId={activeSectionId}
        sectionIds={SECTIONS.map((s) => s.id)}
        activeTone={activeTone}
      />

      {/* Main content — fades in after loader */}
      <AnimatePresence>
        {loaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <V3Nav />

            <div
              style={{
                maxWidth: 1100,
                margin: '0 auto',
                padding: '0 32px',
                paddingTop: 80,
              }}
            >
              {SECTIONS.map((section, i) => (
                <div
                  key={section.id}
                  ref={(el) => registerRef(section.id, el)}
                >
                  <V3Section
                    {...section}
                    onInView={setActiveSectionId}
                  />

                  {/* Thin spacer between sections */}
                  {i < SECTIONS.length - 1 && (
                    <div style={{ height: 8 }} />
                  )}
                </div>
              ))}
            </div>

            <V3Footer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jump nav — always visible after load */}
      {loaded && (
        <V3JumpNav
          sectionIds={SECTIONS.map((s) => s.id)}
          tones={SECTIONS.map((s) => s.tone)}
          activeSectionId={activeSectionId}
        />
      )}
    </main>
  )
}
