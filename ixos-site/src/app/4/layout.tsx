"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserButton } from "@clerk/nextjs";
import { V4LayoutProvider, useV4Layout } from "./V4LayoutState";

function V4Sidebar() {
  const { isSidebarVisible } = useV4Layout();
  const { isSignedIn } = useAuth();

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: isSidebarVisible ? 1 : 0, 
        x: isSidebarVisible ? 0 : -20 
      }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 bottom-0 w-[240px] z-50 flex flex-col border-r border-white/5 bg-[#0C0E10]/80 backdrop-blur-xl"
      style={{ pointerEvents: isSidebarVisible ? 'auto' : 'none' }}
    >
      <div className="p-6">
        <Link href="/4" className="flex items-center gap-2">
          <span className="font-mono font-bold text-teal-400 text-lg tracking-tight">IXOS</span>
          <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest mt-1">protocol</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
        {[
          { label: "Home", href: "/4" },
          { label: "Pricing", href: "/4/pricing" },
          { label: "Docs", href: "/4/docs" },
          { label: "Download", href: "/4/download" },
        ].map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="px-4 py-2 rounded-md font-mono text-xs text-white/50 uppercase tracking-widest hover:text-white/90 hover:bg-white/5 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        {isSignedIn ? (
          <div className="flex items-center justify-between">
            <Link 
              href="/4/account" 
              className="font-mono text-xs text-white/50 hover:text-white/90 uppercase tracking-widest"
            >
              Account
            </Link>
            <UserButton afterSignOutUrl="/4" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Link
              href="/4/signin"
              className="px-4 py-2 font-mono text-xs text-center text-white/50 uppercase tracking-widest hover:text-white/90 bg-white/5 rounded-md transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/4/signup"
              className="px-4 py-2 font-mono text-xs text-center text-[#0C0E10] bg-teal-400 uppercase tracking-widest font-bold hover:bg-teal-300 rounded-md transition-colors shadow-[0_0_15px_rgba(45,212,191,0.2)]"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function V4LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSidebarVisible } = useV4Layout();
  const isRoot = pathname === "/4";

  return (
    <div className="min-h-screen bg-[#080A0C] text-[#F3F5F7] selection:bg-teal-500/30 font-sans">
      <div 
        className="transition-all duration-700 ease-out min-h-screen"
        style={{ paddingLeft: 0 }}
      >
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function V4Layout({ children }: { children: React.ReactNode }) {
  return (
    <V4LayoutProvider>
      <V4LayoutInner>{children}</V4LayoutInner>
    </V4LayoutProvider>
  );
}