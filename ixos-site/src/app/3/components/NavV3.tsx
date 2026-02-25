"use client";

import Link from "next/link";
import { Search } from "lucide-react";

export function NavV3() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0E1117] border-b border-white/20">
            <div className="flex h-16 items-stretch">
                {/* Logo Block */}
                <div className="w-16 md:w-64 flex-shrink-0 border-r border-white/20 flex items-center px-4 md:px-8 bg-white text-black transition-colors hover:bg-[#F6B94C]">
                    <Link href="/3" className="font-display font-bold text-xl tracking-tighter uppercase w-full">
                        <span className="hidden md:inline">IXOS Local</span>
                        <span className="md:hidden">IX</span>
                    </Link>
                </div>

                {/* Nav Links Block */}
                <nav className="flex-1 flex items-stretch">
                    <a href="#about" className="hidden md:flex items-center px-8 border-r border-white/20 text-xs font-mono uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                        Protocol
                    </a>
                    <a href="#stats" className="hidden md:flex items-center px-8 border-r border-white/20 text-xs font-mono uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                        Telemetry
                    </a>
                    <a href="#faq" className="flex items-center px-8 text-xs font-mono uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                        FAQ
                    </a>
                </nav>

                {/* Action Block */}
                <div className="flex items-stretch border-l border-white/20">
                    <Link href="#download" className="flex items-center px-8 text-xs font-mono uppercase tracking-widest text-[#F6B94C] hover:bg-[#F6B94C] hover:text-black transition-colors">
                        Download_v1.0
                    </Link>
                </div>
            </div>
        </header>
    );
}
