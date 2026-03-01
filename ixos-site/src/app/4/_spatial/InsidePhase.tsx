"use client"
import { useState, useEffect, useRef } from 'react'
import type { IxosSearchResult } from '@ixos/ixos-ui'
import { DemoSurface } from '../../../landing/DemoSurface'

// ─── Chapter definitions ─────────────────────────────────────────────────────
// Each chapter = a scroll band (50%-100% split into 4) with:
// - A search query shown in the search bar
// - 3 search results whose snippet/rationale contains the landing-page story
// - A search mode

interface Chapter {
  id: string
  query: string
  mode: 'flash' | 'auto' | 'pro'
  results: IxosSearchResult[]
}

const CHAPTERS: Chapter[] = [
  {
    id: 'ch1',
    query: 'file search performance storage',
    mode: 'flash',
    results: [
      {
        id: 'ch1-r1',
        title: 'Cache Everywhere',
        path: 'src/storage/ads_windows.rs',
        score: 0.97,
        lexicalScore: 0.94,
        semanticScore: 0.96,
        snippet: 'Platform-aware embedding cache selects the best backend automatically.',
        matchedLineNumber: 42,
        contextBefore: ['// Auto-selects NTFS ADS on Windows, xattr on Unix'],
        contextMatch: ['pub fn get_cache_for_path(p: &Path) -> Box<dyn EmbeddingCache> {'],
        contextAfter: ['    #[cfg(windows)] return Box::new(AdsCache::new(p));'],
        rationale: 'Platform-aware embedding cache selects the best backend automatically — NTFS Alternate Data Streams on Windows, xattr on Linux and macOS, NullCache as graceful fallback. 225 bytes per file. Zero configuration required. Your files stay yours.',
      },
      {
        id: 'ch1-r2',
        title: 'Sub-second Cold Cache',
        path: 'src/ixos_embed/model2vec.rs',
        score: 0.94,
        lexicalScore: 0.91,
        semanticScore: 0.93,
        snippet: '64-dimension f16 embeddings, HMAC-SHA256 signed at write time.',
        matchedLineNumber: 118,
        contextMatch: ['pub fn embed(&self, text: &str) -> Result<Vec<f16>, EmbedError> {'],
        contextAfter: ['    let vec = self.model.encode(text)?;'],
        rationale: '64-dimension f16 embeddings stored in 128 bytes. HMAC-SHA256 signed at write time and cryptographically rejected at read time if tampered. Sub-second cold cache. Zero cloud dependency — the model runs entirely on your machine.',
      },
      {
        id: 'ch1-r3',
        title: '~7ms for 1000 Files',
        path: 'src/optimization/mod.rs',
        score: 0.91,
        lexicalScore: 0.88,
        semanticScore: 0.90,
        snippet: 'Parallel file loading with rayon — 7ms for 1000 files.',
        matchedLineNumber: 77,
        contextMatch: ['files.par_iter().map(|f| load_with_cache(f)).collect()'],
        rationale: 'Parallel file loading via rayon. 7ms to load 1000 files. Search completes in under 800ms including cold model inference. System-aware profile selection based on RAM and CPU count. No background daemon required.',
      },
    ],
  },
  {
    id: 'ch2',
    query: 'privacy local search no cloud',
    mode: 'pro',
    results: [
      {
        id: 'ch2-r1',
        title: 'Journalist Mode',
        path: 'src/journalist_mode.rs',
        score: 0.98,
        lexicalScore: 0.95,
        semanticScore: 0.97,
        snippet: 'Maximum privacy posture. Nothing written to disk, nothing cached.',
        matchedLineNumber: 29,
        contextBefore: ['/// Ephemeral search session — no disk writes, no logs, no cache'],
        contextMatch: ['pub fn journalist_search(query: &str) -> SearchResults {'],
        contextAfter: ['    let session = EphemeralSession::new(); // mlock + zeroize-on-drop'],
        rationale: 'Maximum privacy posture. Expanded evidence extraction with deep semantic matching. Ephemeral session — nothing written to disk, nothing cached, nothing logged. Memory locked with mlock and cleared on drop. Designed for high-stakes environments and sensitive investigations.',
      },
      {
        id: 'ch2-r2',
        title: 'Zero Cloud Index',
        path: 'src/security/sandbox.rs',
        score: 0.95,
        lexicalScore: 0.92,
        semanticScore: 0.94,
        snippet: 'Path sandboxing validates all file access. 0 bytes to cloud.',
        matchedLineNumber: 55,
        contextMatch: ['pub fn validate_path(p: &Path, root: &Path) -> Result<(), SandboxError>'],
        rationale: 'Path sandboxing validates every file access against configured root directories. No network calls permitted. 0 bytes to cloud — proven by the session attestation signature. Your search index is your local filesystem.',
      },
      {
        id: 'ch2-r3',
        title: 'Opt-in Timing Protection',
        path: 'src/ixos_embed/secure_embedder.rs',
        score: 0.92,
        lexicalScore: 0.89,
        semanticScore: 0.91,
        snippet: 'Configurable timing floor prevents side-channel inference on query patterns.',
        matchedLineNumber: 88,
        contextMatch: ['if self.secure_timing { sleep(TIMING_FLOOR - elapsed); }'],
        rationale: 'Default: fast mode — no timing floor, 4 concurrent embeddings. With --secure-timing: 100ms minimum floor, single-threaded, constant-time operations. Side-channel attacks cannot infer which files matched your query. Your search patterns stay private.',
      },
    ],
  },
  {
    id: 'ch3',
    query: 'semantic embeddings hybrid ranking',
    mode: 'auto',
    results: [
      {
        id: 'ch3-r1',
        title: 'Adaptive Hybrid Mode',
        path: 'src/ixos_rank/hybrid_engine.rs',
        score: 0.96,
        lexicalScore: 0.93,
        semanticScore: 0.95,
        snippet: 'Begins in fast lexical mode. Semantic layer activates when confidence is low.',
        matchedLineNumber: 144,
        contextBefore: ['// Confidence-gated: if lexical score < threshold, run semantic pass'],
        contextMatch: ['if lexical_conf < SEMANTIC_THRESHOLD { self.semantic_pass(query) }'],
        contextAfter: ['// Attack detection: degradation triggers fallback to pure semantic'],
        rationale: 'Begins in fast BM25-like lexical mode. When confidence is low or intent is ambiguous, the semantic layer activates automatically. Attack detection built in — if degradation is detected, the engine falls back to pure semantic ranking. MRR@10 of 0.92 with Pro quality.',
      },
      {
        id: 'ch3-r2',
        title: 'Model2Vec Embeddings',
        path: 'src/ixos_embed/model2vec.rs',
        score: 0.93,
        lexicalScore: 0.90,
        semanticScore: 0.92,
        snippet: 'On-device 64-dim embeddings. Flash: 10ms. Auto: 40ms. Pro: 120ms.',
        matchedLineNumber: 201,
        contextMatch: ['// Quality tiers: flash (f16/64), auto (f16/64+bm25), pro (f32/128)'],
        rationale: 'Model2Vec embeddings run entirely on-device. Three quality tiers: Flash at ~10ms with MRR 0.71, Auto at ~40ms with MRR 0.83, Pro at ~120ms with MRR 0.92. int8 quantization with less than 1% quality loss. No HuggingFace API calls during search.',
      },
      {
        id: 'ch3-r3',
        title: 'Secure Ranking',
        path: 'src/ixos_rank/secure_ranker.rs',
        score: 0.90,
        lexicalScore: 0.87,
        semanticScore: 0.89,
        snippet: 'Integrity-verified ranking with behavioral scoring and tamper detection.',
        matchedLineNumber: 67,
        contextMatch: ['pub fn rank_verified(&self, results: &mut [FileResult]) -> IntegrityReport'],
        rationale: 'Every ranking operation is integrity-verified. Behavioral scoring detects anomalous ranking patterns that could indicate data poisoning or cache tampering. If the integrity check fails, the search aborts — not silently degrades.',
      },
    ],
  },
  {
    id: 'ch4',
    query: 'cryptographic attestation Ed25519',
    mode: 'pro',
    results: [
      {
        id: 'ch4-r1',
        title: 'Cryptographic Attestation',
        path: 'src/attestation/mod.rs',
        score: 0.99,
        lexicalScore: 0.97,
        semanticScore: 0.98,
        snippet: 'Ed25519 signatures on every search session. Prove local execution.',
        matchedLineNumber: 38,
        contextBefore: ['/// Signs every result with the session private key'],
        contextMatch: ['pub fn sign_session(&self, results: &[FileResult]) -> Attestation'],
        contextAfter: ['    Ed25519Signer::new().sign(session_digest(results))'],
        rationale: 'Ed25519 signatures on every search session. Prove that your search ran locally without cloud intervention. Every result is individually signed. Every session produces an auditable attestation record — verifiable by any third party with the public key.',
      },
      {
        id: 'ch4-r2',
        title: 'GDPR · CCPA · EU AI Act',
        path: 'src/compliance/mod.rs',
        score: 0.95,
        lexicalScore: 0.92,
        semanticScore: 0.94,
        snippet: 'Built-in compliance for EU AI Act, GDPR, CCPA. No consent fatigue.',
        matchedLineNumber: 14,
        contextMatch: ['impl ComplianceLayer for IxosProtocol {'],
        rationale: 'Compliance baked in by architecture, not by policy. GDPR right-to-deletion satisfied because no personal data leaves the device. EU AI Act requirements met — transparent algorithm, no black-box cloud AI. CCPA opt-out is the default state.',
      },
      {
        id: 'ch4-r3',
        title: 'Start Searching in 30 Seconds',
        path: 'README.md',
        score: 0.92,
        lexicalScore: 0.89,
        semanticScore: 0.91,
        snippet: 'cargo install ixos && ixos search "your query" --dir ./your-files',
        matchedLineNumber: 3,
        contextMatch: ['cargo install ixos'],
        contextAfter: ['ixos search "your query" --dir ./your-files --progressive'],
        rationale: 'Install with cargo in under 30 seconds. No account required. No API key. No configuration. Run ixos search against any directory and get semantically ranked results immediately. Community tier is free forever.',
      },
    ],
  },
]

