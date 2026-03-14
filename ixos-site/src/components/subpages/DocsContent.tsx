"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Terminal, Zap, Shield, Menu, X, ChevronRight, Cpu, Layers, Fingerprint, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DOCS_SECTIONS = [
  { id: "getting-started", label: "Getting Started", icon: BookOpen },
  { id: "cli-reference", label: "CLI Reference", icon: Terminal },
  { id: "models", label: "Models", icon: Zap },
  { id: "architecture", label: "Architecture", icon: Shield },
];

const DOC_CONTENT = {
  "getting-started": (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">Getting Started</h2>
      <p className="opacity-80">Install Ixos via Cargo to begin indexing your local files. Our engine is written in pure Rust for maximum memory safety and performance.</p>
      <div className="p-6 bg-black/40 border border-current rounded font-mono text-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
          <Terminal size={14} />
        </div>
        <span className="text-current/40 select-none">$ </span>cargo install ixos<br/>
        <span className="text-current/40 select-none">$ </span>ixos init<br/>
        <span className="text-current/40 select-none">$ </span>ixos search "your query"
      </div>
      <p className="opacity-80">By default, Ixos creates an HMAC-signed local embedding cache. This ensures that your intellectual property remains private and untampered.</p>
    </div>
  ),
  "cli-reference": (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">CLI Reference</h2>
      <div className="grid grid-cols-1 gap-4">
        {[
          { cmd: "--stub-model", desc: "Forces use of the tiny testing model for fast execution." },
          { cmd: "--cache-mode [xattr|ads|null]", desc: "Specifies the cache storage backend." },
          { cmd: "--secure-timing", desc: "Pads execution time to 100ms floor to prevent timing attacks." },
          { cmd: "--journalist-mode", desc: "Runs fully ephemeral, bypassing any disk cache." },
        ].map((item, i) => (
          <div key={i} className="p-4 border border-current/20 rounded-lg hover:bg-current/5 transition-colors">
            <div className="font-bold font-mono text-current mb-1">{item.cmd}</div>
            <div className="opacity-80 text-sm leading-relaxed">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  ),
  "models": (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">Models</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border border-current/30 rounded-xl bg-current/5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-current/10 blur-2xl group-hover:bg-current/20 transition-all rounded-full" />
          <div className="font-bold text-lg mb-2">Flash v2 (Free)</div>
          <div className="opacity-80 text-sm space-y-1">
            <p>• 16.6MB local model</p>
            <p>• 339ms/1k files</p>
            <p>• MRR: 0.834</p>
          </div>
          <div className="mt-4 text-[10px] font-mono uppercase tracking-widest opacity-40">optimized for latency</div>
        </div>
        <div className="p-6 border border-current bg-current/[0.08] rounded-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-current/20 blur-2xl group-hover:bg-current/30 transition-all rounded-full" />
          <div className="font-bold text-lg mb-2 text-current">Pro v2 (Pro)</div>
          <div className="opacity-80 text-sm space-y-1">
            <p>• 102MB local model</p>
            <p>• 430ms/1k files</p>
            <p>• MRR: 0.921</p>
          </div>
          <div className="mt-4 text-[10px] font-mono uppercase tracking-widest opacity-60">high-precision fusion</div>
        </div>
      </div>
    </div>
  ),
  "architecture": (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">Architecture</h2>
      <div className="space-y-4">
        <p className="opacity-80">Ixos relies on a parallelized Rust engine (Rayon) for file loading, processing 1,000 files in ~7ms. This represents the state-of-the-art in local filesystem scanning.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-black/20 border border-current/20 rounded">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Cpu size={14} /> Compute Layer</h4>
            <p className="text-xs opacity-60">ONNX Runtime integration for cross-platform model inference on CPU.</p>
          </div>
          <div className="p-4 bg-black/20 border border-current/20 rounded">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Shield size={14} /> Security Layer</h4>
            <p className="text-xs opacity-60">HMAC-SHA256 cache signing and mlock memory protection for sensitive buffers.</p>
          </div>
        </div>
        <p className="opacity-80">Cache backends utilize NTFS Alternate Data Streams (ADS) on Windows and Extended Attributes (xattr) on Unix, fully signed with HMAC-SHA256 to verify integrity.</p>
      </div>
    </div>
  ),
};

function DocsHero({ variant, title, subtitle, icon: Icon, color }: any) {
  return (
    <div className="relative pt-32 pb-16 px-6 text-center overflow-hidden">
      {/* Background visual flair based on variant */}
      <div className="absolute inset-0 z-0 opacity-20">
        {variant === "1" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,#F6B94C22_0%,transparent_70%)]" />
        )}
        {variant === "2" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,#38BDF822_0%,transparent_70%)]" />
        )}
        {variant === "3" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,#F59E0B22_0%,transparent_70%)]" />
        )}
        {variant === "4" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,#2DD4BF22_0%,transparent_70%)]" />
        )}
        {variant === "5" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,#22D3EE22_0%,transparent_70%)]" />
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-4xl mx-auto"
      >
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-xs font-mono uppercase tracking-[0.2em] border`} style={{ color: color, borderColor: `${color}44`, backgroundColor: `${color}11` }}>
          <Icon size={14} className="animate-pulse" /> {title}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-white leading-[1.1]">
          Master the <span style={{ color: color }}>Protocol.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      </motion.div>
    </div>
  );
}

function DocsLayout({ variant, children, activeSection, setActiveSection, themeClass, sidebarClass, color }: any) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen ${themeClass}`}>
      <DocsHero 
        variant={variant} 
        title={`${DOCS_SECTIONS.find(s => s.id === activeSection)?.label || 'Documentation'}`} 
        subtitle="Explore the technical foundations of Ixos, from local vector embeddings to cryptographically secured cache architectures." 
        icon={DOCS_SECTIONS.find(s => s.id === activeSection)?.icon || BookOpen}
        color={color}
      />

      <div className={`max-w-7xl mx-auto py-12 px-6 flex flex-col md:flex-row gap-12`}>
        {/* Mobile nav toggle */}
        <button className="md:hidden flex items-center justify-between w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl mb-4" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />} Navigation
          </span>
          <span className="text-xs opacity-50">{DOCS_SECTIONS.find(s => s.id === activeSection)?.label}</span>
        </button>

        {/* Sidebar Nav */}
        <div className={`${mobileMenuOpen ? "block" : "hidden"} md:block w-full md:w-72 shrink-0`}>
          <div className={`sticky top-32 space-y-1.5 p-1.5 bg-black/20 border border-white/5 rounded-2xl ${sidebarClass}`}>
            {DOCS_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => { setActiveSection(sec.id); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-all rounded-xl relative group overflow-hidden ${
                    isActive ? "text-white" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {isActive && (
                    <motion.div layoutId="active-pill" className="absolute inset-0 bg-current/10" transition={{ type: "spring", stiffness: 400, damping: 30 }} style={{ backgroundColor: `${color}22` }} />
                  )}
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ backgroundColor: color }} />}
                  <Icon size={18} className={`${isActive ? "" : "group-hover:scale-110"} transition-transform`} style={{ color: isActive ? color : "inherit" }} />
                  <span className={`font-bold text-xs uppercase tracking-widest ${isActive ? "ml-1" : ""}`}>{sec.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function DocsV1() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const color = "#F6B94C";
  return (
    <DocsLayout 
      variant="1" 
      activeSection={activeSection} 
      setActiveSection={setActiveSection} 
      themeClass="bg-[#0A0F1D] text-[#E2E8F0] font-mono"
      sidebarClass="border-[#F6B94C]/20"
      color={color}
    >
      <div className="relative group p-10 bg-[#0F172A]/90 border border-[#F6B94C]/30 shadow-[0_0_40px_rgba(246,185,76,0.05)] backdrop-blur-md">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#F6B94C]/50 group-hover:border-[#F6B94C] transition-colors" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#F6B94C]/50 group-hover:border-[#F6B94C] transition-colors" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#F6B94C]/50 group-hover:border-[#F6B94C] transition-colors" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#F6B94C]/50 group-hover:border-[#F6B94C] transition-colors" />
        
        <div className="absolute -top-3 right-6 px-3 py-1 bg-[#F6B94C] text-[#0F172A] text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(246,185,76,0.4)]">
          <Shield className="w-3 h-3" /> SYSTEM_DOCS_V1.0
        </div>

        <div className="text-[#E2E8F0] [&_h2]:text-[#F6B94C] [&_h2]:border-[#F6B94C]/20 [&_h2]:drop-shadow-[0_0_10px_rgba(246,185,76,0.3)] [&_.bg-black\/40]:bg-[#1E293B] [&_.bg-black\/40]:border-[#F6B94C]/20 [&_.border-current]:border-[#F6B94C]/20">
          {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
        </div>
      </div>
    </DocsLayout>
  );
}

function DocsV2() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const color = "#38BDF8";
  return (
    <DocsLayout 
      variant="2" 
      activeSection={activeSection} 
      setActiveSection={setActiveSection} 
      themeClass="bg-[#080C14] text-[#F1F5F9] font-sans"
      sidebarClass="border-white/5 bg-white/[0.02] backdrop-blur-xl"
      color={color}
    >
      <div className="relative group p-10 md:p-14 bg-[#0F172A]/40 border border-[#334155]/60 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#38BDF8]/50 to-transparent" />
        
        <div className="absolute top-8 right-10 px-4 py-1.5 bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded-full text-[#38BDF8] text-[10px] font-bold tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
          <BookOpen className="w-3.5 h-3.5" /> API_CORE_REF
        </div>

        <div className="text-[#E2E8F0] [&_h2]:text-white [&_h2]:border-[#334155] [&_h2]:pb-6 [&_h2]:mb-10 [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-3xl [&_.opacity-80]:text-[#94A3B8] [&_.bg-black\/40]:bg-[#080C14] [&_.bg-black\/40]:border-[#334155] [&_.bg-black\/40]:rounded-2xl [&_.border-current]:border-[#334155] [&_.font-bold]:text-white">
          {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
        </div>
      </div>
    </DocsLayout>
  );
}

function DocsV3() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const color = "#F59E0B";
  return (
    <DocsLayout 
      variant="3" 
      activeSection={activeSection} 
      setActiveSection={setActiveSection} 
      themeClass="bg-[#0A0D0F] text-[#F3F5F7] font-mono"
      sidebarClass="border-amber-400/10"
      color={color}
    >
      <div className="relative group p-10 md:p-14 bg-[#0D0F12] border border-amber-400/20 shadow-[-30px_0_60px_rgba(246,185,76,0.03)] backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-amber-400/40" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-amber-400/40" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-amber-400/40" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-amber-400/40" />
        
        <div className="absolute -top-3 right-8 px-4 py-1 bg-[#0D0F12] border border-amber-400/30 text-amber-400 text-[10px] font-bold tracking-[0.3em] uppercase flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_#F59E0B]" /> TARGET_SPEC
        </div>

        <div className="text-white relative z-10 [&_h2]:text-white [&_h2]:border-amber-400/20 [&_h2]:pb-6 [&_h2]:mb-10 [&_h2]:font-bold [&_h2]:tracking-[0.15em] [&_h2]:uppercase [&_.opacity-80]:text-white/40 [&_.bg-black\/40]:bg-black/40 [&_.bg-black\/40]:border-amber-400/10 [&_.bg-black\/40]:p-8 [&_.border-current]:border-amber-400/20 [&_.font-bold]:text-white">
          {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
        </div>
      </div>
    </DocsLayout>
  );
}

function DocsV4() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const color = "#2DD4BF";
  return (
    <DocsLayout 
      variant="4" 
      activeSection={activeSection} 
      setActiveSection={setActiveSection} 
      themeClass="bg-white text-gray-900 font-sans"
      sidebarClass="bg-gray-50 border-gray-100 shadow-inner"
      color={color}
    >
      <div className="relative group p-10 md:p-16 bg-white border border-gray-200 rounded-[3rem] shadow-2xl shadow-gray-200/50 hover:border-gray-300 transition-all overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 opacity-80" />
        
        <div className="absolute top-10 right-12 px-5 py-2 bg-gray-50 border border-gray-100 rounded-2xl text-gray-500 text-xs font-bold tracking-widest uppercase flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-500" /> Platform Guide
        </div>

        <div className="text-gray-600 relative z-10 [&_h2]:text-gray-900 [&_h2]:text-4xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:border-gray-100 [&_h2]:pb-6 [&_h2]:mb-10 [&_.opacity-80]:text-gray-500 [&_.opacity-80]:text-lg [&_.opacity-80]:leading-relaxed [&_.bg-black\/40]:bg-gray-50 [&_.bg-black\/40]:border-gray-100 [&_.bg-black\/40]:p-8 [&_.bg-black\/40]:rounded-[2rem] [&_.bg-black\/40]:text-gray-700 [&_.border-current]:border-gray-100 [&_.font-bold]:text-gray-900 [&_.font-bold]:font-bold">
          {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
        </div>
      </div>
    </DocsLayout>
  );
}

function DocsV5() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const color = "#22D3EE";
  return (
    <DocsLayout 
      variant="5" 
      activeSection={activeSection} 
      setActiveSection={setActiveSection} 
      themeClass="bg-[#0C0E10] text-white font-mono"
      sidebarClass="border-cyan-500/20 bg-cyan-500/[0.02]"
      color={color}
    >
      <div className="relative group p-10 md:p-14 bg-[#0E1114]/90 border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(34,211,238,0.1)] backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.05] to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
        
        <div className="absolute top-8 right-10 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold px-4 py-2 rounded-xl uppercase tracking-[0.2em] border border-cyan-500/30 flex items-center gap-2">
          <Terminal className="w-4 h-4" /> ENGINE_LOGS_ACTIVE
        </div>

        <div className="text-white relative z-10 [&_h2]:text-cyan-400 [&_h2]:text-4xl [&_h2]:font-black [&_h2]:tracking-tighter [&_h2]:border-cyan-500/20 [&_h2]:pb-6 [&_h2]:mb-10 [&_h2]:drop-shadow-[0_0_12px_rgba(34,211,238,0.4)] [&_.opacity-80]:text-cyan-400/60 [&_.bg-black\/40]:bg-[#080A0C] [&_.bg-black\/40]:border-cyan-500/30 [&_.bg-black\/40]:p-8 [&_.bg-black\/40]:rounded-2xl [&_.border-current]:border-cyan-500/30 [&_.font-bold]:text-white [&_.font-bold]:tracking-wider">
          {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
        </div>
      </div>
    </DocsLayout>
  );
}

export function DocsContent({ variant = "5" }: { variant?: string }) {
  switch (variant) {
    case "1": return <DocsV1 />;
    case "2": return <DocsV2 />;
    case "3": return <DocsV3 />;
    case "4": return <DocsV4 />;
    case "5": return <DocsV5 />;
    default: return <DocsV5 />;
  }
}
