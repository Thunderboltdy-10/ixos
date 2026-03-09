"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserButton } from "@clerk/nextjs";
import { ArcNoiseBackground } from "@/components/effects/ArcNoiseBackground";

/* ── CSS injection for conic pulse + section reveals ────────────────── */
const GLOBAL_STYLES = `
@keyframes amberSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes sectionRevealLeft {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0% 0 0); }
}
@keyframes sectionRevealRight {
  from { clip-path: inset(0 0 0 100%); }
  to   { clip-path: inset(0 0 0 0%); }
}
@keyframes sectionRevealUp {
  from { clip-path: inset(100% 0 0 0); }
  to   { clip-path: inset(0% 0 0 0); }
}
@keyframes sectionRevealDown {
  from { clip-path: inset(0 0 100% 0); }
  to   { clip-path: inset(0 0 0% 0); }
}
@keyframes nodeActivePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(246,185,76,0.5); }
  50%       { box-shadow: 0 0 0 8px rgba(246,185,76,0); }
}
@keyframes scanLine {
  0%   { top: 0%; opacity: 0.6; }
  90%  { top: 100%; opacity: 0.3; }
  100% { top: 100%; opacity: 0; }
}
@keyframes amberBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
@keyframes floatUp {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-6px); }
  100% { transform: translateY(0px); }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.04; }
  50%       { opacity: 0.09; }
}
@keyframes datastream {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
`;

function GlobalStyles() {
  useEffect(() => {
    if (document.getElementById("p1-global-styles")) return;
    const el = document.createElement("style");
    el.id = "p1-global-styles";
    el.textContent = GLOBAL_STYLES;
    document.head.appendChild(el);
  }, []);
  return null;
}

function SpotlightBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const progress =
        window.scrollY /
        Math.max(1, document.body.scrollHeight - window.innerHeight);
      const y = 10 + Math.min(progress, 0.4) * 60;
      const x = 50 + Math.sin(progress * Math.PI) * 10;

      const alphaBloom = Math.max(0.015, 0.15 - progress * 0.6);
      const alphaTop = Math.max(0.005, 0.18 - progress * 0.8);
      const alphaMid = Math.max(0.005, 0.04 - progress * 0.3);
      const alphaTopEllipse = Math.max(0.005, 0.22 - progress * 0.9);

      if (ref.current) {
        ref.current.style.setProperty("--spot-y", `${y}vh`);
        ref.current.style.setProperty("--spot-x", `${x}%`);
        ref.current.style.setProperty("--alpha-bloom", `${alphaBloom}`);
        ref.current.style.setProperty("--alpha-top", `${alphaTop}`);
        ref.current.style.setProperty("--alpha-mid", `${alphaMid}`);
        ref.current.style.setProperty("--alpha-top-ellipse", `${alphaTopEllipse}`);
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div ref={ref} className="fixed inset-0 pointer-events-none z-0">
      <ArcNoiseBackground intensity={0.5} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(800px circle at var(--spot-x, 50%) var(--spot-y, 15vh), rgba(246,185,76,var(--alpha-bloom, 0.07)) 0%, transparent 65%)",
        }}
      />
      {/* Semicircle top glow pointing downwards */}
      <div
        style={{
          position: "absolute",
          top: "-50vh", left: "-50vw", width: "200vw", height: "100vh",
          background:
            "radial-gradient(ellipse at bottom, rgba(246,185,76,var(--alpha-top-ellipse, 0.15)) 0%, rgba(246,185,76,0.02) 50%, transparent 80%)",
          pointerEvents: "none",
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%", left: "50%", width: "180vmax", height: "180vmax",
          marginLeft: "-90vmax", marginTop: "-90vmax",
          background:
            "conic-gradient(from 0deg, transparent 0%, rgba(246,185,76,0.03) 25%, transparent 50%, rgba(246,185,76,0.02) 75%, transparent 100%)",
          animation: "amberSpin 24s linear infinite",
          opacity: 0.06,
          willChange: "transform",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0, height: "40vh",
          background: "linear-gradient(to top, rgba(246,185,76,0.025) 0%, transparent 100%)",
          animation: "glowPulse 8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function MissionTicker() {
  const TICKS = useMemo(() => [
    "SCAN ░ 1,247 files",
    "LEXICAL ░ 89 candidates",
    "SEMANTIC ░ 24 embedded",
    "CACHE ░ 19 hits",
    "LOCKED ░ 312ms",
    "MRR@10 ░ 0.834",
    "HMAC ░ VERIFIED",
    "PRIVACY ░ LOCAL ONLY",
  ], []);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((n) => (n + 1) % TICKS.length), 2200);
    return () => clearInterval(id);
  }, [TICKS.length]);

  return (
    <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(246,185,76,0.6)" }}>
      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", backgroundColor: "#F6B94C", boxShadow: "0 0 8px #F6B94C", animation: "amberBlink 1s steps(1) infinite" }} />
      <AnimatePresence mode="wait">
        <motion.span key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {TICKS[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

const NAV = [
  { label: "Pipeline", href: "/1#pipeline" },
  { label: "Evidence", href: "/1#evidence" },
  { label: "Modes", href: "/1#modes" },
  { label: "Today", href: "/1#today" },
  { label: "CLI", href: "/1#cli" },
  { label: "Pricing", href: "/1/pricing" },
];

export default function V1Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const A = "#F6B94C";

  return (
    <div className="min-h-screen bg-[#0E1117] text-white selection:bg-amber-500/30 overflow-x-hidden" style={{ fontFamily: "'Geist Mono', monospace" }}>
      <GlobalStyles />
      <SpotlightBackground />

      <nav
        className="fixed top-0 inset-x-0 z-50 h-12 flex items-center px-4 md:px-8"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(14,17,23,0.85)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Link href="/1" className="font-mono text-sm font-semibold tracking-tight mr-8 shrink-0" style={{ color: A }}>
          IXOS
        </Link>
        
        <div className="hidden lg:block mr-8">
          <MissionTicker />
        </div>
        
        <div className="hidden lg:flex items-center gap-6 text-[11px] tracking-widest uppercase text-white/40">
          {NAV.map((l) => (
            <Link key={l.label} href={l.href} className="hover:text-white/80 transition-colors duration-150">
              {l.label}
            </Link>
          ))}
          <Link href="/1/docs" className="hover:text-white/80 transition-colors uppercase">Docs</Link>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {isSignedIn ? (
            <>
              <Link href="/1/account" className="hidden md:block text-[11px] font-mono tracking-widest uppercase text-white/40 hover:text-white/80">Account</Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Link href="/1/signin" className="hidden md:block text-[11px] font-mono tracking-widest uppercase text-white/40 hover:text-white/80">Sign In</Link>
              <Link href="/1/signup" className="hidden md:block text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-all">Sign Up</Link>
            </>
          )}
          <Link href="/1/download" className="text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded" style={{ background: `${A}15`, color: A, border: `1px solid ${A}25`, boxShadow: `0 0 12px ${A}10` }}>
            Download
          </Link>
        </div>
      </nav>

      <main className="relative z-10 pt-12">
        {children}
      </main>
    </div>
  );
}
