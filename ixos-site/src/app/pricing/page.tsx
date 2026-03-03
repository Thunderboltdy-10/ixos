"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Shield, Crown } from "lucide-react";
import Link from "next/link";
import { ProUpgradeAction } from "@/components/sections/ProUpgradeAction";

function PricingV1() {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans flex flex-col items-center py-24 px-8">
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />
      <div className="max-w-5xl w-full relative z-10 text-center mb-16">
        <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-full border border-teal-500/20 bg-teal-500/5">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-teal-500">Command Center / Pricing</span>
        </div>
        <h1 className="text-5xl font-bold mb-6">Simple, scalable pricing.</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group">
          <h3 className="text-2xl font-bold mb-2">Community</h3>
          <div className="text-4xl font-bold mb-6">$0<span className="text-xl text-white/40">/mo</span></div>
          <ul className="space-y-4 mb-8 text-white/70">
            <li className="flex items-center gap-3"><Check className="text-teal-500 w-5 h-5" /> Local vector search</li>
            <li className="flex items-center gap-3"><Check className="text-teal-500 w-5 h-5" /> 3 active workstreams</li>
            <li className="flex items-center gap-3"><Check className="text-teal-500 w-5 h-5" /> Basic CLI</li>
          </ul>
          <Link href="/download" className="block text-center w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium">Download Free</Link>
        </div>
        <div className="p-8 rounded-2xl bg-gradient-to-b from-teal-500/10 to-transparent border border-teal-500/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 blur-[50px]" />
          <Crown className="w-8 h-8 text-teal-400 mb-4" />
          <h3 className="text-2xl font-bold mb-2 text-teal-400">Pro</h3>
          <div className="text-4xl font-bold mb-6">$12<span className="text-xl text-white/40">/mo</span></div>
          <ul className="space-y-4 mb-8 text-white/70">
            <li className="flex items-center gap-3"><Check className="text-teal-500 w-5 h-5" /> JIT Pro embedding models</li>
            <li className="flex items-center gap-3"><Check className="text-teal-500 w-5 h-5" /> Unlimited workstreams</li>
            <li className="flex items-center gap-3"><Check className="text-teal-500 w-5 h-5" /> Journalist mode (ephemeral)</li>
          </ul>
          <div className="w-full relative shadow-[0_0_20px_rgba(20,184,166,0.3)] rounded-xl overflow-hidden [&>button]:h-[56px] [&>button]:!bg-teal-500 [&>button]:!text-black [&>button]:font-bold [&>button]:hover:!bg-teal-400">
            <ProUpgradeAction />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingV2() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans flex flex-col items-center py-32 px-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl w-full text-center relative z-10 mb-16">
        <h1 className="text-6xl md:text-7xl font-semibold tracking-tighter mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-white/40">Pricing</span> that makes sense.
        </h1>
      </motion.div>
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl backdrop-blur-xl mb-12">
        <div className="px-8 py-3 rounded-xl bg-white/10 font-medium">Monthly</div>
        <div className="px-8 py-3 rounded-xl text-white/50">Yearly (-20%)</div>
      </div>
      <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-10 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col">
          <div className="text-sm text-white/50 mb-2">Community</div>
          <div className="text-5xl font-bold mb-8">$0</div>
          <Link href="/download" className="block text-center w-full py-4 rounded-xl bg-white/10 mb-8 hover:bg-white/20">Get Started</Link>
        </div>
        <div className="p-10 rounded-3xl bg-[#0F131A] border border-amber-400/30 shadow-[0_20px_60px_rgba(245,158,11,0.1)] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4"><Zap className="text-amber-400" /></div>
          <div className="text-sm text-amber-400 mb-2 font-medium">Professional</div>
          <div className="text-5xl font-bold mb-8 text-white">$12</div>
          <div className="w-full mb-8 [&>button]:h-[56px] [&>button]:!bg-amber-400 [&>button]:!text-black [&>button]:font-semibold [&>button]:hover:!bg-amber-300 [&>button]:rounded-xl overflow-hidden">
            <ProUpgradeAction />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingV3() {
  return (
    <div className="min-h-screen bg-[#0A0D0F] text-[#f3f5f7] font-mono flex flex-col items-center py-24 px-8 relative">
      <div className="max-w-4xl w-full border border-amber-400/20 bg-black/50 p-12 relative">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-400" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-400" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-400" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-400" />

        <div className="text-amber-400 text-sm uppercase tracking-[0.4em] mb-12 text-center">▸ License Allocation</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-white/10">
          <div className="p-8 border-b md:border-b-0 md:border-r border-white/10">
            <h2 className="text-2xl font-bold mb-2">COMMUNITY_TIER</h2>
            <div className="text-amber-400 mb-8">$0.00 / MONTH</div>
            <ul className="space-y-3 text-sm text-white/60">
              <li>▸ LOCAL_VECTOR_SEARCH</li>
              <li>▸ 3_WORKSTREAMS</li>
              <li>▸ STANDARD_CLI</li>
            </ul>
          </div>
          <div className="p-8 bg-amber-400/5 relative">
            <div className="absolute top-4 right-4 text-[10px] text-amber-400 bg-amber-400/20 px-2 py-1">RECOMMENDED</div>
            <h2 className="text-2xl font-bold mb-2 text-amber-400">PRO_TIER</h2>
            <div className="text-amber-400 mb-8">$12.00 / MONTH</div>
            <ul className="space-y-3 text-sm text-white/80">
              <li>▸ JIT_PRO_MODELS</li>
              <li>▸ UNLIMITED_WORKSTREAMS</li>
              <li>▸ JOURNALIST_MODE</li>
            </ul>
            <div className="mt-8 w-full [&>button]:h-[56px] [&>button]:!bg-amber-400 [&>button]:!text-black [&>button]:font-bold [&>button]:uppercase [&>button]:tracking-widest [&>button]:hover:!bg-amber-300 [&>button]:rounded-none">
              <ProUpgradeAction />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingV4() {
  return (
    <div className="min-h-screen bg-[#04050A] text-white flex items-center justify-center p-8 perspective-1000">
      <motion.div
        initial={{ rotateX: -10, y: 50, opacity: 0 }}
        animate={{ rotateX: 0, y: 0, opacity: 1 }}
        className="w-full max-w-5xl bg-black/40 border border-white/10 rounded-3xl p-12 backdrop-blur-2xl grid grid-cols-1 md:grid-cols-2 gap-12"
      >
        <div>
          <h1 className="text-5xl font-bold mb-4">Pricing</h1>
          <p className="text-xl text-white/50 mb-8">Spatial search capabilities, unlocked.</p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0"><Check size={16} /></div>
              <div><div className="font-semibold">Local Execution</div><div className="text-sm text-white/40">Zero cloud dependency</div></div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0"><Check size={16} /></div>
              <div><div className="font-semibold">Deep Reasoning</div><div className="text-sm text-white/40">Pro models built-in</div></div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-violet-500/20 to-blue-500/10 rounded-2xl p-8 border border-white/20 relative shadow-[0_0_50px_rgba(124,58,237,0.2)]">
          <div className="text-xl font-medium mb-2">Ixos Pro</div>
          <div className="text-5xl font-bold mb-8">$12<span className="text-lg text-white/50 font-normal">/mo</span></div>
          <div className="w-full [&>button]:h-[56px] [&>button]:!bg-white [&>button]:!text-black [&>button]:font-semibold [&>button]:hover:!bg-gray-200 [&>button]:rounded-xl overflow-hidden">
            <ProUpgradeAction />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PricingV5() {
  return (
    <div className="min-h-screen bg-[#0C0E10] text-white font-mono flex items-center justify-center p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 border border-white/10 bg-white/[0.02]">
          <h2 className="text-xl font-bold mb-8">Community</h2>
          <div className="text-3xl mb-8">$0 / mo</div>
          <Link href="/download" className="block text-center w-full py-3 border border-white/20 hover:bg-white/5 mb-8">Current Plan</Link>
        </div>
        <div className="p-8 border border-amber-400/30 bg-amber-400/[0.05]">
          <h2 className="text-xl font-bold mb-8 text-amber-400">Pro</h2>
          <div className="text-3xl mb-8">$12 / mo</div>
          <div className="w-full mb-8 [&>button]:h-[50px] [&>button]:!bg-amber-400 [&>button]:!text-black [&>button]:font-bold [&>button]:hover:!bg-amber-300 [&>button]:rounded-none">
            <ProUpgradeAction />
          </div>
        </div>
      </div>
    </div>
  );
}

export { PricingV1, PricingV2, PricingV3, PricingV4, PricingV5 };

export default function PricingPage() {
  const [variant, setVariant] = useState<number>(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ixos_variant');
    if (stored) setVariant(Number(stored));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  switch (variant) {
    case 1: return <PricingV1 />;
    case 2: return <PricingV2 />;
    case 3: return <PricingV3 />;
    case 4: return <PricingV4 />;
    case 5: return <PricingV5 />;
    default: return <PricingV5 />;
  }
}
