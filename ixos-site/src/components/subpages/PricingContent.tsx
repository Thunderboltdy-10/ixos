"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Terminal, Shield, Zap, Box, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { ProUpgradeAction } from "@/components/sections/ProUpgradeAction";

const FREE_FEATURES = [
  "Local vector search (Flash v2)",
  "3 active workstreams",
  "Basic CLI & HMAC-signed cache",
  "Cross-platform (Windows ADS + Unix xattr)"
];

const PRO_FEATURES = [
  "Flash v2 + Pro v2 fusion model (MRR 0.921)",
  "Unlimited workstreams",
  "Journalist mode (ephemeral, no-persist)",
  "Secure timing mode (100ms floor)",
  "Priority support",
  "Desktop app access"
];

// VARIANT 1: Command Center
function PricingV1() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <div className="max-w-5xl mx-auto py-24 px-6 text-[#E2E8F0] font-mono pt-32 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#F6B94C]/5 blur-[100px] pointer-events-none rounded-full" />
      
      <div className="mb-16 border-b border-[#F6B94C]/20 pb-6 relative z-10 text-center md:text-left">
        <h1 className="text-3xl font-bold mb-4 uppercase tracking-widest text-[#F6B94C] flex items-center justify-center md:justify-start gap-3">
          <Terminal className="w-8 h-8" /> SYSTEM_ACCESS_LEVELS
        </h1>
        <p className="text-[#94A3B8] max-w-xl mx-auto md:mx-0">Deploy Ixos locally. Escalate privileges for Pro embeddings and untraceable Journalist Mode.</p>
      </div>

      <div className="flex justify-center mb-12 relative z-10">
        <div className="inline-flex items-center p-1 bg-[#0F172A] border border-[#334155]">
          <button 
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${billing === "monthly" ? "bg-[#F6B94C] text-[#0F172A]" : "text-[#94A3B8] hover:text-white"}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBilling("annual")}
            className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${billing === "annual" ? "bg-[#F6B94C] text-[#0F172A]" : "text-[#94A3B8] hover:text-white"}`}
          >
            Annual <span className={billing === "annual" ? "text-[#0F172A]/70" : "text-[#F6B94C]"}>(-20%)</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 relative z-10">
        <motion.div 
          whileHover={{ y: -5 }}
          className="flex-1 p-8 border border-[#334155] bg-[#0F172A]/90 backdrop-blur-md flex flex-col relative"
        >
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#94A3B8]" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#94A3B8]" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#94A3B8]" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#94A3B8]" />
          
          <h3 className="text-xl font-bold mb-2 uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
            <Unlock className="w-5 h-5" /> Base Protocol
          </h3>
          <div className="text-4xl font-bold mb-8 text-[#E2E8F0]">$0<span className="text-sm text-[#64748B] font-normal ml-2 uppercase">/mo</span></div>
          <ul className="space-y-4 mb-10 text-sm flex-1">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3 text-[#94A3B8]">
                <span className="text-[#F6B94C] mt-0.5">■</span> {f}
              </li>
            ))}
          </ul>
          <Link href="/1/download" className="block text-center w-full py-4 bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:bg-[#334155] hover:text-[#E2E8F0] uppercase tracking-widest text-xs font-bold transition-all shadow-[0_0_0_0_rgba(246,185,76,0)] hover:shadow-[0_0_15px_rgba(246,185,76,0.15)]">
            Download Client
          </Link>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="flex-1 p-8 border border-[#F6B94C] bg-[#1E293B]/90 backdrop-blur-md flex flex-col relative shadow-[0_0_30px_rgba(246,185,76,0.1)]"
        >
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#F6B94C]" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#F6B94C]" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#F6B94C]" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#F6B94C]" />
          
          <div className="absolute top-0 right-8 bg-[#F6B94C] text-[#0F172A] text-[10px] font-bold px-3 py-1 uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-3 h-3" /> Recommended
          </div>

          <h3 className="text-xl font-bold mb-2 uppercase tracking-wider text-[#F6B94C] flex items-center gap-2">
            <Lock className="w-5 h-5" /> Pro Escalation
          </h3>
          <div className="flex items-end gap-2 mb-8 h-10">
            <AnimatePresence mode="wait">
              <motion.div 
                key={billing}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-4xl font-bold text-[#E2E8F0]"
              >
                ${billing === "monthly" ? "12" : "10"}
              </motion.div>
            </AnimatePresence>
            <span className="text-sm text-[#64748B] font-normal mb-1 uppercase">/mo</span>
          </div>
          
          <ul className="space-y-4 mb-10 text-sm flex-1">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3 text-[#CBD5E1]">
                <span className="text-[#F6B94C] mt-0.5">■</span> {f}
              </li>
            ))}
          </ul>
          <div className="w-full [&>button]:w-full [&>button]:py-4 [&>button]:bg-[#F6B94C] [&>button]:text-[#0F172A] [&>button]:font-bold [&>button]:text-xs [&>button]:uppercase [&>button]:tracking-widest [&>button]:hover:bg-[#FCD34D] [&>button]:transition-all [&>button]:shadow-[0_0_15px_rgba(246,185,76,0.3)] [&>a]:w-full [&>a]:py-4 [&>a]:bg-[#F6B94C] [&>a]:text-[#0F172A] [&>a]:font-bold [&>a]:text-xs [&>a]:uppercase [&>a]:tracking-widest [&>a]:hover:bg-[#FCD34D] [&>a]:transition-all [&>a]:shadow-[0_0_15px_rgba(246,185,76,0.3)] [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center">
            <ProUpgradeAction variantPrefix="/1" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// VARIANT 2: Signal Architecture
function PricingV2() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <div className="max-w-5xl mx-auto py-24 px-6 text-[#F1F5F9] font-sans pt-32">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold tracking-tight mb-6 text-[#E2E8F0]">Compute Allocation</h1>
        <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto mb-10">Select the vector compute capability that matches your workload velocity. Transparent pricing, local execution.</p>
        
        <div className="inline-flex bg-[#0F172A] p-1.5 rounded-lg border border-[#334155]">
          <button 
            onClick={() => setBilling("monthly")}
            className={`px-8 py-2.5 rounded-md font-semibold text-sm transition-all ${billing === "monthly" ? "bg-[#38BDF8] text-[#0F172A] shadow-lg" : "text-[#94A3B8] hover:text-white"}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBilling("annual")}
            className={`px-8 py-2.5 rounded-md font-semibold text-sm transition-all flex items-center gap-2 ${billing === "annual" ? "bg-[#38BDF8] text-[#0F172A] shadow-lg" : "text-[#94A3B8] hover:text-white"}`}
          >
            Annual <span className={`text-xs ${billing === "annual" ? "text-[#0F172A]/70" : "text-[#38BDF8]"}`}>Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <motion.div 
          whileHover={{ y: -8 }}
          transition={{ duration: 0.3 }}
          className="p-10 bg-[#0F172A] rounded-2xl border border-[#334155] shadow-xl"
        >
          <h3 className="text-2xl font-bold mb-2 text-[#E2E8F0]">Community Node</h3>
          <div className="text-5xl font-extrabold mb-4 text-[#E2E8F0]">$0<span className="text-lg text-[#64748B] font-normal ml-2">/mo</span></div>
          <p className="text-[#94A3B8] mb-8 h-12">Core search engine for standard local repos.</p>
          <ul className="space-y-5 mb-10 text-[#CBD5E1]">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" /> <span>{f}</span></li>
            ))}
          </ul>
          <Link href="/2/download" className="block text-center w-full py-4 rounded-xl border-2 border-[#334155] text-[#E2E8F0] hover:border-[#38BDF8] hover:bg-[#38BDF8]/5 font-bold transition-all">Install Node</Link>
        </motion.div>

        <motion.div 
          whileHover={{ y: -8 }}
          transition={{ duration: 0.3 }}
          className="p-10 bg-[#0F172A] rounded-2xl border-2 border-[#38BDF8] shadow-[0_20px_50px_rgba(56,189,248,0.1)] relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#38BDF8] to-[#818CF8]" />
          <div className="absolute top-6 right-6 bg-[#38BDF8]/10 text-[#38BDF8] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-[#38BDF8]/30">Pro Compute</div>
          
          <h3 className="text-2xl font-bold mb-2 text-[#38BDF8]">Pro Compute</h3>
          <div className="flex items-baseline mb-4 h-[48px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={billing}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-5xl font-extrabold text-[#E2E8F0]"
              >
                ${billing === "monthly" ? "12" : "10"}
              </motion.div>
            </AnimatePresence>
            <span className="text-lg text-[#64748B] font-normal ml-2">/mo</span>
          </div>
          <p className="text-[#94A3B8] mb-8 h-12">JIT models and unlimited workflows for heavy environments.</p>
          
          <ul className="space-y-5 mb-10 text-[#F1F5F9]">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" /> <span>{f}</span></li>
            ))}
          </ul>
          
          <div className="w-full [&>button]:w-full [&>button]:py-4 [&>button]:rounded-xl [&>button]:bg-[#38BDF8] [&>button]:text-[#0F172A] [&>button]:font-bold [&>button]:text-lg [&>button]:hover:bg-[#7DD3FC] [&>button]:transition-colors [&>a]:w-full [&>a]:py-4 [&>a]:rounded-xl [&>a]:bg-[#38BDF8] [&>a]:text-[#0F172A] [&>a]:font-bold [&>a]:text-lg [&>a]:hover:bg-[#7DD3FC] [&>a]:transition-colors [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)] transition-shadow rounded-xl">
            <ProUpgradeAction variantPrefix="/2" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// VARIANT 3: Precision Grid
