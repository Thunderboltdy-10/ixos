"use client"
import { useState, useEffect, useRef } from 'react'

// ─── Section definitions ───────────────────────────────────────────────────────

interface Section {
  rank: string
  file: string
  score: number
  tag: string
  tone: 'amber' | 'teal' | 'violet'
  title: string
  body: string
}

const SECTIONS: Section[] = [
  {
    rank: '01',
    file: 'src/storage/validator.rs',
    score: 0.97,
    tag: 'STORAGE',
    tone: 'amber',
    title: 'Cache Everywhere',
    body: 'Platform-aware embedding cache selects the best backend automatically — NTFS Alternate Data Streams on Windows, xattr on Linux and macOS, NullCache as graceful fallback for FAT32 and cloud mounts. Zero configuration required.',
  },
  {
    rank: '02',
    file: 'src/ixos_embed/model2vec.rs',
    score: 0.94,
    tag: 'SEMANTIC',
    tone: 'teal',
    title: 'Model2Vec Embeddings',
    body: '64-dimension f16 embeddings, HMAC-SHA256 signed at write time and cryptographically rejected at read time if tampered. Sub-second cold cache. Zero cloud dependency. The model runs entirely on your machine.',
  },
  {
    rank: '03',
    file: 'src/ixos_rank/hybrid_engine.rs',
    score: 0.91,
    tag: 'RANKING',
    tone: 'violet',
    title: 'Adaptive Hybrid Mode',
    body: 'Begins in fast lexical mode. When confidence is low or intent is ambiguous, the semantic layer activates automatically. Attack detection built in — if degradation is detected, the engine falls back to pure semantic ranking.',
  },
  {
    rank: '04',
    file: 'src/journalist_mode.rs',
    score: 0.88,
    tag: 'PRIVACY',
    tone: 'amber',
    title: 'Journalist Mode',
    body: 'Maximum privacy posture. Expanded evidence extraction with deep semantic matching. Ephemeral session — nothing written to disk, nothing cached, nothing logged. Designed for high-stakes environments.',
  },
  {
    rank: '05',
    file: 'src/attestation/mod.rs',
    score: 0.85,
    tag: 'SECURITY',
    tone: 'teal',
    title: 'Cryptographic Attestation',
    body: 'Ed25519 signatures on every search session. Prove that your search ran locally without cloud intervention. Every result is signed. Every session is auditable. Trust, but verify — cryptographically.',
  },
]

// ─── Tone color maps ───────────────────────────────────────────────────────────

type Tone = 'amber' | 'teal' | 'violet'

const TONE = {
  amber: {
    text: 'rgba(246,185,76,0.9)',
    textDim: 'rgba(246,185,76,0.55)',
    border: 'rgba(246,185,76,0.2)',
    bg: 'rgba(246,185,76,0.04)',
    bar: '#F6B94C',
    glow: 'rgba(246,185,76,0.15)',
  },
  teal: {
    text: 'rgba(45,212,191,0.9)',
    textDim: 'rgba(45,212,191,0.55)',
    border: 'rgba(45,212,191,0.2)',
    bg: 'rgba(45,212,191,0.04)',
    bar: '#2DD4BF',
    glow: 'rgba(45,212,191,0.12)',
  },
  violet: {
    text: 'rgba(167,139,250,0.9)',
    textDim: 'rgba(167,139,250,0.55)',
    border: 'rgba(124,92,255,0.25)',
    bg: 'rgba(124,92,255,0.06)',
    bar: '#7C5CFF',
    glow: 'rgba(124,92,255,0.15)',
  },
}

// ─── Section-specific content widgets ─────────────────────────────────────────

