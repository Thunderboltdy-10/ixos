"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Terminal,
  Zap,
  Shield,
  Menu,
  X,
  ChevronRight,
  Cpu,
  Layers,
  Fingerprint,
  Globe,
} from "lucide-react";
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
      <h2 className="text-2xl font-bold border-b border-current pb-2">
        Getting started
      </h2>
      <p className="opacity-80">
        Download a binary from Releases, or run this build command in a clone of
        the repository.
      </p>
      <pre className="p-6 bg-black/40 border border-current rounded font-mono text-sm overflow-auto">{`cargo install --path crates/ixos-cli --locked
ixos model install code
ixos search "cache freshness" --dir . --profile code`}</pre>
    </div>
  ),
  "cli-reference": (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">
        CLI reference
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {[
          {
            cmd: "search QUERY --dir LOCATION --profile code|documents",
            desc: "Rank files using hybrid search. Use --mode lexical or semantic to choose one signal.",
          },
          {
            cmd: "grep PATTERN --dir LOCATION",
            desc: "Find literal or regular-expression matches. Use --fixed for literal text.",
          },
          {
            cmd: "read PATH --dir LOCATION --start 1 --lines 30",
            desc: "Read a range of source lines.",
          },
          {
            cmd: "mcp --dir LOCATION",
            desc: "Expose search, grep and read tools to Claude Code or Codex.",
          },
        ].map((item) => (
          <div
            key={item.cmd}
            className="p-4 border border-current/20 rounded-lg hover:bg-current/5 transition-colors"
          >
            <div className="font-bold font-mono text-current mb-1">
              {item.cmd}
            </div>
            <div className="opacity-80 text-sm leading-relaxed">
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
  models: (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">
        Models
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            name: "Code",
            description:
              "Potion Code with tokenizer truncation removed. 256 dimensions. No additional training.",
          },
          {
            name: "Documents",
            description:
              "Potion Retrieval with rows stored as int8 plus scales. 512 dimensions. No additional training.",
          },
        ].map((model) => (
          <div
            key={model.name}
            className="p-6 border border-current/30 rounded-xl bg-current/5 relative overflow-hidden group"
          >
            <div className="font-bold text-lg mb-2">{model.name}</div>
            <p className="opacity-80 text-sm">{model.description}</p>
          </div>
        ))}
      </div>
      <p className="opacity-80">
        Install with ixos model install code or documents. Use --from
        models/code for local development artifacts before publication.
      </p>
    </div>
  ),
  architecture: (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-current pb-2">
        Architecture
      </h2>
      <p className="opacity-80">
        An ignore-aware walk discovers files. The engine extracts text, updates
        BM25 statistics and reads or builds semantic records. Hybrid ranking
        combines normalized BM25 and cosine similarity. A query selects a source
        snippet for each result.
      </p>
      <p className="opacity-80">
        Resident clients reuse parsed text and vectors. Matching file size,
        modification time and identity avoid reading unchanged files; recent
        timestamps and changes fall back to full source hashing.
      </p>
      <p className="opacity-80">
        Records live in :ixos on Windows or user.ixos on Unix, with an
        application database fallback. A checksum detects corrupt records.
        Source and model fingerprints decide freshness.
      </p>
    </div>
  ),
};

function DocsHero({ title, subtitle, icon: Icon, color }: any) {
  return (
    <div className="relative pt-32 pb-16 px-6 text-center overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,#F59E0B22_0%,transparent_70%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-4xl mx-auto"
      >
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-xs font-mono uppercase tracking-[0.2em] border`}
          style={{
            color: color,
            borderColor: `${color}44`,
            backgroundColor: `${color}11`,
          }}
        >
          <Icon size={14} className="animate-pulse" /> {title}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-white leading-[1.1]">
          Use <span style={{ color: color }}>Ixos.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      </motion.div>
    </div>
  );
}

function DocsLayout({
  children,
  activeSection,
  setActiveSection,
  themeClass,
  sidebarClass,
  color,
}: any) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen ${themeClass}`}>
      <DocsHero
        title={`${DOCS_SECTIONS.find((s) => s.id === activeSection)?.label || "Documentation"}`}
        subtitle="Build, configure and use local hybrid search."
        icon={
          DOCS_SECTIONS.find((s) => s.id === activeSection)?.icon || BookOpen
        }
        color={color}
      />

      <div
        className={`max-w-7xl mx-auto py-12 px-6 flex flex-col md:flex-row gap-12`}
      >
        {/* Mobile nav toggle */}
        <button
          className="md:hidden flex items-center justify-between w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl mb-4"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />} Navigation
          </span>
          <span className="text-xs opacity-50">
            {DOCS_SECTIONS.find((s) => s.id === activeSection)?.label}
          </span>
        </button>

        {/* Sidebar Nav */}
        <div
          className={`${mobileMenuOpen ? "block" : "hidden"} md:block w-full md:w-72 shrink-0`}
        >
          <div
            className={`sticky top-32 space-y-1.5 p-1.5 bg-black/20 border border-white/5 rounded-2xl ${sidebarClass}`}
          >
            {DOCS_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    setActiveSection(sec.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-all rounded-xl relative group overflow-hidden cursor-pointer ${
                    isActive
                      ? "text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-current/10"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      style={{ backgroundColor: `${color}22` }}
                    />
                  )}
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <Icon
                    size={18}
                    className={`${isActive ? "" : "group-hover:scale-110"} transition-transform`}
                    style={{ color: isActive ? color : "inherit" }}
                  />
                  <span
                    className={`font-bold text-xs uppercase tracking-widest ${isActive ? "ml-1" : ""}`}
                  >
                    {sec.label}
                  </span>
                  {isActive && (
                    <ChevronRight size={14} className="ml-auto opacity-50" />
                  )}
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

function DocsPageContent() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const color = "#F59E0B";
  return (
    <DocsLayout
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
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_#F59E0B]" />{" "}
          DOCUMENTATION
        </div>

        <div className="text-white relative z-10 [&_h2]:text-white [&_h2]:border-amber-400/20 [&_h2]:pb-6 [&_h2]:mb-10 [&_h2]:font-bold [&_h2]:tracking-[0.15em] [&_h2]:uppercase [&_.opacity-80]:text-white/40 [&_.bg-black\/40]:bg-black/40 [&_.bg-black\/40]:border-amber-400/10 [&_.bg-black\/40]:p-8 [&_.border-current]:border-amber-400/20 [&_.font-bold]:text-white">
          {DOC_CONTENT[activeSection as keyof typeof DOC_CONTENT]}
        </div>
      </div>
    </DocsLayout>
  );
}

export function DocsContent() {
  return <DocsPageContent />;
}
