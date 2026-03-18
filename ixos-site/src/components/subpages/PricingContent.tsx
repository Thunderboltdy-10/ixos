"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Terminal, Shield, Zap, Box, Lock, Unlock, Cpu, Layers, Fingerprint, Globe, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProUpgradeAction } from "@/components/sections/ProUpgradeAction";

const FREE_FEATURES = [
  "Local semantic search with Flash mode",
  "VS Code extension integration",
  "Up to 3 active workstreams",
  "Tamper-proof file verification",
  "Community support",
];

const PRO_FEATURES = [
  "Deep search models for better results",
  "Unlimited workstreams with session recovery",
  "Maximum privacy mode — nothing saved",
  "Cryptographic proof of search results",
  "Priority support and early access",
  "Advanced metadata filtering",
];

function PricingHero({ variant, title, subtitle, color, children }: any) {
  return (
    <div className="relative pt-32 pb-16 px-6 text-center overflow-hidden">
      {/* Background visual flair based on variant */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full"
          style={{ background: `radial-gradient(circle_at_center, ${color}22 0%, transparent 70%)` }} 
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-4xl mx-auto"
      >
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-xs font-mono uppercase tracking-[0.2em] border`} style={{ color: color, borderColor: `${color}44`, backgroundColor: `${color}11` }}>
          <Zap size={14} className="animate-pulse" /> Allocation Matrix
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-white leading-[1.1]">
          {title} <span style={{ color: color }}>Pricing.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
          {subtitle}
        </p>
        
        {children}
      </motion.div>
    </div>
  );
}

// VARIANT 1: Command Center (Amber Cyber)
function PricingV1() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const color = "#F6B94C";

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-[#E2E8F0] font-mono">
      <PricingHero 
        variant="1"
        title="Command"
        subtitle="Operational capacity for elite engineering teams. Secure your perimeter with hardware-grade local search."
        color={color}
      >
        <div className="inline-flex bg-black/40 p-1 border border-[#F6B94C]/30 shadow-[0_0_20px_rgba(246,185,76,0.1)]">
          <button 
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${billing === "monthly" ? "bg-[#F6B94C] text-[#0F172A]" : "text-[#F6B94C]/40 hover:text-[#F6B94C]/80"}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBilling("annual")}
            className={`px-6 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${billing === "annual" ? "bg-[#F6B94C] text-[#0F172A]" : "text-[#F6B94C]/40 hover:text-[#F6B94C]/80"}`}
          >
            Annual (Save 29%)
          </button>
        </div>
      </PricingHero>

      <div className="max-w-6xl mx-auto pb-32 px-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* Community */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-10 bg-[#0F172A]/80 border border-white/5 relative group overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Unlock size={80} />
          </div>
          <div className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase mb-4">COMMUNITY_ALLOCATION</div>
          <div className="flex items-baseline gap-2 mb-8">
            <div className="text-5xl font-bold">$0</div>
            <div className="text-xs text-white/30 uppercase tracking-widest font-normal">/ forever</div>
          </div>
          <ul className="space-y-4 mb-12 text-xs text-white/50">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3">
                <span className="text-[#F6B94C]/30">▸</span> {f}
              </li>
            ))}
          </ul>
          <Link href="/1/download" className="block w-full py-4 bg-white/5 border border-white/10 text-center text-[10px] font-bold tracking-[0.3em] uppercase hover:bg-white/10 transition-all">
            Initialize Free
          </Link>
        </motion.div>

        {/* Pro */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-10 bg-[#0F172A]/90 border border-[#F6B94C]/40 shadow-[0_0_50px_rgba(246,185,76,0.05)] relative group overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 text-[#F6B94C]">
            <Lock size={80} />
          </div>
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F6B94C] shadow-[0_0_15px_rgba(246,185,76,0.5)]" />
          
          <div className="text-[10px] font-bold tracking-[0.3em] text-[#F6B94C] uppercase mb-4">PRO_PROTOCOL_ACTIVE</div>
          <div className="flex items-baseline gap-2 mb-8">
            <AnimatePresence mode="wait">
              <motion.div 
                key={billing}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-5xl font-bold text-white drop-shadow-[0_0_10px_rgba(246,185,76,0.3)]"
              >
                ${billing === "monthly" ? "6.99" : "4.99"}
              </motion.div>
            </AnimatePresence>
            <span className="text-xs text-white/30 uppercase tracking-widest font-normal">/ mo</span>
          </div>
          
          <ul className="space-y-4 mb-12 text-xs">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3">
                <span className="text-[#F6B94C] animate-pulse">■</span> {f}
              </li>
            ))}
          </ul>
          <div className="w-full relative z-10 [&>button]:w-full [&>button]:py-4 [&>button]:bg-[#F6B94C] [&>button]:text-[#0F172A] [&>button]:font-bold [&>button]:text-[10px] [&>button]:uppercase [&>button]:tracking-[0.3em] [&>button]:hover:bg-[#FCD34D] [&>button]:transition-all [&>button]:shadow-[0_0_20px_rgba(246,185,76,0.4)] [&>a]:w-full [&>a]:py-4 [&>a]:bg-[#F6B94C] [&>a]:text-[#0F172A] [&>a]:font-bold [&>a]:text-[10px] [&>a]:uppercase [&>a]:tracking-[0.3em] [&>a]:hover:bg-[#FCD34D] [&>a]:transition-all [&>a]:shadow-[0_0_20px_rgba(246,185,76,0.4)] [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center">
            <ProUpgradeAction variantPrefix="/1" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// VARIANT 2: Signal Architecture (Blue/Cyan - Dull fix)
function PricingV2() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const color = "#38BDF8";

  return (
    <div className="min-h-screen bg-[#080C14] text-[#F1F5F9] font-sans">
      <PricingHero 
        variant="2"
        title="Signal"
        subtitle="Select the vector compute capability that matches your workload velocity. Transparent pricing, local execution."
        color={color}
      >
        <div className="inline-flex bg-[#0F172A]/80 p-1.5 rounded-2xl border border-[#334155]/60 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
          <button 
            onClick={() => setBilling("monthly")}
            className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${billing === "monthly" ? "bg-[#38BDF8] text-[#080C14] shadow-[0_0_15px_rgba(56,189,248,0.4)]" : "text-[#94A3B8] hover:text-white"}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBilling("annual")}
            className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${billing === "annual" ? "bg-[#38BDF8] text-[#080C14] shadow-[0_0_15px_rgba(56,189,248,0.4)]" : "text-[#94A3B8] hover:text-white"}`}
          >
            Annual
          </button>
        </div>
      </PricingHero>

      <div className="max-w-6xl mx-auto pb-32 px-6 grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Community */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="p-12 bg-[#0F172A]/40 border border-[#334155]/60 rounded-[2.5rem] backdrop-blur-2xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#38BDF8]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform">
              <Cpu size={24} className="text-[#94A3B8]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Standard Node</h3>
            <p className="text-[#94A3B8] text-sm mb-8 leading-relaxed">Fundamental indexing for independent developers and local experimentation.</p>
            <div className="flex items-baseline gap-2 mb-10">
              <span className="text-5xl font-extrabold text-white">$0</span>
              <span className="text-[#94A3B8] font-medium">/ mo</span>
            </div>
            <ul className="space-y-5 mb-12">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-4 text-sm text-[#CBD5E1]">
                  <Check size={18} className="text-[#38BDF8] shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/2/download" className="block w-full py-4 rounded-2xl border border-[#334155] text-center font-bold text-sm hover:bg-white/5 transition-all">
              Initialize Node
            </Link>
          </div>
        </motion.div>

        {/* Pro */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="p-12 bg-[#0F172A]/60 border-2 border-[#38BDF8]/40 rounded-[2.5rem] backdrop-blur-2xl relative overflow-hidden group shadow-[0_20px_50px_rgba(56,189,248,0.1)]"
        >
          <div className="absolute top-0 right-0 px-6 py-2 bg-[#38BDF8] text-[#080C14] font-bold text-[10px] uppercase tracking-[0.2em] rounded-bl-2xl shadow-lg">ACTIVE_COMPUTE</div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#38BDF8]/10 via-transparent to-transparent opacity-50" />
          
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#38BDF8]/10 flex items-center justify-center mb-8 border border-[#38BDF8]/30 group-hover:scale-110 transition-transform">
              <Layers size={24} className="text-[#38BDF8]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Pro Node</h3>
            <p className="text-[#94A3B8] text-sm mb-8 leading-relaxed">High-velocity semantic fusion for production-grade architectural search.</p>
            <div className="flex items-baseline gap-2 mb-10">
              <AnimatePresence mode="wait">
                <motion.span 
                  key={billing}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-5xl font-extrabold text-white"
                >
                  ${billing === "monthly" ? "6.99" : "4.99"}
                </motion.span>
              </AnimatePresence>
              <span className="text-[#94A3B8] font-medium">/ mo</span>
            </div>
            <ul className="space-y-5 mb-12">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-4 text-sm text-[#CBD5E1]">
                  <Check size={18} className="text-[#38BDF8] shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className="w-full relative z-10 [&>button]:w-full [&>button]:py-4 [&>button]:bg-[#38BDF8] [&>button]:text-[#080C14] [&>button]:font-bold [&>button]:text-sm [&>button]:rounded-2xl [&>button]:hover:bg-[#7DD3FC] [&>button]:transition-all [&>button]:shadow-[0_0_20px_rgba(56,189,248,0.3)] [&>a]:w-full [&>a]:py-4 [&>a]:bg-[#38BDF8] [&>a]:text-[#080C14] [&>a]:font-bold [&>a]:text-sm [&>a]:rounded-2xl [&>a]:hover:bg-[#7DD3FC] [&>a]:transition-all [&>a]:shadow-[0_0_20px_rgba(56,189,248,0.3)] [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center">
              <ProUpgradeAction variantPrefix="/2" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// VARIANT 3: Tactical HUD (Amber Pulse)
function PricingV3() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const color = "#F59E0B";

  return (
    <div className="min-h-screen bg-[#0A0D0F] text-[#F3F5F7] font-mono">
      <PricingHero 
        variant="3"
        title="Protocol"
        subtitle="Initialize high-precision search layers. Local vectors, deterministic results, zero external dependencies."
        color={color}
      >
        <div className="inline-flex bg-[#0D1117] border border-amber-400/20 p-1">
          {["monthly", "annual"].map(b => (
            <button 
              key={b}
              onClick={() => setBilling(b as any)}
              className={`px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${billing === b ? "bg-amber-400 text-[#0A0D0F]" : "text-amber-400/40 hover:text-amber-400/80"}`}
            >
              {b === "monthly" ? "MONTHLY" : "ANNUAL_SAVE_29%"}
            </button>
          ))}
        </div>
      </PricingHero>

      <div className="max-w-6xl mx-auto pb-32 px-6 grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Community */}
        <div className="p-12 bg-[#0D1117] border border-amber-400/10 relative group">
          <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-amber-400/20" />
          <div className="text-[9px] font-bold tracking-[0.4em] text-amber-400/30 uppercase mb-6"># PHASE_COMMUNITY</div>
          <div className="flex items-baseline gap-2 mb-10">
            <span className="text-6xl font-black text-white">$0</span>
            <span className="text-xs text-amber-400/20 uppercase tracking-widest font-bold">/ PERPETUAL</span>
          </div>
          <ul className="space-y-4 mb-16 opacity-40 group-hover:opacity-100 transition-opacity">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-xs uppercase tracking-widest">
                <span className="w-1 h-1 bg-amber-400 rounded-full" /> {f}
              </li>
            ))}
          </ul>
          <Link href="/download" className="block w-full py-4 border border-amber-400/20 text-center text-[10px] font-bold tracking-[0.3em] uppercase hover:bg-amber-400/5 transition-all">
            [ INITIALIZE_FREE ]
          </Link>
        </div>

        {/* Pro */}
        <div className="p-12 bg-[#0D1117] border border-amber-400/40 relative shadow-[0_0_60px_rgba(245,158,11,0.05)]">
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-amber-400" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-amber-400" />
          <div className="absolute top-4 right-6 text-[9px] font-bold tracking-[0.4em] text-amber-400 animate-pulse"># PHASE_PRO_LOCKED</div>
          
          <div className="text-[9px] font-bold tracking-[0.4em] text-amber-400/30 uppercase mb-6"># TARGET_SELECTION_ACTIVE</div>
          <div className="flex items-baseline gap-2 mb-10">
            <AnimatePresence mode="wait">
              <motion.span 
                key={billing}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-6xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              >
                ${billing === "monthly" ? "6.99" : "4.99"}
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-amber-400/40 uppercase tracking-widest font-bold">/ MONTHLY</span>
          </div>
          <ul className="space-y-4 mb-16">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/80">
                <span className="w-1.5 h-1.5 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,1)]" /> {f}
              </li>
            ))}
          </ul>
          <div className="w-full relative z-10 [&>button]:w-full [&>button]:py-4 [&>button]:bg-amber-400 [&>button]:text-[#0A0D0F] [&>button]:font-bold [&>button]:text-[10px] [&>button]:uppercase [&>button]:tracking-[0.4em] [&>button]:hover:bg-amber-300 [&>button]:transition-all [&>button]:shadow-[0_0_30px_rgba(245,158,11,0.4)] [&>a]:w-full [&>a]:py-4 [&>a]:bg-amber-400 [&>a]:text-[#0A0D0F] [&>a]:font-bold [&>a]:text-[10px] [&>a]:uppercase [&>a]:tracking-[0.4em] [&>a]:hover:bg-amber-300 [&>a]:transition-all [&>a]:shadow-[0_0_30px_rgba(245,158,11,0.4)] [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center">
            <ProUpgradeAction variantPrefix="/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

// VARIANT 4: Spatial Immersion (Light/Clean - Layout fix)
function PricingV4() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const color = "#2563EB"; // Blue to match the light theme branding

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      {/* Soft pastel gradient mesh background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-50/50 blur-[120px]" />
        <div className="absolute bottom-[0%] right-[10%] w-[50%] h-[50%] rounded-full bg-cyan-50/50 blur-[150px]" />
      </div>

      <PricingHero 
        variant="4"
        title="Spatial"
        subtitle="Modern licensing for modern developers. Clean, simple, and entirely local. No cloud baggage included."
        color={color}
      >
        <div className="inline-flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
          <button 
            onClick={() => setBilling("monthly")}
            className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${billing === "monthly" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBilling("annual")}
            className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${billing === "annual" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          >
            Annual
          </button>
        </div>
      </PricingHero>

      <div className="max-w-6xl mx-auto pb-32 px-6 grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
        {/* Community */}
        <div className="p-12 bg-white/50 border border-gray-200 rounded-[3rem] shadow-xl shadow-gray-200/50 backdrop-blur-xl group hover:border-gray-300 transition-all">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <Globe size={20} className="text-gray-400" />
            </div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-400">Basic Access</span>
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Free</h3>
          <p className="text-gray-500 mb-10 font-medium">Fundamental tools for local code indexing and navigation.</p>
          <div className="flex items-baseline gap-2 mb-10">
            <span className="text-6xl font-black text-gray-900">$0</span>
          </div>
          <ul className="space-y-5 mb-12">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-4 text-sm font-semibold text-gray-600">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                  <Check size={12} className="text-blue-600" />
                </div>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/4/download" className="block w-full py-4 rounded-2xl bg-gray-900 text-white text-center font-bold text-sm hover:bg-gray-800 transition-all">
            Get Started
          </Link>
        </div>

        {/* Pro */}
        <div className="p-12 bg-white border border-gray-200 rounded-[3rem] shadow-2xl shadow-blue-500/10 relative overflow-hidden group hover:border-blue-200 transition-all scale-105">
          <div className="absolute top-0 inset-x-0 h-2 bg-blue-600" />
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <Zap size={20} className="text-blue-600" />
            </div>
            <span className="font-bold text-xs uppercase tracking-widest text-blue-600">Pro Allocation</span>
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Pro Plan</h3>
          <p className="text-gray-500 mb-10 font-medium">Advanced semantic fusion and cryptographic architectural locking.</p>
          <div className="flex items-baseline gap-2 mb-10">
            <AnimatePresence mode="wait">
              <motion.span 
                key={billing}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl font-black text-gray-900"
              >
                ${billing === "monthly" ? "6.99" : "4.99"}
              </motion.span>
            </AnimatePresence>
            <span className="text-gray-400 font-bold">/ month</span>
          </div>
          <ul className="space-y-5 mb-12">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-4 text-sm font-semibold text-gray-600">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
                  <Check size={12} className="text-white" />
                </div>
                {f}
              </li>
            ))}
          </ul>
          <div className="w-full relative z-10 [&>button]:w-full [&>button]:py-4 [&>button]:bg-blue-600 [&>button]:text-white [&>button]:font-bold [&>button]:text-sm [&>button]:rounded-2xl [&>button]:hover:bg-blue-700 [&>button]:transition-all [&>button]:shadow-xl [&>button]:shadow-blue-500/30 [&>a]:w-full [&>a]:py-4 [&>a]:bg-blue-600 [&>a]:text-white [&>a]:font-bold [&>a]:text-sm [&>a]:rounded-2xl [&>a]:hover:bg-blue-700 [&>a]:transition-all [&>a]:shadow-xl [&>a]:shadow-blue-500/30 [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center">
            <ProUpgradeAction variantPrefix="/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// VARIANT 5: Director's Cut (Cinematic Cyan)
