"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "#how-it-works", label: "Product" },
  { href: "#progressive", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function NavV4() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(12,14,16,0.90)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "none",
      }}
    >
      {/* Measurement tick strip — top edge */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.12) 0px,
            rgba(255,255,255,0.12) 1px,
            transparent 1px,
            transparent 60px
          )`,
          opacity: 0.4,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-6 h-6 shrink-0">
            <Image
              src="/assets/logo-v3.png"
              alt="Ixos"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="font-mono text-xs font-semibold text-white/80 tracking-[0.25em] uppercase group-hover:text-white transition-colors">
            Ixos
          </span>
          {/* Divider tick */}
          <span className="hidden md:block w-px h-3 bg-white/15 ml-1" />
        </Link>

        {/* Desktop nav — instrument rail */}
        <nav className="hidden md:flex items-center" role="navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-5 py-2 font-mono text-[10px] tracking-[0.22em] uppercase text-white/35 hover:text-white/80 transition-colors duration-200 group"
            >
              {/* Active dot reveal */}
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 w-0.5 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ backgroundColor: "#2DD4BF" }}
              />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/download"
            className="font-mono text-[10px] px-5 py-2 tracking-[0.25em] uppercase transition-all duration-200 hover:bg-[#2DD4BF]/10"
            style={{
              border: "1px solid rgba(45,212,191,0.35)",
              color: "#2DD4BF",
            }}
          >
            Download
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden flex flex-col gap-1.5 w-5 cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          <span
            className="h-px bg-white/50 transition-all duration-300 origin-center"
            style={{
              transform: mobileOpen ? "rotate(45deg) translateY(5px)" : "none",
            }}
          />
          <span
            className="h-px bg-white/50 transition-opacity duration-300"
            style={{ opacity: mobileOpen ? 0 : 1 }}
          />
          <span
            className="h-px bg-white/50 transition-all duration-300 origin-center"
            style={{
              transform: mobileOpen ? "rotate(-45deg) translateY(-5px)" : "none",
            }}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{
          maxHeight: mobileOpen ? "400px" : "0",
          borderBottom: mobileOpen ? "1px solid rgba(255,255,255,0.05)" : "none",
        }}
      >
        <div
          className="px-6 py-8 flex flex-col gap-5"
          style={{ background: "rgba(12,14,16,0.96)" }}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="font-mono text-xs tracking-[0.25em] uppercase text-white/50 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-white/[0.05]">
            <Link
              href="/download"
              onClick={() => setMobileOpen(false)}
              className="block font-mono text-xs px-5 py-3 text-center tracking-[0.25em] uppercase"
              style={{
                border: "1px solid rgba(45,212,191,0.35)",
                color: "#2DD4BF",
              }}
            >
              Download
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