function PricingV3() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <div className="max-w-5xl mx-auto py-24 px-6 text-[#F3F5F7] font-mono pt-32">
      <div className="mb-16 border-l-2 border-[#14B8A6] pl-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-[#14B8A6]">LICENSING_MATRIX</h1>
          <p className="text-sm text-white/40 max-w-lg">Select operational tier for local vector resolution. Authorize nodes securely.</p>
        </div>
        <div className="flex gap-2 bg-black border border-white/10 p-1">
          <button 
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2 text-xs transition-colors ${billing === "monthly" ? "bg-[#14B8A6] text-black font-bold" : "text-white/50 hover:text-white"}`}
          >
            MONTHLY
          </button>
          <button 
            onClick={() => setBilling("annual")}
            className={`px-6 py-2 text-xs transition-colors flex gap-2 ${billing === "annual" ? "bg-[#14B8A6] text-black font-bold" : "text-white/50 hover:text-white"}`}
          >
            ANNUAL <span className={billing === "annual" ? "text-black/60" : "text-[#14B8A6]"}>[-20%]</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 relative">
        <div className="flex-1 p-8 border border-white/10 relative hover:border-white/30 transition-colors group">
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white/50 group-hover:border-[#14B8A6] transition-colors" />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-white/50 group-hover:border-[#14B8A6] transition-colors" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-white/50 group-hover:border-[#14B8A6] transition-colors" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white/50 group-hover:border-[#14B8A6] transition-colors" />
          
          <div className="text-xs text-white/30 mb-2 font-bold tracking-widest">{'>>'} [TIER 0]</div>
          <h3 className="text-2xl font-bold mb-6 text-white tracking-wider">COMMUNITY</h3>
          <div className="text-4xl mb-8">$0.00 <span className="text-xs text-white/40">USD/MO</span></div>
          
          <div className="space-y-4 text-sm text-white/60 mb-12 min-h-[220px]">
            {FREE_FEATURES.map(f => (
              <div key={f} className="flex gap-3">
                <span className="text-[#14B8A6]/50">+</span> {f}
              </div>
            ))}
          </div>
          
          <Link href="/3/download" className="block text-center py-4 border border-white/20 text-white hover:bg-white hover:text-black uppercase tracking-widest text-sm font-bold transition-colors">ACQUIRE_FREE</Link>
        </div>

        <div className="flex-1 p-8 border border-[#14B8A6] bg-[#14B8A6]/[0.03] relative shadow-[0_0_30px_rgba(20,184,166,0.05)]">
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#14B8A6]" />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-[#14B8A6]" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-[#14B8A6]" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#14B8A6]" />
          
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest flex items-center gap-2">
            <Zap className="w-3 h-3" /> OPTIMAL
          </div>
          
          <div className="text-xs text-[#14B8A6]/80 mb-2 font-bold tracking-widest">{'>>'} [TIER 1]</div>
          <h3 className="text-2xl font-bold mb-6 text-[#14B8A6] tracking-wider">PRO_LICENSE</h3>
          <div className="flex items-end gap-2 mb-8 h-10">
            <AnimatePresence mode="wait">
              <motion.div 
                key={billing}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-4xl text-white font-bold"
              >
                ${billing === "monthly" ? "12.00" : "10.00"}
              </motion.div>
            </AnimatePresence>
            <span className="text-xs text-[#14B8A6]/60 mb-1">USD/MO</span>
          </div>
          
          <div className="space-y-4 text-sm text-white/90 mb-12 min-h-[220px]">
            {PRO_FEATURES.map(f => (
              <div key={f} className="flex gap-3 items-start">
                <span className="text-[#14B8A6] font-bold">{'>'}</span> {f}
              </div>
            ))}
          </div>
          
          <div className="w-full [&>button]:w-full [&>button]:py-4 [&>button]:bg-[#14B8A6] [&>button]:text-[#0A0D0F] [&>button]:font-bold [&>button]:text-sm [&>button]:uppercase [&>button]:tracking-widest [&>button]:hover:bg-white [&>button]:transition-colors [&>a]:w-full [&>a]:py-4 [&>a]:bg-[#14B8A6] [&>a]:text-[#0A0D0F] [&>a]:font-bold [&>a]:text-sm [&>a]:uppercase [&>a]:tracking-widest [&>a]:hover:bg-white [&>a]:transition-colors [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center">
            <ProUpgradeAction variantPrefix="/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

// VARIANT 4: Spatial Immersion
function PricingV4() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <div className="max-w-6xl mx-auto py-32 px-8 text-white font-sans relative">
      <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#2DD4BF]/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="text-center mb-24 relative z-10">
        <h1 className="text-5xl md:text-6xl font-light tracking-tight mb-6">Pricing</h1>
        <p className="text-white/50 text-xl max-w-2xl mx-auto mb-12 font-light">Deploy the core engine locally for free. Upgrade to Pro for advanced workflow capabilities.</p>
        
        <div className="inline-flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
          <button 
            onClick={() => setBilling("monthly")}
            className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${billing === "monthly" ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBilling("annual")}
            className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${billing === "annual" ? "bg-[#2DD4BF] text-black shadow-lg shadow-[#2DD4BF]/20" : "text-white/60 hover:text-white"}`}
          >
            Annual <span className={billing === "annual" ? "text-black/60" : "text-[#2DD4BF]"}>20% off</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-center justify-center relative z-10">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-full max-w-md p-10 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Box className="w-6 h-6 text-white/70" />
            </div>
            <h3 className="text-2xl font-medium text-white/90">Community</h3>
          </div>
          <div className="text-5xl font-light mb-8">$0<span className="text-lg text-white/40 ml-2">/forever</span></div>
          
          <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent mb-8" />
          
          <ul className="space-y-6 text-white/70 mb-12 min-h-[240px]">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="leading-relaxed text-sm font-light">{f}</span>
              </li>
            ))}
          </ul>
          <Link href="/4/download" className="block text-center w-full py-4 rounded-xl border border-white/20 text-white hover:bg-white hover:text-black transition-colors text-base font-medium">Download Free</Link>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-full max-w-md p-10 rounded-3xl bg-gradient-to-b from-[#2DD4BF]/10 to-transparent border border-[#2DD4BF]/30 backdrop-blur-xl relative shadow-[0_0_60px_rgba(45,212,191,0.05)] lg:-translate-y-8"
        >
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-[#2DD4BF]/20 blur-[40px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#2DD4BF] flex items-center justify-center shadow-[0_0_20px_rgba(45,212,191,0.4)]">
              <Zap className="w-6 h-6 text-[#0C0E10]" />
            </div>
            <h3 className="text-2xl font-medium text-[#2DD4BF]">Pro</h3>
          </div>
          
          <div className="flex items-baseline mb-8 relative z-10 h-[48px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={billing}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-5xl font-light text-white"
              >
                ${billing === "monthly" ? "12" : "10"}
              </motion.div>
            </AnimatePresence>
            <span className="text-lg text-white/50 ml-2">/month</span>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-[#2DD4BF]/40 to-transparent mb-8 relative z-10" />

          <ul className="space-y-6 text-white/90 mb-12 min-h-[240px] relative z-10">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-[#2DD4BF]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />
                </div>
                <span className="leading-relaxed text-sm font-light">{f}</span>
              </li>
            ))}
          </ul>
          <div className="w-full relative z-10 [&>button]:w-full [&>button]:py-4 [&>button]:rounded-xl [&>button]:bg-[#2DD4BF] [&>button]:text-[#0C0E10] [&>button]:font-medium [&>button]:text-base [&>button]:hover:bg-[#5EEAD4] [&>button]:transition-colors [&>a]:w-full [&>a]:py-4 [&>a]:rounded-xl [&>a]:bg-[#2DD4BF] [&>a]:text-[#0C0E10] [&>a]:font-medium [&>a]:text-base [&>a]:hover:bg-[#5EEAD4] [&>a]:transition-colors [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center shadow-[0_10px_30px_rgba(45,212,191,0.2)]">
            <ProUpgradeAction variantPrefix="/4" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// VARIANT 5: Director's Cut
function PricingV5() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <div className="max-w-5xl mx-auto py-32 px-6 text-white font-mono relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-cyan-500/10 blur-[150px] pointer-events-none rounded-full" />
      
      <div className="mb-24 text-center relative z-10">
        <h1 className="text-5xl font-bold tracking-tighter mb-6 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">LICENSING_MATRIX</h1>
        <p className="text-cyan-500/60 text-lg max-w-2xl mx-auto mb-10 tracking-wide">Local vector search for everyone. Pro models for power users.</p>
        
        <div className="inline-flex gap-4 p-2 bg-[#0C0E10]/80 backdrop-blur-xl rounded-full border border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
          <button 
            onClick={() => setBilling("monthly")}
            className={`px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${billing === "monthly" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.6)]" : "text-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/10"}`}
          >
            MONTHLY
          </button>
          <button 
            onClick={() => setBilling("annual")}
            className={`px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${billing === "annual" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.6)]" : "text-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/10"}`}
          >
            ANNUAL [-20%]
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <motion.div 
          whileHover={{ y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-10 bg-[#0C0E10]/80 backdrop-blur-xl flex flex-col rounded-3xl border border-white/5 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          <h3 className="text-2xl font-bold mb-2 text-white/80 tracking-widest">COMMUNITY</h3>
          <div className="text-5xl font-bold mb-10 text-white">$0<span className="text-sm text-white/30 font-normal ml-2">/MO</span></div>
          
          <ul className="space-y-6 mb-12 text-white/60 text-sm flex-1">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-4">
                <span className="text-white/20 mt-1 text-[10px]">▶</span> {f}
              </li>
            ))}
          </ul>
          
          <Link 
            href="/5/download" 
            className="block text-center w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white hover:text-black transition-all text-xs font-bold uppercase tracking-widest"
          >
            DOWNLOAD
          </Link>
        </motion.div>

        <motion.div 
          whileHover={{ y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-10 bg-[#0C0E10]/90 backdrop-blur-xl flex flex-col relative rounded-3xl border border-cyan-500/40 shadow-[0_20px_60px_rgba(34,211,238,0.15)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.05] to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
          <div className="absolute top-6 right-6 bg-cyan-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            RECOMMENDED
          </div>

          <h3 className="text-2xl font-bold mb-2 text-cyan-400 tracking-widest">PRO</h3>
          <div className="flex items-baseline mb-10 h-10">
            <AnimatePresence mode="wait">
              <motion.div 
                key={billing}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-5xl font-bold text-white"
              >
                ${billing === "monthly" ? "12" : "10"}
              </motion.div>
            </AnimatePresence>
            <span className="text-sm text-cyan-500/40 font-normal ml-2">/MO</span>
          </div>
          
          <ul className="space-y-6 mb-12 text-white text-sm flex-1">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-4 group/li">
                <span className="text-cyan-400 mt-1 text-[10px] group-hover/li:translate-x-1 transition-transform shadow-[0_0_5px_rgba(34,211,238,0.8)]">▶</span> <span className="group-hover/li:text-cyan-200 transition-colors">{f}</span>
              </li>
            ))}
          </ul>
          
          <div className="w-full relative [&>button]:w-full [&>button]:py-4 [&>button]:rounded-xl [&>button]:bg-cyan-500 [&>button]:text-black [&>button]:font-bold [&>button]:text-xs [&>button]:uppercase [&>button]:tracking-widest [&>button]:hover:bg-cyan-400 [&>button]:transition-all [&>button]:shadow-[0_0_20px_rgba(34,211,238,0.4)] [&>a]:w-full [&>a]:py-4 [&>a]:rounded-xl [&>a]:bg-cyan-500 [&>a]:text-black [&>a]:font-bold [&>a]:text-xs [&>a]:uppercase [&>a]:tracking-widest [&>a]:hover:bg-cyan-400 [&>a]:transition-all [&>a]:shadow-[0_0_20px_rgba(34,211,238,0.4)] [&>a]:inline-flex [&>a]:items-center [&>a]:justify-center">
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
