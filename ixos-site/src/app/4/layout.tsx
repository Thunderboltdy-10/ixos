"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserButton } from "@clerk/nextjs";

// Beautiful, airy navbar with soft drop shadows and clean typography
function V4Navbar({ isLanding }: { isLanding: boolean }) {
  const { isSignedIn, isLoaded } = useAuth();
  
  const landingClasses = "bg-black/20 backdrop-blur-md border-white/5 text-white shadow-none";
  const subpageClasses = "bg-white/80 backdrop-blur-xl border-gray-200/50 shadow-sm text-[#0D1117]";

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 border-b transition-all ${isLanding ? landingClasses : subpageClasses}`}>
      <div className="flex items-center gap-8">
        <Link href="/4" className="flex items-center gap-2">
          <span className={`font-sans font-extrabold text-xl tracking-tight ${isLanding ? 'text-white' : 'text-[#0D1117]'}`}>IXOS</span>
          <span className="font-mono text-[10px] text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">Pro</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {[
            { label: "Platform", href: "/4/docs" },
            { label: "Pricing", href: "/4/pricing" },
            { label: "Download", href: "/4/download" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`font-sans text-sm font-medium transition-colors ${isLanding ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-blue-600'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isLoaded && isSignedIn ? (
          <>
            <Link href="/4/account" className={`font-sans text-sm font-medium hidden sm:block ${isLanding ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-blue-600'}`}>Account</Link>
            <UserButton afterSignOutUrl="/4" />
          </>
        ) : isLoaded && !isSignedIn ? (
          <>
            <Link href="/4/signin" className={`font-sans text-sm font-medium hidden sm:block ${isLanding ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-blue-600'}`}>Sign In</Link>
            <Link
              href="/4/signup"
              className="px-5 py-2 rounded-full font-sans text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all"
            >
              Get Started
            </Link>
          </>
        ) : null}
      </div>
    </nav>
  );
}

export default function V4Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/4" || pathname === "/4/";

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden selection:bg-blue-100 transition-colors duration-500 ${isLanding ? 'bg-[#05070A] text-white' : 'bg-gray-50 text-[#0D1117]'}`}>
      {/* Soft pastel gradient mesh background - only for subpages */}
      {!isLanding && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-cyan-100/40 to-blue-200/40 blur-[120px]" />
          <div className="absolute top-[30%] -right-[20%] w-[60%] h-[80%] rounded-full bg-gradient-to-tl from-purple-100/40 to-magenta-100/40 blur-[150px]" />
          <div className="absolute bottom-[0%] left-[20%] w-[80%] h-[50%] rounded-full bg-gradient-to-tr from-emerald-50/50 to-cyan-100/40 blur-[100px]" />
        </div>
      )}

      {/* For landing page, we want a more tactical deep theme */}
      {isLanding && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#0A1A2F_0%,transparent_50%)] opacity-40" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#0D1117_0%,transparent_50%)] opacity-40" />
        </div>
      )}

      <V4Navbar isLanding={isLanding} />

      <main className={`relative z-10 ${isLanding ? '' : 'pt-16'}`}>
        {children}
      </main>
    </div>
  );
}
