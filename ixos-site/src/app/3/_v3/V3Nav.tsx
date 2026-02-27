'use client'

import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { label: 'Flow', href: '#progressive' },
  { label: 'Proof', href: '#benchmarks' },
  { label: 'Ask', href: '#ask-mode' },
  { label: 'Pricing', href: '#pricing' },
] as const

export function V3Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 110,
        height: 62,
        display: 'flex',
        alignItems: 'center',
        padding: '0 22px',
        background: scrolled ? 'rgba(8,10,12,0.88)' : 'rgba(12,14,16,0.7)',
        borderBottom: scrolled
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'background 220ms ease, border-color 220ms ease',
      }}
    >
      <a
        href="#hero"
        style={{
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 16,
            fontWeight: 700,
            color: '#2DD4BF',
            letterSpacing: '-0.03em',
          }}
        >
          IX
        </span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 16,
            fontWeight: 700,
            color: 'rgba(243,245,247,0.56)',
            letterSpacing: '-0.03em',
          }}
        >
          OS
        </span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.28)',
            textTransform: 'uppercase',
          }}
        >
          protocol
        </span>
      </a>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 26,
        }}
        className="hidden md:flex"
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            style={{
              textDecoration: 'none',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.46)',
              fontFamily: 'monospace',
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div style={{ width: 24 }} className="hidden md:block" />

      <a
        href="/download"
        style={{
          textDecoration: 'none',
          color: 'rgba(255,255,255,0.9)',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 6,
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          padding: '8px 18px',
          fontWeight: 700,
          fontFamily: 'monospace',
          transition: 'background 160ms ease, color 160ms ease',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.background = 'rgba(255,255,255,0.1)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.background = 'transparent'
        }}
      >
        Download
      </a>
    </nav>
  )
}
