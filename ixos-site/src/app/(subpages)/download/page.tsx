'use client'

import { useEffect, useState } from "react";
import { Copy, Check, Monitor, Terminal } from "lucide-react";
import {
  CLI_INSTALL_COMMANDS,
  detectDesktopPlatform,
  getDownloadUrl,
  type DownloadPlatform,
  type InstallOs,
} from "@/lib/downloads";

type Platform = "windows" | "macos" | "linux";
type MacChip = "apple" | "intel";

function CornerBracketsSmall({ color = 'rgba(246,185,76,0.25)' }: { color?: string }) {
  return (
    <>
      <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: color }} />
      <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: color }} />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: color }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: color }} />
    </>
  );
}

const PLATFORMS: { id: Platform; label: string; icon: string; installOs: InstallOs }[] = [
  { id: "windows", label: "Windows", icon: "⊞", installOs: "windows" },
  { id: "macos", label: "macOS", icon: "⌘", installOs: "macos" },
  { id: "linux", label: "Linux", icon: "⬡", installOs: "macos" }, // linux uses same cargo command as macos
];

const DESKTOP_FEATURES = [
  { tag: 'SEARCH', text: 'Semantic + lexical hybrid search across all file types' },
  { tag: 'WORKSTREAMS', text: 'Persistent project context that follows you across sessions' },
  { tag: 'VS CODE', text: 'Native extension with inline results and sidepanel' },
  { tag: 'AUTO MODEL', text: 'Flash or Pro model auto-selected based on query complexity' },
  { tag: 'BACKGROUND', text: 'Opt-in daemon for instant cache warm-up on launch' },
  { tag: 'GUI', text: 'Minimal dark native UI — no Electron, no web shell' },
];

const CLI_FEATURES = [
  { tag: 'JSON', text: 'Structured JSON / CSV / ripgrep-compatible output' },
  { tag: 'PROGRESSIVE', text: 'Stream results as each pipeline stage completes' },
  { tag: 'JOURNALIST', text: 'Ephemeral mode: no cache, no logs, no history' },
  { tag: 'CI-READY', text: 'Scriptable, pipeable, and exit-code aware' },
  { tag: 'HEADLESS', text: 'Zero GUI overhead — pure Rust binary under 12MB' },
  { tag: 'ATTESTATION', text: 'Ed25519 signatures on every result for provenance' },
];

