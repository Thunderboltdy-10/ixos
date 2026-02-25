"use client";

import Link from "next/link";
import { Box } from "lucide-react";

export function FooterV1() {
  return (
    <footer className="bg-[#0A0D14] pt-16 pb-8 border-t border-white/5">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand Col */}
          <div className="md:col-span-2">
            <Link
              href="/1"
              className="flex items-center gap-3 mb-6 group w-fit"
            >
              <div className="w-8 h-8 flex items-center justify-center border border-white/20 bg-bg-graphite-1 group-hover:border-accent-amber transition-colors">
                <Box className="w-4 h-4 text-accent-amber" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-fg-porcelain">
                Ixos
              </span>
            </Link>
            <p className="font-mono text-xs text-fg-muted max-w-sm leading-relaxed">
              Performance-first semantic file search. 29ms cold queries. Zero
              idle RAM. Zero background daemons.
            </p>
          </div>

          {/* Links Col 1 */}
          <div className="flex flex-col gap-4 font-mono text-sm">
            <span className="text-xs text-fg-porcelain uppercase tracking-widest mb-2 font-semibold border-b border-white/10 pb-2">
              Infrastructure
            </span>
            <Link
              href="#"
              className="text-fg-muted hover:text-accent-amber transition-colors"
            >
              Core Engine
            </Link>
            <Link
              href="#"
              className="text-fg-muted hover:text-accent-amber transition-colors"
            >
              Ralph Model
            </Link>
            <Link
              href="#"
              className="text-fg-muted hover:text-accent-amber transition-colors"
            >
              Benchmarks
            </Link>
            <Link
              href="#"
              className="text-fg-muted hover:text-accent-amber transition-colors"
            >
              Security Model
            </Link>
          </div>

          {/* Links Col 2 */}
          <div className="flex flex-col gap-4 font-mono text-sm">
            <span className="text-xs text-fg-porcelain uppercase tracking-widest mb-2 font-semibold border-b border-white/10 pb-2">
              Resources
            </span>
            <Link
              href="#"
              className="text-fg-muted hover:text-accent-amber transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="#"
              className="text-fg-muted hover:text-accent-amber transition-colors"
            >
              GitHub Repository
            </Link>
            <Link
              href="#"
              className="text-fg-muted hover:text-accent-amber transition-colors"
            >
              Changelog
            </Link>
            <Link
              href="#"
              className="text-fg-muted hover:text-accent-amber transition-colors"
            >
              Enterprise Support
            </Link>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-mono text-[10px] text-fg-muted uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" />
              All Systems Nominal
            </div>
            <span className="text-fg-muted/30">|</span>
            <span className="font-mono text-[10px] text-fg-muted uppercase tracking-widest">
              v3.2.0-stable
            </span>
          </div>
          <p className="font-mono text-[10px] text-fg-muted/50 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Ixos Intelligence.
          </p>
        </div>
      </div>
    </footer>
  );
}