function PricingV5() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const color = "#22D3EE";

  return (
    <div className="min-h-screen bg-[#0C0E10] text-white font-mono selection:bg-cyan-500/20">
      <PricingHero 
        variant="5"
        title="Cinematic"
        subtitle="Experience the full fidelity of local code intelligence. High-contrast reasoning for demanding projects."
        color={color}
      >
        <div className="inline-flex bg-cyan-500/10 border border-cyan-500/30 p-1.5 rounded-2xl backdrop-blur-xl">
          <button 
            onClick={() => setBilling("monthly")}
            className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${billing === "monthly" ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.5)]" : "text-cyan-500/50 hover:text-cyan-500"}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBilling("annual")}
            className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${billing === "annual" ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.5)]" : "text-cyan-500/50 hover:text-cyan-500"}`}
          >
            Annual
          </button>
        </div>
      </PricingHero>

      <div className="max-w-6xl mx-auto pb-32 px-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* Community */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="p-10 bg-[#0E1114] border border-cyan-500/20 rounded-[2rem] relative overflow-hidden group shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] to-transparent" />
          <div className="text-[10px] font-black tracking-[0.4em] text-cyan-500/30 uppercase mb-8 flex items-center gap-3">
            <span className="w-2 h-2 bg-cyan-500/20 rounded-full" /> ENTRY_SPEC
          </div>
          <div className="flex items-baseline gap-2 mb-10">
            <span className="text-7xl font-black text-white">$0</span>
            <span className="text-xs text-cyan-500/20 font-black tracking-widest uppercase">/ perpetual</span>
          </div>
          <ul className="space-y-4 mb-14 text-white/40 group-hover:text-white/60 transition-colors">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                <ChevronRight size={14} className="text-cyan-500/40" /> {f}
              </li>
            ))}
          </ul>
          <Link href="/5/download" className="block w-full py-4 border border-cyan-500/20 rounded-xl text-center text-[10px] font-black tracking-[0.3em] uppercase hover:bg-cyan-500/10 transition-all">
            Initialize Free
          </Link>
        </motion.div>

        {/* Pro */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="p-10 bg-[#0E1114]/90 border border-cyan-500/50 rounded-[2.5rem] relative overflow-hidden shadow-[0_0_80px_rgba(34,211,238,0.15)] group"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-cyan-500 shadow-[0_0_25px_rgba(34,211,238,0.6)]" />
          <div className="absolute top-8 right-10 bg-cyan-500/20 border border-cyan-500/40 px-4 py-1.5 rounded-full text-[9px] font-black text-cyan-400 tracking-widest uppercase animate-pulse">
            HIGH_SIGNAL_ALLOCATION
          </div>
          
          <div className="text-[10px] font-black tracking-[0.4em] text-cyan-400 uppercase mb-8 flex items-center gap-3">
            <span className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_#22D3EE]" /> PRO_SPEC_ACTIVE
          </div>
          <div className="flex items-baseline gap-2 mb-10">
            <AnimatePresence mode="wait">
              <motion.span 
                key={billing}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              >
                ${billing === "monthly" ? "6.99" : "4.99"}
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-cyan-500/40 font-black tracking-widest uppercase">/ monthly</span>
          </div>
          <ul className="space-y-4 mb-14">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-cyan-300">
                <ChevronRight size={14} className="text-cyan-500" /> {f}
              </li>
            ))}
          </ul>
          <div className="w-full relative z-10 [&>button]:w-full [&>button]:py-5 [&>button]:bg-cyan-500 [&>button]:text-black [&>button]:font-black [&>button]:text-[11px] [&>button]:uppercase [&>button]:tracking-[0.4em] [&>button]:rounded-2xl [&>button]:hover:bg-cyan-400 [&>button]:transition-all [&>button]:shadow-[0_0_40px_rgba(34,211,238,0.5)] [&>a]:w-full [&>a]:py-5 [&>a]:bg-cyan-500 [&>a]:text-black [&>a]:font-black [&>a]:text-[11px] [&>a]:uppercase [&>a]:tracking-[0.4em] [&>a]:rounded-2xl [&>a]:hover:bg-cyan-400 [&>a]:transition-all [&>a]:shadow-[0_0_40px_rgba(34,211,238,0.5)] [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center">
            <ProUpgradeAction variantPrefix="/5" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Comparison table (shared with main page)
