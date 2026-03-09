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
    <div className="text-[#E2E8F0] font-mono">
      <DocsLayout variant="1" activeSection={activeSection} setActiveSection={setActiveSection} themeClass="text-[#F6B94C]">
        <div className="text-[#E2E8F0]">{DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}</div>
      </DocsLayout>
    </div>
  );
}

function DocsV2() {
  const [activeSection, setActiveSection] = useState("getting-started");
  return (
    <div className="text-[#F1F5F9] font-sans">
      <DocsLayout variant="2" activeSection={activeSection} setActiveSection={setActiveSection} themeClass="text-[#38BDF8]">
        <div className="text-[#F1F5F9]">{DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}</div>
      </DocsLayout>
    </div>
  );
}

function DocsV3() {
  const [activeSection, setActiveSection] = useState("getting-started");
  return (
    <div className="text-[#F3F5F7] font-mono">
      <DocsLayout variant="3" activeSection={activeSection} setActiveSection={setActiveSection} themeClass="text-[#14B8A6]">
        <div className="text-[#F3F5F7]">{DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}</div>
      </DocsLayout>
    </div>
  );
}

function DocsV4() {
  const [activeSection, setActiveSection] = useState("getting-started");
  return (
    <div className="text-white font-sans">
      <DocsLayout variant="4" activeSection={activeSection} setActiveSection={setActiveSection} themeClass="text-[#2DD4BF]">
        <div className="text-white/80">{DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}</div>
      </DocsLayout>
    </div>
  );
}

function DocsV5() {
  const [activeSection, setActiveSection] = useState("getting-started");
  return (
    <div className="text-white font-mono">
      <DocsLayout variant="5" activeSection={activeSection} setActiveSection={setActiveSection} themeClass="text-teal-400">
        <div className="text-white/80 bg-[#0C0E10] border border-white/10 p-8 rounded-lg shadow-[0_0_50px_rgba(45,212,191,0.05)]">
          {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
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
