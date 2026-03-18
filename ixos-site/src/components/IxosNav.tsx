'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth, UserButton } from '@clerk/nextjs'

export function IxosNav() {
  const [activeSection, setActiveSection] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [pillState, setPillState] = useState({ left: 0, width: 0, visible: false })
  const containerRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef<(HTMLElement | null)[]>([])
  const { isSignedIn, isLoaded } = useAuth()
  const pathname = usePathname() || ''
  const isHomePage = pathname === '/'

  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    if (!isHomePage) return
    const sections = ['hero', 'how-it-works', 'use-cases', 'features', 'privacy']
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id)
      })
    }, { rootMargin: '-30% 0px -70% 0px' })
    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [isHomePage])

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#') && isHomePage) {
      e.preventDefault()
      const id = href.replace('/#', '')
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // On homepage: show section anchors + page links
  // On subpages: only show page-level links (no section anchors)
  const navLinks = [
    { label: 'Product', href: '/#how-it-works', sectionId: 'how-it-works' },
    { label: 'Use Cases', href: '/#use-cases', sectionId: 'use-cases' },
    { label: 'Privacy', href: '/#privacy', sectionId: 'privacy' },
    { label: 'Pricing', href: '/pricing', sectionId: '' },
    { label: 'Docs', href: '/docs', sectionId: '' },
    { label: 'Developers', href: '/developers', sectionId: '' },
  ]

  const isLinkActive = (link: { href: string; sectionId: string }) => {
    if (link.sectionId) return activeSection === link.sectionId
    return pathname === link.href || pathname.startsWith(link.href + '/')
  }

  const isAccountActive = pathname === '/account' || pathname.startsWith('/account/')

  const movePill = (idx: number) => {
    const el = linkRefs.current[idx]
    const container = containerRef.current
    if (el && container) {
      const elRect = el.getBoundingClientRect()
      const cRect = container.getBoundingClientRect()
      setPillState({ left: elRect.left - cRect.left, width: elRect.width, visible: true })
    }
  }

  const hidePill = () => setPillState(p => ({ ...p, visible: false }))

  const totalNavLinks = navLinks.length
  const accountIdx = totalNavLinks

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main"
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-1.5 px-3 py-2 rounded-full border border-amber-400/30 bg-[#0A0D0F]/95 backdrop-blur-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
        style={{ whiteSpace: 'nowrap' }}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 mr-1 group">
          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(246,185,76,0.8)] group-hover:scale-125 transition-transform" />
          <span className="font-mono text-sm font-bold tracking-tighter text-white">IXOS</span>
        </Link>

        {/* Desktop links with sliding hover pill */}
        <div
          ref={containerRef}
          className="hidden lg:flex items-center gap-0 border-x border-white/10 px-2 relative"
          onMouseLeave={hidePill}
        >
          {/* Sliding hover pill */}
          <div
            aria-hidden
            className="absolute top-0.5 bottom-0.5 rounded-full pointer-events-none"
            style={{
              left: pillState.left,
              width: pillState.width,
              opacity: pillState.visible ? 1 : 0,
              background: 'rgba(255,255,255,0.05)',
              transition: 'left 160ms cubic-bezier(0.4,0,0.2,1), width 160ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease',
            }}
          />

          {navLinks.map((link, i) => {
            const isActive = isLinkActive(link)
            return (
              <Link
                key={link.label}
                ref={el => { linkRefs.current[i] = el }}
                href={link.href}
                onClick={e => scrollTo(e as any, link.href)}
                onMouseEnter={() => movePill(i)}
                className={`relative z-10 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full transition-colors duration-150 ${
                  isActive
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                {link.label}
              </Link>
            )
          })}

          {/* Account — inside container for pill tracking */}
          {isLoaded && isSignedIn && (
            <Link
              ref={el => { linkRefs.current[accountIdx] = el }}
              href="/account"
              onMouseEnter={() => movePill(accountIdx)}
              className={`relative z-10 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full transition-colors duration-150 ${
                isAccountActive
                  ? 'text-amber-400 bg-amber-400/10 shadow-[inset_0_0_12px_rgba(246,185,76,0.12)]'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Account
            </Link>
          )}
        </div>

        {/* Auth & CTA */}
        <div className="flex items-center gap-1 ml-1">
          {isLoaded && isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : isLoaded ? (
            <Link
              href="/sign-in"
              className="hidden sm:block px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors rounded-full hover:bg-white/5"
            >
              Sign In
            </Link>
          ) : null}
          <Link
            href="/download"
            className="px-5 py-2 bg-amber-400 text-[#0A0D0F] font-mono font-bold text-[10px] tracking-widest uppercase rounded-full hover:bg-amber-300 transition-all shadow-[0_0_20px_rgba(246,185,76,0.4)] hover:scale-105 active:scale-95"
          >
            Download
          </Link>

          {/* Mobile toggle */}
          <button
            className="lg:hidden ml-1 p-2 text-white/40 hover:text-white/80 transition-colors rounded-full hover:bg-white/5"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              {menuOpen ? (
                <path d="M3 3l10 10M3 13L13 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              ) : (
                <>
                  <rect y="3" width="16" height="1.5" rx="0.75" />
                  <rect y="7.25" width="16" height="1.5" rx="0.75" />
                  <rect y="11.5" width="16" height="1.5" rx="0.75" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden fixed top-[72px] left-1/2 -translate-x-1/2 z-[199] w-72 rounded-2xl border border-amber-400/20 bg-[#0A0D0F]/98 backdrop-blur-3xl shadow-2xl py-3 px-2">
          {navLinks.map(link => (
            <Link
              key={link.label}
              href={link.href}
              onClick={e => { scrollTo(e as any, link.href); setMenuOpen(false) }}
              className="block px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 hover:text-white/90 hover:bg-white/5 rounded-xl transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {isLoaded && isSignedIn && (
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 hover:text-white/90 hover:bg-white/5 rounded-xl transition-colors"
            >
              Account
            </Link>
          )}
          {isLoaded && !isSignedIn && (
            <Link
              href="/sign-in"
              className="block px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 hover:text-white/90 hover:bg-white/5 rounded-xl transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </>
  )
}