// Chapter scroll bands: 20-35%, 35-50%, 50-65%, 65-80%
function getChapterIndex(scrollProgress: number): number {
  if (scrollProgress < 0.20) return 0
  const inside = (scrollProgress - 0.20) / 0.60 // 0..1 across remaining 60%
  return Math.min(Math.floor(inside * CHAPTERS.length), CHAPTERS.length - 1)
}

// Sidebar recent queries — deterministic order
const SIDEBAR_QUERIES = [
  'file search performance storage',
  'privacy local search no cloud',
  'semantic embeddings hybrid ranking',
  'cryptographic attestation Ed25519',
]

// ─── Lerp helper ──────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// ─── Tone colors (violet/amber per chapter) ──────────────────────────────────
const CHAPTER_TONES = ['amber', 'violet', 'teal', 'amber'] as const
type Tone = 'amber' | 'violet' | 'teal'

const TONE_COLORS: Record<Tone, { accent: string; text: string; bg: string; border: string }> = {
  amber: {
    accent: '#F6B94C',
    text: 'rgba(246,185,76,0.9)',
    bg: 'rgba(246,185,76,0.06)',
    border: 'rgba(246,185,76,0.25)',
  },
  violet: {
    accent: '#7C5CFF',
    text: 'rgba(167,139,250,0.9)',
    bg: 'rgba(124,92,255,0.08)',
    border: 'rgba(124,92,255,0.3)',
  },
  teal: {
    accent: '#2DD4BF',
    text: 'rgba(45,212,191,0.9)',
    bg: 'rgba(45,212,191,0.06)',
    border: 'rgba(45,212,191,0.25)',
  },
}

