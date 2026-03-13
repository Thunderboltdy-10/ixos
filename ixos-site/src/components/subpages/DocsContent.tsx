"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Terminal, Zap, Shield, Menu, X } from "lucide-react";

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
      <p className="opacity-80">Install Ixos via Cargo to begin indexing your local files.</p>
      <div className="p-4 bg-black/40 border border-current rounded font-mono text-sm">
        cargo install ixos<br/>
        ixos init<br/>
        ixos search "your query"
      </div>
      <p className="opacity-80">By default, Ixos creates an HMAC-signed local embedding cache.</p>
    </div>
  ),
  "cli-reference": (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">CLI Reference</h2>
      <div className="space-y-4">
        <div>
          <div className="font-bold font-mono">--stub-model</div>
          <div className="opacity-80 text-sm">Forces use of the tiny testing model for fast execution.</div>
        </div>
        <div>
          <div className="font-bold font-mono">--cache-mode [xattr|ads|null]</div>
          <div className="opacity-80 text-sm">Specifies the cache storage backend.</div>
        </div>
        <div>
          <div className="font-bold font-mono">--secure-timing</div>
          <div className="opacity-80 text-sm">Pads execution time to 100ms floor to prevent timing attacks.</div>
        </div>
        <div>
          <div className="font-bold font-mono">--journalist-mode</div>
          <div className="opacity-80 text-sm">Runs fully ephemeral, bypassing any disk cache.</div>
        </div>
      </div>
    </div>
  ),
  "models": (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">Models</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-current rounded">
          <div className="font-bold">Flash v2 (Free)</div>
          <div className="opacity-80 text-sm mt-2">16.6MB local model.<br/>339ms/1k files.<br/>MRR: 0.834</div>
        </div>
        <div className="p-4 border border-current rounded">
          <div className="font-bold">Pro v2 (Pro)</div>
          <div className="opacity-80 text-sm mt-2">102MB local model.<br/>430ms/1k files.<br/>MRR: 0.921</div>
        </div>
      </div>
    </div>
  ),
  "architecture": (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">Architecture</h2>
      <p className="opacity-80">Ixos relies on a parallelized Rust engine (Rayon) for file loading, processing 1000 files in ~7ms.</p>
      <p className="opacity-80">Cache backends utilize NTFS Alternate Data Streams (ADS) on Windows and Extended Attributes (xattr) on Unix, fully signed with HMAC-SHA256 to verify integrity.</p>
    </div>
  ),
};

