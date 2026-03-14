"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserButton } from "@clerk/nextjs";

/* ═══════════════════════════════════════════════════════════════════════════
   STAR FIELD — client-only, avoids hydration mismatch
   ═══════════════════════════════════════════════════════════════════════════ */
function StarField() {
  const [stars, setStars] = useState<string>("");

  useEffect(() => {
    const generated = Array.from({ length: 200 }, () => {
      const x = (Math.random() * 100).toFixed(2);
      const y = (Math.random() * 100).toFixed(2);
      const size = Math.random() > 0.88 ? "2px" : "1px";
      const opacity = (0.04 + Math.random() * 0.14).toFixed(3);
      return `${x}vw ${y}vh 0 ${size} rgba(255,255,255,${opacity})`;
    }).join(", ");
    setStars(generated);
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: "#080c14" }}
    >
      {stars && (
        <div
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            boxShadow: stars,
          }}
        />
      )}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: "linear-gradient(to bottom, transparent 20%, #000000 100%)",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════════════════════ */
function SignalNav() {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < 80 || y < lastY.current);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-6 md:px-10"
      style={{
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        background: "rgba(8,12,20,0.75)",
        borderBottom: "1px solid rgba(20,184,166,0.06)",
      }}
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -70 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <Link
        href="/2"
        className="text-sm font-mono tracking-wide"
        style={{ color: "#14B8A6" }}
      >
        ixos
      </Link>
      <div className="flex items-center gap-6 text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
        <Link href="/2/docs" className="hover:text-white/80 transition-colors font-mono text-xs tracking-wider uppercase">Docs</Link>
        <Link href="/2/pricing" className="hover:text-white/80 transition-colors font-mono text-xs tracking-wider uppercase">Pricing</Link>
        <div className="w-[1px] h-3 bg-white/10 mx-1 hidden sm:block" />
        
        {isSignedIn ? (
          <>
            <Link href="/2/account" className="hidden sm:block hover:text-white/80 transition-colors font-mono text-xs tracking-wider uppercase">Account</Link>
            <UserButton afterSignOutUrl="/" />
          </>
        ) : (
          <>
            <Link href="/2/signin" className="hidden sm:block hover:text-white/80 transition-colors font-mono text-xs tracking-wider uppercase">Sign In</Link>
            <Link
              href="/2/signup"
              className="px-4 py-1.5 rounded font-mono text-xs tracking-wider uppercase transition-all bg-white/5 border border-white/10 hover:bg-white/10"
            >
              Sign Up
            </Link>
          </>
        )}
        
        <Link
          href="/2/download"
          className="px-4 py-1.5 rounded font-mono text-xs tracking-wider uppercase transition-all"
          style={{
            background: "rgba(20,184,166,0.1)",
            color: "#14B8A6",
            border: "1px solid rgba(20,184,166,0.25)",
          }}
        >
          Download
        </Link>
      </div>
    </motion.nav>
  );
}

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="relative min-h-screen text-gray-200 overflow-x-hidden selection:bg-teal-400/20"
      style={{ background: "#080c14" }}
    >
      <StarField />
      <SignalNav />

      <main className="relative z-10 min-h-screen">
        {children}
      </main>
      </div>
      );
      }