function CacheWidget() {
  return (
    <div className="space-y-2">
      {[
        { name: 'NTFS ADS', platform: 'Windows', status: 'active', note: '225 bytes / file' },
        { name: 'xattr', platform: 'Linux · macOS', status: 'active', note: 'same footprint' },
        { name: 'NullCache', platform: 'FAT32 · Cloud', status: 'fallback', note: 'in-memory only' },
      ].map(item => (
        <div
          key={item.name}
          className="flex items-center gap-4 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background: item.status === 'active' ? '#22c55e' : 'rgba(255,255,255,0.3)',
              boxShadow: item.status === 'active' ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
            }}
          />
          <span className="font-mono w-24 shrink-0" style={{ fontSize: 12, color: TONE.amber.text }}>
            {item.name}
          </span>
          <span className="font-mono flex-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {item.platform}
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            {item.note}
          </span>
        </div>
      ))}

      {/* Binary layout diagram */}
      <div
        className="font-mono mt-4 p-4 rounded-lg"
        style={{ fontSize: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 6, fontSize: 9, letterSpacing: '0.1em' }}>
          CACHE BINARY FORMAT — 225 BYTES
        </div>
        {[
          { field: 'version:u8', size: '1 byte', color: 'rgba(255,255,255,0.35)' },
          { field: 'model_fingerprint', size: '32 bytes', color: 'rgba(255,255,255,0.35)' },
          { field: 'file_hash:sha256', size: '32 bytes', color: 'rgba(255,255,255,0.35)' },
          { field: 'embedding:f16×64', size: '128 bytes', color: 'rgba(45,212,191,0.7)' },
          { field: 'signature:HMAC-SHA256', size: '32 bytes', color: TONE.amber.text },
        ].map(row => (
          <div key={row.field} className="flex gap-4 py-0.5">
            <span style={{ color: row.color, minWidth: 180 }}>{row.field}</span>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>{row.size}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmbeddingWidget() {
  return (
    <div className="space-y-4">
      {/* Quality tiers */}
      <div className="space-y-2">
        {[
          { tier: 'Flash', dim: 64, bits: 'f16', lat: '~10ms', mrr: 0.71 },
          { tier: 'Auto', dim: 64, bits: 'f16', lat: '~40ms', mrr: 0.83 },
          { tier: 'Pro', dim: 128, bits: 'f32', lat: '~120ms', mrr: 0.92 },
        ].map(t => (
          <div key={t.tier} className="flex items-center gap-4">
            <span
              className="font-mono w-12 shrink-0"
              style={{ fontSize: 11, color: TONE.teal.text }}
            >
              {t.tier}
            </span>
            <div
              className="rounded overflow-hidden shrink-0"
              style={{ width: 200, height: 3, background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${t.mrr * 100}%`,
                  background: TONE.teal.bar,
                  borderRadius: 2,
                  boxShadow: `0 0 8px ${TONE.teal.glow}`,
                }}
              />
            </div>
            <span className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
              MRR {t.mrr}
            </span>
            <span className="font-mono ml-auto" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {t.lat}
            </span>
          </div>
        ))}
      </div>

      {/* Model facts */}
      <div
        className="grid grid-cols-3 gap-3 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {[
          { label: 'Quantization', value: 'int8 / f16' },
          { label: 'Telemetry', value: 'none' },
          { label: 'Inference', value: 'on-device' },
        ].map(f => (
          <div key={f.label} className="text-center">
            <div className="font-mono" style={{ fontSize: 12, color: TONE.teal.text, marginBottom: 2 }}>
              {f.value}
            </div>
            <div
              className="font-mono uppercase"
              style={{ fontSize: 8, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)' }}
            >
              {f.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HybridWidget() {
  return (
    <div className="space-y-3">
      {/* Pipeline visualization */}
      <div className="flex items-center gap-2">
        {[
          { label: 'Lexical', color: '#F59E0B', active: true },
          { label: '→', color: 'rgba(255,255,255,0.2)', active: false, isArrow: true },
          { label: 'Semantic', color: '#7C5CFF', active: true },
          { label: '→', color: 'rgba(255,255,255,0.2)', active: false, isArrow: true },
          { label: 'Hybrid Merge', color: '#2DD4BF', active: true },
        ].map((step, i) => step.isArrow ? (
          <span key={i} className="font-mono" style={{ fontSize: 12, color: step.color }}>→</span>
        ) : (
          <div
            key={i}
            className="font-mono px-3 py-1.5 rounded"
            style={{
              fontSize: 11,
              color: step.color,
              background: `${step.color}12`,
              border: `1px solid ${step.color}30`,
            }}
          >
            {step.label}
          </div>
        ))}
      </div>

      {/* Mode table */}
      <div
        className="space-y-1.5 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {[
          { name: 'Flash', desc: 'Lexical only — BM25-like scoring', lat: '~10ms', score: '0.71 MRR' },
          { name: 'Auto', desc: 'Hybrid — confidence-gated semantic layer', lat: '~40ms', score: '0.83 MRR' },
          { name: 'Pro', desc: 'Full semantic — deep intent matching', lat: '~120ms', score: '0.92 MRR' },
        ].map(row => (
          <div
            key={row.name}
            className="flex items-center gap-3 py-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <span
              className="font-mono w-12 shrink-0"
              style={{ fontSize: 11, color: TONE.violet.text }}
            >
              {row.name}
            </span>
            <span className="font-mono flex-1" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {row.desc}
            </span>
            <span className="font-mono shrink-0" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {row.lat}
            </span>
            <span className="font-mono shrink-0" style={{ fontSize: 10, color: TONE.violet.text }}>
              {row.score}
            </span>
          </div>
        ))}
      </div>

      <p className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
        Attack detection: degradation triggers automatic fallback to pure semantic
      </p>
    </div>
  )
}

function JournalistWidget() {
  return (
    <div className="space-y-4">
      {/* Feature checklist */}
      <div className="space-y-2">
        {[
          { label: 'Ephemeral session — nothing written to disk', on: true },
          { label: 'Expanded evidence extraction', on: true },
          { label: 'Deep semantic matching (Pro quality always)', on: true },
          { label: 'Secure timing — constant-time operations', on: true },
          { label: 'Memory locked with mlock + zeroize-on-drop', on: true },
          { label: 'Background daemon', on: false },
          { label: 'Cloud sync or telemetry', on: false },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span
              className="font-mono shrink-0 w-4 text-center"
              style={{
                fontSize: 10,
                color: item.on ? TONE.amber.text : 'rgba(255,255,255,0.2)',
              }}
            >
              {item.on ? '✓' : '✗'}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                color: item.on ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                textDecoration: item.on ? 'none' : 'line-through',
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div
        className="font-mono p-3 rounded-lg"
        style={{ fontSize: 10, background: 'rgba(246,185,76,0.05)', border: '1px solid rgba(246,185,76,0.15)' }}
      >
        <span style={{ color: TONE.amber.text }}>--journalist-mode</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}> · activates maximum privacy posture</span>
      </div>
    </div>
  )
}

function AttestationWidget() {
  return (
    <div className="space-y-4">
      {/* Signature visualization */}
      <div
        className="font-mono p-4 rounded-lg space-y-1"
        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(45,212,191,0.12)' }}
      >
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: 6 }}>
          SESSION ATTESTATION
        </div>
        {[
          { label: 'algorithm', value: 'Ed25519' },
          { label: 'session_id', value: 'a7f3c9d2-4b1e-...' },
          { label: 'query_hash', value: 'sha256:9f4e2a...' },
          { label: 'results_signed', value: '5 / 5' },
          { label: 'cloud_calls', value: '0' },
          { label: 'signature', value: 'Fp3mNx7R...' },
        ].map(row => (
          <div key={row.label} className="flex gap-3">
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', minWidth: 120 }}>{row.label}:</span>
            <span style={{ fontSize: 10, color: TONE.teal.text }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {[
          { label: 'Local Only', icon: '⬡', desc: 'No network calls' },
          { label: 'Signed', icon: '◈', desc: 'Ed25519 per session' },
          { label: 'Auditable', icon: '◎', desc: 'Verifiable proof' },
        ].map(item => (
          <div
            key={item.label}
            className="flex-1 text-center p-3 rounded-lg"
            style={{ background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.12)' }}
          >
            <div style={{ fontSize: 16, color: TONE.teal.text, marginBottom: 4 }}>{item.icon}</div>
            <div className="font-mono" style={{ fontSize: 10, color: TONE.teal.text, marginBottom: 2 }}>
              {item.label}
            </div>
            <div className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const WIDGETS = [CacheWidget, EmbeddingWidget, HybridWidget, JournalistWidget, AttestationWidget]

// ─── Active result card ────────────────────────────────────────────────────────

function ResultCard({ section, isActive, direction }: {
  section: Section
  isActive: boolean
  direction: 'up' | 'down'
}) {
  const tone = TONE[section.tone]
  const Widget = WIDGETS[SECTIONS.indexOf(section)] || (() => null)

  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive
          ? 'translateY(0px)'
          : direction === 'down'
            ? 'translateY(20px)'
            : 'translateY(-20px)',
        transition: 'opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <div
        className="h-full rounded-xl p-8 overflow-auto"
        style={{
          background: `linear-gradient(135deg, rgba(12,14,18,0.98), ${tone.bg})`,
          border: `1px solid ${tone.border}`,
          boxShadow: `inset 0 0 60px ${tone.glow}`,
        }}
      >
        {/* Result header */}
        <div className="flex items-center gap-3 mb-1">
          <span
            className="font-mono uppercase px-2 py-0.5 rounded"
            style={{
              fontSize: 9,
              letterSpacing: '0.2em',
              color: tone.text,
              border: `1px solid ${tone.border}`,
              background: tone.bg,
            }}
          >
            {section.tag}
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            {section.file}
          </span>
        </div>

        {/* Title */}
        <h2
          className="font-mono font-bold mb-4"
          style={{
            fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
            color: tone.text,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          {section.title}
        </h2>

        {/* Body */}
        <p
          className="font-mono leading-relaxed mb-8"
          style={{
            fontSize: 13,
            color: 'rgba(243,245,247,0.6)',
            maxWidth: 560,
          }}
        >
          {section.body}
        </p>

        {/* Widget content */}
        <Widget />
      </div>
    </div>
  )
}

// ─── Sidebar nav item ──────────────────────────────────────────────────────────

function SidebarQuery({ query, active }: { query: string; active: boolean }) {
  return (
    <div
      className="font-mono px-2 py-1.5 rounded truncate mb-0.5 transition-all duration-300"
      style={{
        fontSize: 10,
        color: active ? 'rgba(246,185,76,0.8)' : 'rgba(255,255,255,0.25)',
        background: active ? 'rgba(246,185,76,0.07)' : 'transparent',
      }}
    >
      {query}
    </div>
  )
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, tone }: { score: number; tone: Tone }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full overflow-hidden"
        style={{ width: 80, height: 2, background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          style={{
            height: '100%',
            width: `${score * 100}%`,
            background: TONE[tone].bar,
            borderRadius: 2,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 6px ${TONE[tone].glow}`,
          }}
        />
      </div>
      <span
        className="font-mono"
        style={{ fontSize: 10, color: TONE[tone].text, transition: 'color 0.3s ease' }}
      >
        {score}
      </span>
    </div>
  )
}

// ─── Main InsidePhase ─────────────────────────────────────────────────────────

const SIDEBAR_QUERIES = [
  'cache everywhere strategy',
  'semantic model internals',
  'adaptive hybrid ranking',
  'journalist mode privacy',
  'cryptographic attestation',
]

export function InsidePhase({ scrollProgress }: { scrollProgress: number }) {
  const [activeSection, setActiveSection] = useState(0)
  const [prevSection, setPrevSection] = useState(0)
  const [direction, setDirection] = useState<'up' | 'down'>('down')

  // Map scroll 0.5→1.0 to section index 0→4
  useEffect(() => {
    const inside = Math.max(0, (scrollProgress - 0.5) / 0.5) // 0..1
    const rawIdx = inside * SECTIONS.length
    const idx = Math.min(Math.floor(rawIdx), SECTIONS.length - 1)

    setActiveSection(prev => {
      if (idx !== prev) {
        setDirection(idx > prev ? 'down' : 'up')
        setPrevSection(prev)
      }
      return idx
    })
  }, [scrollProgress])

  const currentSection = SECTIONS[activeSection]
  const tone = TONE[currentSection.tone]

  // Fade in when scrollProgress crosses 0.5
  const containerOpacity = Math.min((scrollProgress - 0.45) / 0.08, 1)

  return (
    <div
      className="relative"
      style={{
        opacity: containerOpacity,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Sticky app shell */}
      <div
        className="sticky top-0 h-screen flex overflow-hidden"
        style={{
          background: 'rgba(10,12,16,0.98)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Left sidebar */}
        <div
          className="flex flex-col p-5 shrink-0"
          style={{
            width: 224,
            borderRight: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(8,10,14,0.6)',
          }}
        >
          {/* Brand */}
          <div className="flex items-center gap-2 mb-7">
            <div
              className="w-5 h-5 rounded"
              style={{
                background: 'linear-gradient(135deg, rgba(124,92,255,0.7), rgba(124,58,237,0.4))',
                border: '1px solid rgba(124,92,255,0.5)',
                boxShadow: '0 0 12px rgba(124,92,255,0.2)',
              }}
            />
            <span
              className="font-mono font-bold"
              style={{ fontSize: 14, color: 'rgba(124,92,255,0.95)' }}
            >
              ixos
            </span>
          </div>

          {/* Nav */}
          {[
            { label: 'Search', active: true },
            { label: 'Today', active: false },
            { label: 'Workstreams', active: false },
          ].map(item => (
            <div
              key={item.label}
              className="font-mono px-3 py-2 rounded mb-1"
              style={{
                fontSize: 12,
                color: item.active ? 'rgba(167,139,250,0.95)' : 'rgba(255,255,255,0.35)',
                background: item.active ? 'rgba(124,92,255,0.12)' : 'transparent',
              }}
            >
              {item.label}
            </div>
          ))}

          {/* Recent queries */}
          <div className="mt-8">
            <div
              className="font-mono uppercase mb-3 px-1"
              style={{ fontSize: 8, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)' }}
            >
              Recent
            </div>
            {SIDEBAR_QUERIES.map((q, i) => (
              <SidebarQuery key={i} query={q} active={i === activeSection} />
            ))}
          </div>

          {/* Session indicator */}
          <div className="mt-auto">
            <div
              className="flex items-center gap-2 px-2 py-2 rounded"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }}
              />
              <span className="font-mono truncate" style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                ixos-spatial-demo
              </span>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Search bar — pinned */}
          <div
            className="flex items-center gap-4 px-6 py-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {/* Result index */}
            <span
              className="font-mono shrink-0"
              style={{
                fontSize: 10,
                color: tone.textDim,
                transition: 'color 0.3s ease',
              }}
            >
              {currentSection.rank}
            </span>
            <div
              className="w-px h-4 shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            {/* File path */}
            <span
              className="font-mono flex-1 truncate"
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', transition: 'all 0.3s ease' }}
            >
              {currentSection.file}
            </span>
            {/* Score */}
            <ScoreBar score={currentSection.score} tone={currentSection.tone} />
            {/* Tag badge */}
            <span
              className="font-mono shrink-0 px-2 py-0.5 rounded"
              style={{
                fontSize: 8,
                letterSpacing: '0.2em',
                color: tone.textDim,
                border: `1px solid ${tone.border}`,
                background: tone.bg,
                transition: 'all 0.3s ease',
              }}
            >
              {currentSection.tag}
            </span>
          </div>

          {/* Card viewport */}
          <div className="flex-1 relative p-6 overflow-hidden">
            {SECTIONS.map((section, i) => (
              <ResultCard
                key={i}
                section={section}
                isActive={i === activeSection}
                direction={i < activeSection ? 'up' : direction}
              />
            ))}
          </div>

          {/* Progress dots */}
          <div
            className="flex items-center justify-center gap-2 py-4 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            {SECTIONS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activeSection ? 16 : 4,
                  height: 4,
                  background: i === activeSection ? tone.bar : 'rgba(255,255,255,0.15)',
                  boxShadow: i === activeSection ? `0 0 6px ${tone.glow}` : 'none',
                }}
              />
            ))}
            <span className="font-mono ml-4" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
              scroll to explore
            </span>
          </div>
        </div>
      </div>

      {/* Scroll spacer: one full viewport per section */}
      {SECTIONS.map((_, i) => (
        <div key={i} style={{ height: '100vh' }} aria-hidden />
      ))}
    </div>
  )
}
