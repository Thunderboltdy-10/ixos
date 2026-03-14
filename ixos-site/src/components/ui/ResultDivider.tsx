"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Terminal, Shield, Zap, Search, FileText, ChevronRight } from "lucide-react";

interface ResultDividerProps {
  query: string;
  resultTitle: string;
  resultPath: string;
  resultSnippet: string;
  score: number;
  accentColor: string;
  variant?: "1" | "2" | "3" | "4" | "5";
}

export function ResultDivider({
  query,
  resultTitle,
  resultPath,
  resultSnippet,
  score,
  accentColor,
  variant = "1",
}: ResultDividerProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="w-full py-24 px-6 overflow-hidden relative">
      {/* Background track */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/5 z-0" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Search query tag */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/40 mb-8"
        >
          <Search size={12} style={{ color: accentColor }} />
          Query: <span className="text-white/70">{query}</span>
        </motion.div>

        {/* Result Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative group p-6 sm:p-8 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden hover:border-white/20 transition-all shadow-2xl"
          style={{
            boxShadow: isInView ? `0 20px 50px -10px ${accentColor}11` : "none",
          }}
        >
          {/* Accent glow corner */}
          <div 
            className="absolute -top-12 -right-12 w-24 h-24 blur-3xl opacity-20 transition-opacity group-hover:opacity-40" 
            style={{ backgroundColor: accentColor }}
          />

          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                  <FileText size={18} style={{ color: accentColor }} />
                </div>
                <div className="font-mono text-xs text-white/30 truncate uppercase tracking-wider">
                  {resultPath}
                </div>
              </div>
              
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                {resultTitle} <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" style={{ color: accentColor }} />
              </h3>
              
              <p className="text-sm sm:text-base text-white/50 leading-relaxed max-w-2xl font-mono">
                {resultSnippet}
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-2">
              <div 
                className="w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center relative"
                style={{ borderColor: `${accentColor}44` }}
              >
                <div className="text-xl font-bold" style={{ color: accentColor }}>{score}</div>
                <div className="text-[8px] font-mono uppercase tracking-tighter opacity-40">Score</div>
                
                {/* Score ring fill */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="30"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="2"
                    strokeDasharray={`${score * 1.88} 188`}
                    strokeLinecap="round"
                    className="opacity-40"
                  />
                </svg>
              </div>
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest text-center">
                HMAC_VERIFIED
              </div>
            </div>
          </div>

          {/* Bottom metrics bar */}
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-6 items-center opacity-40 group-hover:opacity-70 transition-opacity">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
              <Zap size={10} style={{ color: accentColor }} /> Lexical: 0.88
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
              <Shield size={10} style={{ color: accentColor }} /> Semantic: 0.94
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
              <Terminal size={10} style={{ color: accentColor }} /> Source: {variant === "4" ? "Desktop" : "Node"}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
