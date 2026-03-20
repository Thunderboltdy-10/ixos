import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";
import { FolderSearch, Sparkles, Zap, Shield } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ixplorer | Ixos",
  description: "A reimagined file explorer powered by semantic search.",
};

export default function IxplorerPage() {
  return (
    <div className="pt-40 pb-24 px-6 min-h-screen relative z-10 flex flex-col items-center justify-center">
      <div className="max-w-4xl mx-auto w-full text-center">
        <FadeInView direction="up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 mb-8 mx-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(246,185,76,0.6)]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-500">Coming Soon</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold font-display text-white mb-6 tracking-tight">
            Ixplorer.
          </h1>
          <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-16 font-mono">
            A native file explorer reimagined from the ground up, with semantic search built directly into its core.
          </p>
        </FadeInView>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left relative">
          {/* Wireframe bg element */}
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none md:flex hidden items-center justify-center">
            <svg width="400" height="300" viewBox="0 0 400 300" fill="none" className="text-amber-500/20">
              <rect x="10" y="10" width="380" height="280" rx="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" />
              <rect x="30" y="30" width="100" height="240" rx="4" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
              <rect x="150" y="80" width="220" height="40" rx="4" stroke="currentColor" strokeWidth="1" />
              <rect x="150" y="140" width="220" height="40" rx="4" stroke="currentColor" strokeWidth="1" />
              <rect x="150" y="200" width="220" height="40" rx="4" stroke="currentColor" strokeWidth="1" />
              <path d="M 150 45 L 370 45" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <FadeInView direction="up" delay={150}>
            <div className="relative border border-amber-500/10 bg-[#0A0D14]/80 backdrop-blur-sm p-8 rounded-xl h-full group hover:border-amber-500/30 transition-all shadow-xl hover:shadow-[0_0_30px_rgba(246,185,76,0.05)]">
              <CornerBrackets size={12} color="rgba(246,185,76,0.4)" />
              <FolderSearch className="w-8 h-8 text-amber-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-3">Semantic Navigation</h3>
              <p className="text-sm font-light text-white/50 leading-relaxed font-mono">
                Instead of rigid trees, navigate by meaning. Ask "Show me recent budget plans" and the folder instantly synthesizes the view.
              </p>
            </div>
          </FadeInView>

          <FadeInView direction="up" delay={250}>
            <div className="relative border border-teal-500/10 bg-[#0A0D14]/80 backdrop-blur-sm p-8 rounded-xl h-full group hover:border-teal-500/30 transition-all shadow-xl hover:shadow-[0_0_30px_rgba(20,184,166,0.05)]">
              <CornerBrackets size={12} color="rgba(20,184,166,0.4)" />
              <Sparkles className="w-8 h-8 text-teal-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-3">Smart Clusters</h3>
              <p className="text-sm font-light text-white/50 leading-relaxed font-mono">
                No more losing files in chaotic Downloads folders. Ixplorer automatically clusters related files based on context, not just extensions.
              </p>
            </div>
          </FadeInView>

          <FadeInView direction="up" delay={350}>
            <div className="relative border border-violet-500/10 bg-[#0A0D14]/80 backdrop-blur-sm p-8 rounded-xl h-full group hover:border-violet-500/30 transition-all shadow-xl hover:shadow-[0_0_30px_rgba(124,92,255,0.05)]">
              <CornerBrackets size={12} color="rgba(124,92,255,0.4)" />
              <Zap className="w-8 h-8 text-violet-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-3">Instant Filter</h3>
              <p className="text-sm font-light text-white/50 leading-relaxed font-mono">
                Type as you browse. Sub-millisecond filtering across thousands of files, running natively with hardware acceleration.
              </p>
            </div>
          </FadeInView>

          <FadeInView direction="up" delay={450}>
            <div className="relative border border-amber-500/10 bg-[#0A0D14]/80 backdrop-blur-sm p-8 rounded-xl h-full group hover:border-amber-500/30 transition-all shadow-xl hover:shadow-[0_0_30px_rgba(246,185,76,0.05)]">
              <CornerBrackets size={12} color="rgba(246,185,76,0.4)" />
              <Shield className="w-8 h-8 text-amber-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-3">Ixos Powered</h3>
              <p className="text-sm font-light text-white/50 leading-relaxed font-mono">
                Built directly on the Ixos local semantic engine. Fully private, completely offline, zero cloud dependencies.
              </p>
            </div>
          </FadeInView>
        </div>

        <FadeInView direction="up" delay={600}>
          <div className="mt-20">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-white/40 hover:text-white transition-colors"
            >
              <span className="text-amber-500">←</span> Return to Ixos
            </Link>
          </div>
        </FadeInView>
      </div>
    </div>
  );
}
