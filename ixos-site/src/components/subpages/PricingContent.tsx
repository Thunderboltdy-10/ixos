"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Terminal, Shield, Zap, Box, Lock, Unlock, Cpu, Layers, Fingerprint, Globe, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProUpgradeAction } from "@/components/billing/ProUpgradeAction";

const FREE_FEATURES = [
  "Local vector search (Flash mode)",
  "VS Code extension integration",
  "Up to 3 active workstreams",
  "Standard HMAC-SHA256 signing",
  "Community support",
];

const PRO_FEATURES = [
  "JIT Pro models with deep reasoning",
  "Unlimited persistent workstreams",
  "Journalist mode (ephemeral cache)",
  "Ed25519 cryptographic attestation",
  "Priority architectural support",
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
            Annual (-20%)
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
                ${billing === "monthly" ? "12" : "10"}
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
                  ${billing === "monthly" ? "12" : "10"}
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
              {b === "monthly" ? "MONTHLY" : "ANNUAL_SAVE"}
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
          <Link href="/3/download" className="block w-full py-4 border border-amber-400/20 text-center text-[10px] font-bold tracking-[0.3em] uppercase hover:bg-amber-400/5 transition-all">
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
                ${billing === "monthly" ? "12" : "10"}
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
                ${billing === "monthly" ? "12" : "10"}
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
                ${billing === "monthly" ? "12" : "10"}
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

export function PricingContent({ variant = "5" }: { variant?: string }) {
  switch (variant) {
    case "1": return <PricingV1 />;
    case "2": return <PricingV2 />;
    case "3": return <PricingV3 />;
    case "4": return <PricingV4 />;
    case "5": return <PricingV5 />;
    default: return <PricingV5 />;
  }
}
