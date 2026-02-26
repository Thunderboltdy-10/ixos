'use client'

const FOOTER_LINKS = [
  { href: '/docs', label: 'Docs' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/download', label: 'Download' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const

export function V4Footer() {
  return (
    <footer
      data-section="footer"
      id="footer"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: '#090B0D',
        padding: '28px 0 34px',
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-14">
          <div>
            <p className="font-mono" style={{ margin: '0 0 5px 0', fontSize: 10, letterSpacing: '0.18em', color: 'rgba(45,212,191,0.8)' }}>
              IXOS PROTOCOL
            </p>
            <p style={{ margin: 0, fontFamily: 'var(--font-ixo-heading)', fontSize: 15, color: 'rgba(243,245,247,0.55)' }}>
              Local-first retrieval stack for serious file search.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-18 gap-y-10">
            {FOOTER_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="font-mono"
                style={{
                  textDecoration: 'none',
                  color: 'rgba(255,255,255,0.56)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}