export default function DownloadPage() {
  const [platform, setPlatform] = useState<Platform>("windows");
  const [macChip, setMacChip] = useState<MacChip>("apple");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = detectDesktopPlatform();
    if (p.startsWith("macos")) { setPlatform("macos"); if (p === "macos-x64") setMacChip("intel"); }
    else if (p.startsWith("linux")) setPlatform("linux");
    else setPlatform("windows");
  }, []);

  const getKey = (): DownloadPlatform => {
    if (platform === "windows") return "windows-x64";
    if (platform === "linux") return "linux-x64";
    return macChip === "apple" ? "macos-arm64" : "macos-x64";
  };

  const currentPlatform = PLATFORMS.find(p => p.id === platform)!;
  const installOs: InstallOs = platform === "windows" ? "windows" : "macos";
  const installCmd = CLI_INSTALL_COMMANDS[installOs];

  const handleDownload = () => window.location.assign(getDownloadUrl(getKey()));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCmd.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="min-h-screen font-mono" style={{ color: '#F3F5F7' }}>
      {/* Header */}
      <div className="relative pt-20 pb-12 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 0%, rgba(246,185,76,0.07) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="text-[9px] uppercase tracking-[0.32em] text-amber-400/50 mb-5">▸ Acquire</div>
          <h1 className="text-5xl md:text-6xl font-bold" style={{ color: '#F6B94C', letterSpacing: '-0.03em', lineHeight: 1.0 }}>
            Download Ixos
          </h1>
          <p className="mt-5 text-white/45 text-sm max-w-md mx-auto leading-relaxed">
            Local-first semantic search. Zero telemetry.<br />Works entirely on your machine.
          </p>
          <div className="mt-6 inline-flex items-center gap-3 px-4 py-2.5 border border-amber-400/20 bg-amber-400/[0.03]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(246,185,76,0.6)]" />
            <span className="text-[10px] text-amber-400/60 tracking-[0.15em]">v0.4.0</span>
            <span className="text-amber-400/20">·</span>
            <span className="text-[10px] text-white/30">MIT License</span>
            <span className="text-white/15">·</span>
            <span className="text-[10px] text-white/25">macOS · Windows · Linux</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24 space-y-0">

        {/* ── Shared Platform Selector ─────────────────────── */}
        <div className="relative mb-8" style={{ border: '1px solid rgba(246,185,76,0.25)', background: 'rgba(246,185,76,0.02)' }}>
          <CornerBracketsSmall color="rgba(246,185,76,0.4)" />
          <div className="p-6 md:p-8">
            <div className="text-[9px] uppercase tracking-[0.28em] text-amber-400/60 mb-5">Select platform</div>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  style={{
                    padding: '10px 22px',
                    border: `1px solid ${platform === p.id ? 'rgba(246,185,76,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    background: platform === p.id ? 'rgba(246,185,76,0.12)' : 'transparent',
                    color: platform === p.id ? '#F6B94C' : 'rgba(255,255,255,0.35)',
                    fontSize: 11,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 160ms',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: platform === p.id ? '0 0 16px rgba(246,185,76,0.1)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
            {platform === 'macos' && (
              <div className="flex gap-2 mt-4">
                {(['apple', 'intel'] as const).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setMacChip(chip)}
                    style={{
                      padding: '6px 14px',
                      border: `1px solid ${macChip === chip ? 'rgba(246,185,76,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      background: macChip === chip ? 'rgba(246,185,76,0.07)' : 'transparent',
                      color: macChip === chip ? 'rgba(246,185,76,0.9)' : 'rgba(255,255,255,0.28)',
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 160ms',
                      fontFamily: 'inherit',
                    }}
                  >
                    {chip === 'apple' ? '● Apple Silicon (M1+)' : '○ Intel'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Desktop App Section ──────────────────────────── */}
        <div className="mb-12">
          {/* Section heading */}
          <div className="flex items-center gap-4 mb-5 py-3 border-b border-amber-400/15">
            <div className="flex items-center gap-2">
              <Monitor size={14} style={{ color: '#F6B94C' }} />
              <span className="text-[11px] uppercase tracking-[0.28em] font-bold" style={{ color: '#F6B94C' }}>Desktop App</span>
            </div>
            <span className="text-[9px] text-white/25 uppercase tracking-[0.15em]">GUI + CLI bundled · Native Rust</span>
          </div>

          <div className="relative mb-5" style={{ border: '1px solid rgba(246,185,76,0.18)', background: 'rgba(246,185,76,0.018)' }}>
            <CornerBracketsSmall color="rgba(246,185,76,0.3)" />
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={handleDownload}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    padding: '14px 32px', background: '#F6B94C', color: '#0A0D0F',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                    cursor: 'pointer', border: 'none', transition: 'all 180ms', fontFamily: 'inherit',
                    boxShadow: '0 0 24px rgba(246,185,76,0.25)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FCD34D'; e.currentTarget.style.boxShadow = '0 0 36px rgba(246,185,76,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F6B94C'; e.currentTarget.style.boxShadow = '0 0 24px rgba(246,185,76,0.25)'; }}
                >
                  ▸ Download for {currentPlatform.label}
                  {platform === 'macos' && ` · ${macChip === 'apple' ? 'Apple Silicon' : 'Intel'}`}
                </button>
                <div className="text-[10px] text-white/28 leading-relaxed">
                  <div>Includes desktop app + VS Code extension + CLI</div>
                  <div className="mt-0.5">No cloud connection required. Embeddings are local.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {DESKTOP_FEATURES.map((f) => (
              <div key={f.tag} className="relative px-4 py-3.5" style={{ border: '1px solid rgba(246,185,76,0.1)', background: 'rgba(246,185,76,0.02)' }}>
                <div className="text-[9px] uppercase tracking-[0.22em] text-amber-400/50 mb-1.5">[{f.tag}]</div>
                <div className="text-xs text-white/50 leading-relaxed">{f.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CLI Installation Section ──────────────────────── */}
        <div>
          {/* Section heading */}
          <div className="flex items-center gap-4 mb-5 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Terminal size={14} style={{ color: 'rgba(255,255,255,0.55)' }} />
              <span className="text-[11px] uppercase tracking-[0.28em] font-bold text-white/55">CLI Installation</span>
            </div>
            <span className="text-[9px] text-white/22 uppercase tracking-[0.15em]">Headless · Cargo · Pure Rust</span>
          </div>

          <div className="relative mb-5" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.018)' }}>
            <CornerBracketsSmall color="rgba(255,255,255,0.18)" />
            <div className="p-6 md:p-8">
              <div className="text-[9px] uppercase tracking-[0.28em] text-white/35 mb-5">
                Install via Cargo · {currentPlatform.label}
              </div>
              <div style={{ background: '#0A0D0F', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <code style={{ fontSize: 13, color: '#F6B94C', fontFamily: 'inherit', flex: 1 }}>
                  {installCmd.command}
                </code>
                <button
                  onClick={handleCopy}
                  style={{ color: copied ? '#F6B94C' : 'rgba(255,255,255,0.28)', border: 'none', background: 'none', cursor: 'pointer', padding: 4, transition: 'color 180ms', flexShrink: 0 }}
                  title="Copy"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <div className="text-[10px] text-white/22 space-y-1">
                <div>Requires Rust toolchain — get it at <span className="text-white/38">rustup.rs</span></div>
                <div>Or clone from source: <span className="text-white/32">github.com/ixos-protocol/ixos</span></div>
              </div>
            </div>
          </div>

          {/* Quick start terminal */}
          <div className="relative mb-5" style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#0A0D0F' }}>
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.05]">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <span className="text-[10px] text-amber-400/30 font-mono tracking-widest uppercase ml-2">Quick Start · ixos v0.4.0</span>
            </div>
            <div className="p-5 space-y-3 font-mono text-[12px] leading-[1.9]">
              {[
                { cmd: 'search "auth token refresh" --progressive', hint: 'Stream results as confidence builds' },
                { cmd: 'search "secret leaks" --journalist-mode', hint: 'Ephemeral: no cache, no logs, zero trace' },
                { cmd: 'search "config" --show-scores --json', hint: 'Pipe structured output with full score breakdown' },
                { cmd: 'search "patterns" --cache-mode ephemeral', hint: 'One-shot with no embedding stored to disk' },
              ].map((item, i) => (
                <div key={i}>
                  <div>
                    <span className="text-white/20">$ </span>
                    <span className="text-amber-400">ixos </span>
                    <span className="text-white/60">{item.cmd}</span>
                  </div>
                  <div className="text-white/20 text-xs ml-4"># {item.hint}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {CLI_FEATURES.map((f) => (
              <div key={f.tag} className="relative px-4 py-3.5" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.012)' }}>
                <div className="text-[9px] uppercase tracking-[0.22em] text-white/28 mb-1.5">[{f.tag}]</div>
                <div className="text-xs text-white/42 leading-relaxed">{f.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-10 mt-4 border-t border-white/[0.05]">
          <div className="text-[10px] text-white/22 space-y-0.5">
            <div>Desktop app includes CLI. CLI-only install via Cargo.</div>
            <div>Both include the VS Code extension manifest.</div>
          </div>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400/55 hover:text-amber-400/85 transition-colors"
          >
            Compare plans →
          </a>
        </div>
      </div>
    </div>
  );
}