// ─────────────────────────────────────────────────────
type CellValue = 'yes' | 'no' | 'partial' | 'pro';
interface CompFeature { feature: string; ixos: CellValue; grep: CellValue; spotlight: CellValue; vscode: CellValue; note: string; }
const COMP_FEATURES: CompFeature[] = [
  { feature: 'Full-text keyword search', ixos: 'yes', grep: 'yes', spotlight: 'yes', vscode: 'yes', note: 'Industry baseline — all tools handle this.' },
  { feature: 'Semantic understanding', ixos: 'yes', grep: 'no', spotlight: 'partial', vscode: 'no', note: 'Meaning-based matching, not just string proximity.' },
  { feature: 'Local-first / no egress', ixos: 'yes', grep: 'yes', spotlight: 'partial', vscode: 'partial', note: 'Spotlight may sync via iCloud; VS Code extensions vary.' },
  { feature: 'Progressive results', ixos: 'yes', grep: 'no', spotlight: 'no', vscode: 'no', note: 'Results stream as confidence increases.' },
  { feature: 'No background daemon', ixos: 'yes', grep: 'yes', spotlight: 'no', vscode: 'partial', note: 'Spotlight indexes continuously.' },
  { feature: 'Hybrid retrieval', ixos: 'yes', grep: 'no', spotlight: 'no', vscode: 'no', note: 'Lexical + semantic in a single pass.' },
  { feature: 'Cryptographic cache signing', ixos: 'yes', grep: 'no', spotlight: 'no', vscode: 'no', note: 'HMAC-SHA256 on every cached embedding.' },
  { feature: 'Cross-platform', ixos: 'yes', grep: 'yes', spotlight: 'no', vscode: 'yes', note: 'Windows, macOS, Linux. Spotlight is macOS-only.' },
  { feature: 'Natural language queries', ixos: 'pro', grep: 'no', spotlight: 'no', vscode: 'no', note: 'Pro tier only.' },
];
const COMP_TOOLS = ['Ixos', 'grep/rg', 'Spotlight', 'VS Code'];
function CompSymbolInline({ value, isIxos }: { value: CellValue; isIxos: boolean }) {
  if (value === 'yes') return <span style={{ fontSize: 14, color: isIxos ? '#F6B94C' : 'rgba(255,255,255,0.35)', fontWeight: isIxos ? 700 : 400 }}>■</span>;
  if (value === 'no') return <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.15)' }}>—</span>;
  if (value === 'partial') return <span style={{ fontSize: 14, color: 'rgba(245,158,11,0.6)' }}>◐</span>;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#F6B94C', fontFamily: 'monospace' }}><span style={{ fontSize: 13 }}>◆</span><span style={{ fontSize: 8 }}>PRO</span></span>;
}
function ComparisonTableInline() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div style={{ background: 'rgb(16,20,26)', border: '1px solid rgba(246,185,76,0.15)', borderTop: '2px solid rgba(246,185,76,0.25)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(246,185,76,0.02)', gap: 8 }}>
        <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)' }}>Capability</div>
        {COMP_TOOLS.map((tool, i) => (
          <div key={tool} className="font-mono" style={{ fontSize: 10, textAlign: 'center', color: i === 0 ? 'rgba(246,185,76,0.85)' : 'rgba(255,255,255,0.3)', fontWeight: i === 0 ? 600 : 400, background: i === 0 ? 'rgba(246,185,76,0.06)' : 'transparent', padding: '2px 4px', borderRadius: 3 }}>{tool}</div>
        ))}
      </div>
      <div style={{ padding: '8px 0' }}>
        {COMP_FEATURES.map((feat, i) => (
          <div key={feat.feature} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ borderRadius: 4, background: hovered === i ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.2s', cursor: 'default' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'center', padding: '11px 12px', gap: 8 }}>
              <div className="font-mono" style={{ fontSize: 12, color: 'rgba(243,245,247,0.65)' }}>{feat.feature}</div>
              {(['ixos', 'grep', 'spotlight', 'vscode'] as const).map(k => (
                <div key={k} style={{ textAlign: 'center', background: k === 'ixos' ? 'rgba(246,185,76,0.04)' : 'transparent', borderRadius: 3, padding: '2px 4px' }}>
                  <CompSymbolInline value={feat[k]} isIxos={k === 'ixos'} />
                </div>
              ))}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '0 12px 10px', lineHeight: 1.5, borderLeft: `2px solid rgba(246,185,76,${hovered === i ? 0.2 : 0})`, marginLeft: 12, marginRight: 12, marginBottom: 4, opacity: hovered === i ? 1 : 0, maxHeight: hovered === i ? 60 : 0, overflow: 'hidden', transition: 'opacity 0.2s, max-height 0.2s, border-color 0.2s' }}>{feat.note}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: '12px', borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
        {[{ symbol: '■', label: 'Supported', color: 'rgba(246,185,76,0.7)' }, { symbol: '◐', label: 'Partial', color: 'rgba(245,158,11,0.6)' }, { symbol: '—', label: 'Not supported', color: 'rgba(255,255,255,0.2)' }, { symbol: '◆', label: 'Pro tier', color: '#F6B94C' }].map(item => (
          <div key={item.label} className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            <span style={{ color: item.color, fontSize: 12 }}>{item.symbol}</span>{item.label}
          </div>
        ))}
        <div className="font-mono" style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>From public documentation. Accurate as of 2026.</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// MAIN: matches the main page's pricing aesthetic
// ─────────────────────────────────────────────────────
function PricingMain() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const monthlyPrice = 6.99;
  const annualPrice = 4.99;
  const savePct = Math.round((1 - annualPrice / monthlyPrice) * 100);
  const currentPrice = billing === 'monthly' ? monthlyPrice : annualPrice;

  return (
    <div className="min-h-screen bg-[#0A0D0F] text-[#F3F5F7] font-mono">
      {/* Header */}
      <div className="relative pt-32 pb-16 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(246,185,76,0.04) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="text-xs tracking-[0.3em] uppercase text-amber-400/50 mb-5 font-mono">▸ Licensing</div>
          <h1 className="text-5xl md:text-6xl font-bold mb-5 text-white" style={{ letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Simple <span style={{ color: '#F6B94C' }}>pricing.</span>
          </h1>
          <p className="text-white/45 font-mono text-sm max-w-md mx-auto leading-relaxed mb-10">
            Start free. Upgrade when your workstreams demand it.
          </p>

          {/* Toggle */}
          <div className="inline-flex bg-black/30 border border-amber-400/20 p-1">
            {(['monthly', 'annual'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`relative px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${billing === b ? 'bg-amber-400 text-[#0A0D0F]' : 'text-amber-400/40 hover:text-amber-400/70'}`}
              >
                {b === 'monthly' ? 'Monthly' : `Annual`}
                {b === 'annual' && (
                  <span className={`ml-2 text-[8px] transition-colors ${billing === 'annual' ? 'text-[#0A0D0F]/70' : 'text-amber-400/35'}`}>
                    Save {savePct}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-4xl mx-auto pb-20 px-6 relative z-10">
        <div className="w-full border border-amber-400/8 bg-amber-400/[0.01] p-8 md:p-12 relative">
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-amber-400/12" />
          <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-amber-400/12" />
          <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-amber-400/12" />
          <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-amber-400/12" />

          {/* Community */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-10">
            <div>
              <div className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase mb-1">[FREE_TIER]</div>
              <h3 className="text-xl font-bold text-white/70 mb-1">Community</h3>
              <div className="text-4xl font-bold font-mono">
                $0
                <span className="text-base font-normal text-white/25 ml-1">/ forever</span>
              </div>
            </div>
            <ul className="space-y-2 text-sm font-mono text-white/40">
              {FREE_FEATURES.map(feat => (
                <li key={feat} className="flex items-center gap-2">
                  <span className="text-amber-400/30">▸</span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro card */}
          <div className="border border-amber-400/25 bg-amber-400/[0.03] p-8 md:p-10 relative overflow-hidden">
            <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400/40" />
            <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400/40" />
            <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400/40" />
            <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400/40" />
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none" style={{ background: 'rgba(246,185,76,0.04)', filter: 'blur(80px)' }} />

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-8">
                <div>
                  <div className="text-[10px] font-mono tracking-[0.3em] text-amber-400/50 uppercase mb-1">[PRO_TIER]</div>
                  <h3 className="text-xl font-bold font-mono text-amber-400 mb-1">Pro</h3>
                  <div className="flex items-baseline gap-2">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={billing}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="text-4xl font-bold font-mono text-white"
                      >
                        ${currentPrice.toFixed(2)}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-base font-normal text-white/25">/ month</span>
                    {billing === 'annual' && (
                      <span className="text-xs font-mono text-amber-400/60 border border-amber-400/20 px-1.5 py-0.5">
                        save {savePct}%
                      </span>
                    )}
                  </div>
                </div>
                <ul className="space-y-2 text-sm font-mono text-white/50">
                  {PRO_FEATURES.map(feat => (
                    <li key={feat} className="flex items-center gap-2">
                      <span className="text-amber-400">▸</span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <ProUpgradeAction variantPrefix="" />
              </div>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <div className="text-xs tracking-[0.3em] uppercase text-amber-400/50 mb-3 font-mono">▸ Feature Matrix</div>
            <h2 className="text-3xl font-bold font-mono text-white" style={{ letterSpacing: '-0.02em' }}>
              Desktop search. Plainly compared.
            </h2>
            <p className="mt-3 text-white/40 font-mono text-sm">
              Capability matrix grounded in shipped behavior and CLI flags.
            </p>
          </div>
          <ComparisonTableInline />
        </div>
      </div>
    </div>
  );
}

export function PricingContent({ variant = "main" }: { variant?: string }) {
  switch (variant) {
    case "main": return <PricingMain />;
    case "1": return <PricingV1 />;
    case "2": return <PricingV2 />;
    case "3": return <PricingV3 />;
    case "4": return <PricingV4 />;
    case "5": return <PricingV5 />;
    default: return <PricingMain />;
  }
}
