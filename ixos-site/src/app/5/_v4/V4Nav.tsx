'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth, UserButton } from '@clerk/nextjs'
import { useReducedOrLowEnd } from './hooks/useReducedOrLowEnd'

export function V4Nav() {
  const [scrolled, setScrolled] = useState(false)
  const lowEnd = useReducedOrLowEnd()
  const pathname = usePathname() || ''
  const { isSignedIn, isLoaded } = useAuth()

  // Detect variant prefix (e.g. /1, /4, /5)
  const variantMatch = pathname.match(/^\/([1-5])(?:\/|$)/)
  const variantPrefix = variantMatch ? `/${variantMatch[1]}` : '/5'

  const NAV_LINKS = [
    { label: 'Flow', href: `${variantPrefix}#progressive` },
    { label: 'Proof', href: `${variantPrefix}#benchmarks` },
    { label: 'Pricing', href: `${variantPrefix}/pricing` },
    { label: 'Docs', href: `${variantPrefix}/docs` },
  ] as const

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
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'background 220ms ease, border-color 220ms ease',
      }}
    >
      <Link
        href={`${variantPrefix}`}
        style={{
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 16, fontWeight: 700, color: '#2DD4BF', letterSpacing: '-0.03em' }}>
          IXOS
        </span>
        <span style={{ fontFamily: 'var(--font-ixo-mono)', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
          protocol
        </span>
      </Link>

      <div style={{ flex: 1 }} />

      <div className="hidden md:flex" style={{ alignItems: 'center', gap: 26 }}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="font-mono"
            style={{
              textDecoration: 'none',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.46)',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div style={{ width: 24 }} className="hidden md:block" />

      {/* Auth & Primary Actions */}
      <div className="flex items-center gap-4">
        {isLoaded && isSignedIn ? (
          <>
            <Link
              href={`${variantPrefix}/account`}
              className="font-mono hidden md:inline-flex"
              style={{
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.46)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                padding: '8px 14px',
              }}
            >
              Account
            </Link>
            <UserButton afterSignOutUrl={`${variantPrefix}`} />
          </>
        ) : isLoaded && !isSignedIn ? (
          <>
            <Link
              href={`${variantPrefix}/signin`}
              className="font-mono hidden md:inline-flex"
              style={{
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.46)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                padding: '8px 14px',
              }}
            >
              Sign In
            </Link>

            <Link
              href={`${variantPrefix}/signup`}
              className="font-mono hidden md:inline-flex"
              style={{
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                padding: '8px 18px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              Sign Up
            </Link>
          </>
        ) : null}

        <Link
          href={`${variantPrefix}/download`}
          className="font-mono"
          style={{
            textDecoration: 'none',
            color: '#0C0E10',
            background: '#2DD4BF',
            border: '1px solid rgba(45,212,191,0.9)',
            borderRadius: 6,
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            padding: lowEnd ? '8px 14px' : '8px 18px',
            fontWeight: 700,
            boxShadow: '0 0 15px rgba(45,212,191,0.3)',
          }}
        >
          Download
        </Link>
      </div>
    </nav>
  )
}