'use client'

export function V1Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '40px 40px 32px',
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'monospace',
        fontSize: '11px',
        background: '#090B0D',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 1200,
          margin: '0 auto',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <span>IX OS protocol — local-first semantic search</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="/docs" style={{ color: 'inherit', textDecoration: 'none' }}>
            docs
          </a>
          <a href="/pricing" style={{ color: 'inherit', textDecoration: 'none' }}>
            pricing
          </a>
          <a href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
            privacy
          </a>
          <a href="/download" style={{ color: 'inherit', textDecoration: 'none' }}>
            download
          </a>
        </div>
      </div>
    </footer>
  )
}
