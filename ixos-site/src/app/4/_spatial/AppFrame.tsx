"use client"

interface AppFrameProps {
  glowOpacity: number
  scanLineOpacity: number
}

export function AppFrame({ glowOpacity, scanLineOpacity }: AppFrameProps) {
  const glow = Math.max(0, Math.min(glowOpacity, 1))

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 'min(900px, 92vw)',
        borderRadius: 12,
        border: `1px solid rgba(124,92,255,${0.25 * glow + 0.05})`,
        boxShadow: `
          0 0 ${60 * glow}px rgba(124,92,255,${0.3 * glow}),
          0 0 ${120 * glow}px rgba(124,92,255,${0.1 * glow}),
          0 ${30 * glow}px 60px rgba(0,0,0,0.6),
          inset 0 0 30px rgba(124,92,255,${0.04 * glow})
        `,
        background: 'rgba(12,14,18,0.97)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* CRT scan line overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          opacity: scanLineOpacity * 0.06,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)',
          backgroundSize: '100% 3px',
        }}
      />

      {/* Title bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 relative"
        style={{
          borderBottom: 'rgba(255,255,255,0.06) 1px solid',
          background: 'rgba(8,10,14,0.9)',
        }}
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.5)' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(234,179,8,0.5)' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(34,197,94,0.5)' }} />
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
            local
          </span>
        </div>
      </div>

      {/* App interior */}
      <div className="flex" style={{ height: 510 }}>
        {/* Sidebar */}
        <div
          className="flex flex-col p-4 shrink-0"
          style={{
            width: 200,
            borderRight: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(8,10,14,0.5)',
          }}
        >
          {/* Brand */}
          <div className="flex items-center gap-2 mb-6">
            <div
              className="w-5 h-5 rounded"
              style={{
                background: 'linear-gradient(135deg, rgba(124,92,255,0.6), rgba(124,58,237,0.4))',
                border: '1px solid rgba(124,92,255,0.4)',
              }}
            />
            <span className="font-mono font-bold" style={{ fontSize: 13, color: 'rgba(124,92,255,0.9)' }}>
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
                color: item.active ? 'rgba(167,139,250,0.9)' : 'rgba(255,255,255,0.3)',
                background: item.active ? 'rgba(124,92,255,0.12)' : 'transparent',
              }}
            >
              {item.label}
            </div>
          ))}

          {/* Recent queries */}
          <div className="mt-6">
            <div
              className="font-mono uppercase mb-2 px-2"
              style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)' }}
            >
              Recent
            </div>
            {[
              'auth token refresh',
              'semantic search internals',
              'cache everywhere',
              'hybrid ranking',
              'attestation flow',
            ].map((q, i) => (
              <div
                key={i}
                className="font-mono px-2 py-1.5 rounded truncate mb-0.5"
                style={{
                  fontSize: 10,
                  color: i === 0 ? 'rgba(246,185,76,0.7)' : 'rgba(255,255,255,0.2)',
                  background: i === 0 ? 'rgba(246,185,76,0.06)' : 'transparent',
                }}
              >
                {q}
              </div>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div
            className="flex items-center gap-3 px-5 py-3"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(14,17,23,0.6)',
            }}
          >
            <span className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              query
            </span>
            <span className="font-mono flex-1" style={{ fontSize: 13, color: 'rgba(243,245,247,0.85)' }}>
              How does semantic search work?
            </span>
            <div className="flex gap-2">
              {['Flash', 'Auto', 'Pro'].map((mode, i) => (
                <span
                  key={mode}
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: i === 1
                      ? '1px solid rgba(246,185,76,0.4)'
                      : '1px solid rgba(255,255,255,0.08)',
                    color: i === 1 ? 'rgba(246,185,76,0.9)' : 'rgba(255,255,255,0.3)',
                    background: i === 1 ? 'rgba(246,185,76,0.08)' : 'transparent',
                  }}
                >
                  {mode}
                </span>
              ))}
            </div>
          </div>

          {/* Results list */}
          <div className="flex-1 overflow-hidden p-4">
            {[
              { rank: '01', file: 'src/ixos_embed/model2vec.rs', score: 0.94, tag: 'SEMANTIC' },
              { rank: '02', file: 'src/ixos_rank/semantic_engine.rs', score: 0.91, tag: 'RANKING' },
              { rank: '03', file: 'docs/ARCHITECTURE.md', score: 0.87, tag: 'DOCS' },
              { rank: '04', file: 'src/storage/validator.rs', score: 0.83, tag: 'STORAGE' },
              { rank: '05', file: 'src/journalist_mode.rs', score: 0.79, tag: 'PRIVACY' },
            ].map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-2.5"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  opacity: 1 - i * 0.14,
                }}
              >
                <span
                  className="font-mono w-6 shrink-0"
                  style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}
                >
                  {r.rank}
                </span>
                <span
                  className="font-mono flex-1 truncate"
                  style={{ fontSize: 11, color: i === 0 ? 'rgba(167,139,250,0.9)' : 'rgba(243,245,247,0.6)' }}
                >
                  {r.file}
                </span>
                <span
                  className="font-mono shrink-0"
                  style={{ fontSize: 8, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)' }}
                >
                  {r.tag}
                </span>
                <div
                  className="shrink-0 rounded-full overflow-hidden"
                  style={{ width: 48, height: 2, background: 'rgba(255,255,255,0.08)' }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${r.score * 100}%`,
                      background: i === 0
                        ? 'rgba(246,185,76,0.8)'
                        : 'rgba(124,92,255,0.5)',
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span
                  className="font-mono shrink-0"
                  style={{
                    fontSize: 10,
                    color: i === 0 ? 'rgba(246,185,76,0.8)' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {r.score}
                </span>
              </div>
            ))}

            {/* Status footer */}
            <div
              className="flex items-center gap-2 mt-4"
              style={{ opacity: 0.5 }}
            >
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: 'rgba(34,197,94,0.7)' }}
              />
              <span
                className="font-mono"
                style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}
              >
                5 results · 247ms · 0 bytes to cloud
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