function DocsLayout({ variant, children, activeSection, setActiveSection, themeClass }: any) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`max-w-7xl mx-auto py-24 px-6 pt-32 min-h-screen flex flex-col md:flex-row gap-12 ${themeClass}`}>
      {/* Mobile nav toggle */}
      <button className="md:hidden flex items-center gap-2 mb-4" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />} <span>Navigation</span>
      </button>

      {/* Sidebar Nav */}
      <div className={`${mobileMenuOpen ? "block" : "hidden"} md:block w-full md:w-64 shrink-0`}>
        <div className="sticky top-32 space-y-2">
          {DOCS_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => { setActiveSection(sec.id); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors rounded-md ${
                  isActive ? "bg-current text-black" : "hover:bg-black/20 opacity-70 hover:opacity-100"
                }`}
              >
                <Icon size={16} />
                <span className="font-bold text-sm">{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

function DocsV1() {
  const [activeSection, setActiveSection] = useState("getting-started");
  return (
    <div className="text-[#E2E8F0] font-mono relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#F6B94C]/10 blur-[120px] pointer-events-none rounded-full" />
      
      <DocsLayout 
        variant="1" 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        themeClass="text-[#F6B94C] drop-shadow-[0_0_8px_rgba(246,185,76,0.6)]"
      >
        <div className="relative group p-8 bg-[#0F172A]/90 border border-[#F6B94C]/30 shadow-[0_0_20px_rgba(246,185,76,0.1)] backdrop-blur-md">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#F6B94C]/50 group-hover:border-[#F6B94C] transition-colors" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#F6B94C]/50 group-hover:border-[#F6B94C] transition-colors" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#F6B94C]/50 group-hover:border-[#F6B94C] transition-colors" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#F6B94C]/50 group-hover:border-[#F6B94C] transition-colors" />
          
          <div className="absolute top-0 right-4 px-2 py-1 bg-[#F6B94C] text-[#0F172A] text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
            <Shield className="w-3 h-3" /> SYSTEM_DOCS
          </div>

          <div className="text-[#E2E8F0] [&_h2]:text-[#F6B94C] [&_h2]:border-[#F6B94C]/30 [&_h2]:drop-shadow-[0_0_10px_rgba(246,185,76,0.5)] [&_.bg-black\/40]:bg-[#1E293B] [&_.bg-black\/40]:border-[#F6B94C]/20 [&_.bg-black\/40]:text-[#E2E8F0] [&_.border-current]:border-[#F6B94C]/30 [&_.bg-black\/40]:shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
            {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
          </div>
        </div>
      </DocsLayout>
    </div>
  );
}

function DocsV2() {
  const [activeSection, setActiveSection] = useState("getting-started");
  return (
    <div className="text-[#F1F5F9] font-sans relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#38BDF8]/5 blur-[120px] pointer-events-none rounded-full" />
      
      <DocsLayout 
        variant="2" 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        themeClass="text-[#38BDF8]"
      >
        <div className="relative group p-8 md:p-12 bg-[#080C14]/90 border border-[#334155]/60 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#38BDF8]/40 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#38BDF8]/10 to-transparent" />
          
          <div className="absolute top-6 right-8 px-3 py-1 bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded-full text-[#38BDF8] text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
            <BookOpen className="w-3 h-3" /> API_REFERENCE
          </div>

          <div className="text-[#E2E8F0] [&_h2]:text-[#F1F5F9] [&_h2]:border-[#334155] [&_h2]:pb-4 [&_h2]:mb-8 [&_h2]:font-bold [&_h2]:tracking-tight [&_.opacity-80]:text-[#94A3B8] [&_.opacity-80]:text-sm [&_.opacity-80]:leading-relaxed [&_.bg-black\/40]:bg-[#0F172A] [&_.bg-black\/40]:border-[#334155] [&_.bg-black\/40]:text-[#E2E8F0] [&_.bg-black\/40]:shadow-inner [&_.bg-black\/40]:rounded-xl [&_.border-current]:border-[#334155] [&_.font-bold]:text-[#E2E8F0] [&_.opacity-80.text-sm]:text-[#94A3B8]">
            {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
          </div>
        </div>
      </DocsLayout>
    </div>
  );
}

function DocsV3() {
  const [activeSection, setActiveSection] = useState("getting-started");
  return (
    <div className="text-[#F3F5F7] font-mono relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/5 blur-[120px] pointer-events-none rounded-full" />
      
      <DocsLayout 
        variant="3" 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        themeClass="text-amber-400"
      >
        <div className="relative group p-8 md:p-12 bg-[#0A0D0F]/90 border border-amber-400/20 shadow-[-20px_0_40px_rgba(246,185,76,0.05)] backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-amber-400/40 group-hover:border-amber-400 transition-colors" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-amber-400/40 group-hover:border-amber-400 transition-colors" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-amber-400/40 group-hover:border-amber-400 transition-colors" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-amber-400/40 group-hover:border-amber-400 transition-colors" />
          
          <div className="absolute top-0 right-6 px-3 py-1 bg-[#0A0D0F] border-b border-x border-amber-400/20 text-amber-400 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" /> TARGET_LOCKED
          </div>

          <div className="text-white relative z-10 [&_h2]:text-white [&_h2]:border-amber-400/20 [&_h2]:pb-4 [&_h2]:mb-8 [&_h2]:font-bold [&_h2]:tracking-widest [&_h2]:uppercase [&_.opacity-80]:text-white/50 [&_.opacity-80]:text-sm [&_.opacity-80]:leading-relaxed [&_.bg-black\/40]:bg-[#0A0D0F] [&_.bg-black\/40]:border-amber-400/10 [&_.bg-black\/40]:text-amber-400 [&_.bg-black\/40]:shadow-inner [&_.bg-black\/40]:p-6 [&_.border-current]:border-amber-400/20 [&_.font-bold]:text-white [&_.opacity-80.text-sm]:text-white/50">
            {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
          </div>
        </div>
      </DocsLayout>
    </div>
  );
}

function DocsV4() {
  const [activeSection, setActiveSection] = useState("getting-started");
  return (
    <div className="text-[#F1F5F9] font-sans relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2DD4BF]/5 blur-[150px] pointer-events-none rounded-full" />
      
      <DocsLayout 
        variant="4" 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        themeClass="text-[#2DD4BF]"
      >
        <div className="relative group p-8 md:p-12 bg-white/[0.02] border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl hover:bg-white/[0.03] transition-colors overflow-hidden">
          {/* Subtle top edge highlight */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="absolute top-6 right-8 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/70 text-xs font-medium flex items-center gap-2 shadow-sm backdrop-blur-md">
            <BookOpen className="w-3.5 h-3.5 text-[#2DD4BF]" /> Documentation
          </div>

          <div className="text-[#F1F5F9] relative z-10 [&_h2]:text-white [&_h2]:text-3xl [&_h2]:font-light [&_h2]:tracking-tight [&_h2]:border-white/10 [&_h2]:pb-4 [&_h2]:mb-8 [&_.opacity-80]:text-white/60 [&_.opacity-80]:text-base [&_.opacity-80]:font-light [&_.opacity-80]:leading-relaxed [&_.bg-black\/40]:bg-black/20 [&_.bg-black\/40]:border-white/5 [&_.bg-black\/40]:text-[#F1F5F9] [&_.bg-black\/40]:p-6 [&_.bg-black\/40]:rounded-2xl [&_.bg-black\/40]:shadow-[inset_0_2px_15px_rgba(0,0,0,0.2)] [&_.border-current]:border-white/10 [&_.font-bold]:font-medium [&_.font-bold]:text-white [&_.opacity-80.text-sm]:text-white/50">
            {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
          </div>
        </div>
      </DocsLayout>
    </div>
  );
}

function DocsV5() {
  const [activeSection, setActiveSection] = useState("getting-started");
  return (
    <div className="text-white font-mono relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] bg-cyan-500/10 blur-[180px] pointer-events-none rounded-full" />
      
      <DocsLayout 
        variant="5" 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        themeClass="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
      >
        <div className="relative group p-8 md:p-12 bg-[#0C0E10]/95 border border-cyan-500/30 rounded-3xl shadow-[0_20px_60px_rgba(34,211,238,0.1)] backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.03] to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
          
          <div className="absolute top-6 right-8 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border border-cyan-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <Terminal className="w-3.5 h-3.5" /> SYSTEM_RECORDS
          </div>

          <div className="text-white relative z-10 [&_h2]:text-cyan-400 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:tracking-tighter [&_h2]:border-cyan-500/20 [&_h2]:pb-4 [&_h2]:mb-8 [&_h2]:drop-shadow-[0_0_10px_rgba(34,211,238,0.3)] [&_.opacity-80]:text-cyan-500/70 [&_.opacity-80]:text-sm [&_.opacity-80]:leading-relaxed [&_.bg-black\/40]:bg-[#0C0E10] [&_.bg-black\/40]:border-cyan-500/30 [&_.bg-black\/40]:text-white [&_.bg-black\/40]:p-6 [&_.bg-black\/40]:rounded-xl [&_.bg-black\/40]:shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] [&_.border-current]:border-cyan-500/30 [&_.font-bold]:font-bold [&_.font-bold]:text-white [&_.font-bold]:tracking-wider [&_.opacity-80.text-sm]:text-cyan-500/60">
            {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
          </div>
        </div>
      </DocsLayout>
    </div>
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