// ─── Camera tilt state ────────────────────────────────────────────────────────

interface TiltState {
  rotX: number
  rotY: number
  targetRotX: number
  targetRotY: number
}

// ─── Main InsidePhase ─────────────────────────────────────────────────────────

export function InsidePhase({ scrollProgress }: { scrollProgress: number }) {
  const [chapterIndex, setChapterIndex] = useState(0)
  const [flashBar, setFlashBar] = useState(false)
  const [resultsVisible, setResultsVisible] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Camera tilt via RAF — no state, direct DOM mutation for performance
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<TiltState>({ rotX: 0, rotY: 0, targetRotX: 0, targetRotY: 0 })
  const tiltRafRef = useRef<number>(0)

  // Chapter transitions
  useEffect(() => {
    const next = getChapterIndex(scrollProgress)

    setChapterIndex(prev => {
      if (next !== prev) {
        // Chapter changed: amber flash + results cross-fade
        setFlashBar(true)
        setResultsVisible(false)
        setSelectedIndex(0)

        // Tilt on chapter change: rotateY pan
        tiltRef.current.targetRotY = next > prev ? 4 : -4
        tiltRef.current.targetRotX = 0

        setTimeout(() => {
          setFlashBar(false)
        }, 400)

        setTimeout(() => {
          setResultsVisible(true)
        }, 350)

        // Tilt returns to center after 700ms
        setTimeout(() => {
          tiltRef.current.targetRotY = 0
          tiltRef.current.targetRotX = 0
        }, 700)
      }
      return next
    })
  }, [scrollProgress])

  // RAF loop for smooth camera tilt + subtle idle breathing
  useEffect(() => {
    let lastTime = 0

    const animate = (time: number) => {
      const dt = Math.min(time - lastTime, 50) // cap delta
      lastTime = time

      const t = tiltRef.current
      const speed = dt * 0.008 // lerp speed

      // Idle breathing — very subtle rotateX ±0.5deg
      const breathe = Math.sin(time * 0.0007) * 0.5
      const idleTarget = breathe

      // If no chapter-change tilt is active (targetRotX/Y near 0), apply idle
      const isIdling = Math.abs(t.targetRotY) < 0.1 && Math.abs(t.targetRotX) < 0.1

      const finalTargetX = isIdling ? idleTarget : t.targetRotX
      const finalTargetY = t.targetRotY

      t.rotX = lerp(t.rotX, finalTargetX, speed * 1.5)
      t.rotY = lerp(t.rotY, finalTargetY, speed)

      if (wrapperRef.current) {
        wrapperRef.current.style.transform =
          `perspective(1400px) rotateX(${t.rotX.toFixed(3)}deg) rotateY(${t.rotY.toFixed(3)}deg)`
      }

      tiltRafRef.current = requestAnimationFrame(animate)
    }

    tiltRafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(tiltRafRef.current)
  }, [])

  // Fade in when scrollProgress crosses 0.16 (sooner, to overlap with VoidPhase fading out)
  const containerOpacity = Math.min(Math.max((scrollProgress - 0.16) / 0.08, 0), 1)

  const chapter = CHAPTERS[chapterIndex]
  const tone = CHAPTER_TONES[chapterIndex] as Tone
  const colors = TONE_COLORS[tone]

  return (
    <div
      className="relative"
      style={{
        opacity: containerOpacity,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Sticky app shell — full height */}
      <div
        className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
        style={{ background: '#04050A' }}
      >
        {/* Use DemoSurface directly for consistent desktop app rendering */}
        <div
          style={{
            width: 'min(1400px, 98vw)',
            height: 'min(850px, 92vh)',
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 0 60px ${colors.bg}, 0 30px 80px rgba(0,0,0,0.8)`,
            background: 'rgba(8,10,14,0.99)',
            overflow: 'hidden',
          }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,8,12,0.95)' }}>
            <div className="flex gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.5)' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(234,179,8,0.5)' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(34,197,94,0.5)' }} />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '0.35em', color: 'rgba(243,245,247,0.3)' }}>
                IXOS PROTOCOL — Local Search Engine
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: flashBar ? '#F6B94C' : '#22c55e', boxShadow: flashBar ? '0 0 8px rgba(246,185,76,0.9)' : '0 0 6px rgba(34,197,94,0.7)' }} />
              <span className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{flashBar ? 'searching...' : 'local · 0 bytes to cloud'}</span>
            </div>
          </div>
          
          {/* DemoSurface */}
          <div style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
            <DemoSurface initialQuery={chapter.query} autoRun style={{ height: '100%', overflow: 'hidden' }} />
          </div>
        </div>
      </div>

      {/* Scroll spacer */}
      {CHAPTERS.map((ch) => (
        <div key={ch.id} style={{ height: '100vh' }} aria-hidden />
      ))}
    </div>
  )
}
