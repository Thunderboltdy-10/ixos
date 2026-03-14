"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserButton } from "@clerk/nextjs";
import { GridBackground } from "./GridBackground";
import { ScanBeam } from "./ScanBeam";

/* ──────────────────────────────────────────────
   Radar Ping — periodic amber circle pulse
   ────────────────────────────────────────────── */
function RadarPing({ scanY }: { scanY: number }) {
  const [pingKey, setPingKey] = useState(0);
  const [active, setActive] = useState(false);
  const [pingY, setPingY] = useState(50);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    
    function firePing() {
      setPingY(scanY > 5 ? scanY : 50);
      setPingKey((k) => k + 1);
      setActive(true);
      hideTimer = setTimeout(() => setActive(false), 3000);
    }

    const initialDelay = setTimeout(() => {
      firePing();
      const interval = setInterval(firePing, 8000);
      return () => clearInterval(interval);
    }, 4000);

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(hideTimer);
    };
  }, [scanY]);

  if (!active) return null;

  return (
    <div
      className="fixed pointer-events-none z-30"
      style={{
        left: '50%',
        top: `${pingY}vh`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        key={`ping-${pingKey}`}
        style={{
          width: '80vw',
          height: '80vw',
          maxWidth: '80vw',
          borderRadius: '50%',
          border: '1px solid rgba(246,185,76,0.2)',
          animation: 'radar-ping 3s ease-out forwards',
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   TOP HUD NAV — Fixed top bar for subpages
   ────────────────────────────────────────────── */
function HUDNav() {
  const { isSignedIn } = useAuth();
  
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-[54px] flex items-center justify-between px-6 md:px-10"
      style={{
        background: "rgba(10,13,18,0.7)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(246,185,76,0.08)",
      }}
    >
      <div className="flex items-center gap-6">
        <Link href="/3" className="font-mono text-sm font-bold tracking-tighter text-amber-400">IXOS</Link>
        <div className="hidden lg:flex items-center gap-6 text-[10px] font-mono tracking-[0.2em] text-white/30 uppercase">
          <Link href="/3/docs" className="hover:text-amber-400/80 transition-colors">Docs</Link>
          <Link href="/3/pricing" className="hover:text-amber-400/80 transition-colors">Pricing</Link>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {isSignedIn ? (
          <>
            <Link href="/3/account" className="hidden sm:block font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase hover:text-white/80">Account</Link>
            <UserButton afterSignOutUrl="/" />
          </>
        ) : (
          <>
            <Link href="/3/signin" className="hidden sm:block font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase hover:text-white/80">Sign In</Link>
            <Link
              href="/3/signup"
              className="px-4 py-1.5 border border-amber-400/20 rounded font-mono text-[10px] tracking-[0.2em] text-amber-400/70 uppercase hover:bg-amber-400/5 transition-all"
            >
              Sign Up
            </Link>
          </>
        )}
        <Link
          href="/3/download"
          className="px-4 py-1.5 bg-amber-400 text-[#0A0D0F] font-mono font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-amber-300 transition-colors"
        >
          Download
        </Link>
      </div>
    </nav>
  );
}

import { ScanProvider, useScan } from "./ScanContext";

function V3LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { scanY, handleScanProgress } = useScan();

  return (
    <div
      className="relative min-h-screen text-[#f3f5f7] font-mono selection:bg-amber-400/30"
      style={{ backgroundColor: '#0A0D0F', overflowX: 'clip' }}
    >
      <style>{`
        @keyframes radar-ping {
          0% { transform: scale(0); opacity: 0.25; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 1.5; }
        }
      `}</style>

      {pathname !== "/3" && <HUDNav />}
      
      {/* Background elements */}
      <GridBackground scanY={scanY} />
      <ScanBeam onProgress={handleScanProgress} />
      <RadarPing scanY={scanY} />

      <main className="relative z-10 pt-14">
        {children}
      </main>
    </div>
  );
}

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return (
    <ScanProvider>
      <V3LayoutInner>{children}</V3LayoutInner>
    </ScanProvider>
  );
}
