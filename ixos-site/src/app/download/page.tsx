"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Terminal, Apple, Monitor } from "lucide-react";

function DownloadV1() {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans flex flex-col items-center justify-center p-8">
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
      <div className="max-w-3xl w-full relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-amber-500/80">Command Center / Download</span>
        </div>
        <h1 className="text-5xl font-bold mb-6">Install Ixos Core.</h1>
        <p className="text-xl text-white/50 mb-12 max-w-xl leading-relaxed">
          The fastest local-first search engine. Available for all major platforms.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { os: "macOS", icon: Apple, arch: "Apple Silicon & Intel" },
            { os: "Windows", icon: Monitor, arch: "Windows 10/11 x64" },
            { os: "Linux", icon: Terminal, arch: "AppImage & .deb" }
          ].map(platform => (
            <motion.button
              key={platform.os}
              whileHover={{ y: -4, borderColor: "rgba(245,158,11,0.4)" }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left relative overflow-hidden group"
            >
              <platform.icon className="w-8 h-8 text-amber-500 mb-4" />
              <h3 className="text-xl font-semibold mb-1">{platform.os}</h3>
              <p className="text-xs text-white/40 mb-6">{platform.arch}</p>
              <div className="text-sm font-mono text-amber-500 group-hover:underline">Download &rarr;</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DownloadV2() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl w-full text-center relative z-10">
        <h1 className="text-6xl md:text-8xl font-semibold tracking-tighter mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-white/40">Frictionless</span><br />installation.
        </h1>
        <p className="text-lg text-white/40 mb-12 max-w-lg mx-auto font-light">Zero dependencies. Zero configuration. Just download and search.</p>
        <div className="inline-flex flex-col items-center p-1 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex gap-2 p-2">
            <button className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium">macOS</button>
            <button className="px-6 py-3 rounded-xl text-white/50 hover:bg-white/5">Windows</button>
            <button className="px-6 py-3 rounded-xl text-white/50 hover:bg-white/5">Linux</button>
          </div>
          <div className="w-full p-8 border-t border-white/5 flex flex-col items-center">
            <Download className="w-12 h-12 text-teal-400 mb-4" />
            <div className="text-2xl font-medium mb-2">Download for macOS</div>
            <div className="text-sm text-white/40 mb-6">Universal Binary (dmg) - 42MB</div>
            <button className="w-full py-4 rounded-xl bg-teal-400 text-black font-semibold hover:bg-teal-300 transition-colors">
              Start Download
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DownloadV3() {
  return (
    <div className="min-h-screen bg-[#0A0D0F] text-[#f3f5f7] font-mono flex flex-col items-center justify-center p-8 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-amber-400/20">
        <motion.div className="h-full bg-amber-400" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.5 }} />
      </div>
      <div className="max-w-2xl w-full border border-amber-400/10 bg-black/50 p-10 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-400" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-400" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-400" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-400" />

        <div className="text-amber-400 text-xs uppercase tracking-[0.3em] mb-6">▸ Acquistion Protocol</div>
        <h1 className="text-4xl font-bold mb-6">DOWNLOAD_IXOS</h1>
        <div className="space-y-4 mb-10">
          <div className="flex justify-between border-b border-white/5 py-3">
            <span className="text-white/40">TARGET</span>
            <span className="text-white">macOS (Darwin)</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-3">
            <span className="text-white/40">CHECKSUM</span>
            <span className="text-amber-400 text-xs">e3b0c44298fc1c14</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-3">
            <span className="text-white/40">STATUS</span>
            <span className="text-green-400 text-xs">READY_FOR_TRANSFER</span>
          </div>
        </div>
        <button className="w-full py-4 bg-amber-400 text-black font-bold uppercase tracking-widest hover:bg-amber-300">
          Initialize Transfer
        </button>
      </div>
    </div>
  );
}

function DownloadV4() {
  return (
    <div className="min-h-screen bg-[#04050A] text-white flex items-center justify-center p-8 perspective-1000">
      <motion.div
        initial={{ rotateX: 20, y: 50, opacity: 0 }}
        animate={{ rotateX: 0, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-4xl bg-gradient-to-br from-violet-500/10 to-blue-500/5 border border-white/10 rounded-3xl p-12 backdrop-blur-2xl shadow-[0_40px_100px_rgba(124,58,237,0.1)] relative"
      >
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/20 blur-[100px] rounded-full pointer-events-none" />
        <h1 className="text-5xl font-bold mb-4">Desktop App</h1>
        <p className="text-xl text-white/60 mb-10">Experience the spatial canvas.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-black/40 border border-white/5 hover:border-violet-500/30 transition-colors cursor-pointer group">
            <Apple className="w-10 h-10 mb-4 text-white/80 group-hover:text-violet-400" />
            <div className="text-2xl font-medium mb-2">macOS</div>
            <div className="text-white/40">Requires macOS 12+</div>
          </div>
          <div className="p-8 rounded-2xl bg-black/40 border border-white/5 hover:border-blue-500/30 transition-colors cursor-pointer group">
            <Monitor className="w-10 h-10 mb-4 text-white/80 group-hover:text-blue-400" />
            <div className="text-2xl font-medium mb-2">Windows</div>
            <div className="text-white/40">Requires Windows 10+</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DownloadV5() {
  return (
    <div className="min-h-screen bg-[#0C0E10] text-white font-mono flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <h1 className="text-3xl font-bold mb-8">Download.</h1>
        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center gap-4">
              <Apple className="w-6 h-6 text-teal-400" />
              <div className="text-left">
                <div className="font-semibold text-lg">macOS</div>
                <div className="text-xs text-white/40">Universal Binary</div>
              </div>
            </div>
            <Download className="w-5 h-5 text-white/20" />
          </button>
          <button className="w-full flex items-center justify-between p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center gap-4">
              <Monitor className="w-6 h-6 text-amber-400" />
              <div className="text-left">
                <div className="font-semibold text-lg">Windows</div>
                <div className="text-xs text-white/40">x64 Installer</div>
              </div>
            </div>
            <Download className="w-5 h-5 text-white/20" />
          </button>
          <button className="w-full flex items-center justify-between p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center gap-4">
              <Terminal className="w-6 h-6 text-violet-400" />
              <div className="text-left">
                <div className="font-semibold text-lg">Linux</div>
                <div className="text-xs text-white/40">AppImage</div>
              </div>
            </div>
            <Download className="w-5 h-5 text-white/20" />
          </button>
        </div>
      </div>
    </div>
  );
}

export { DownloadV1, DownloadV2, DownloadV3, DownloadV4, DownloadV5 };

export default function DownloadPage() {
  const [variant, setVariant] = useState<number>(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ixos_variant');
    if (stored) setVariant(Number(stored));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  switch (variant) {
    case 1: return <DownloadV1 />;
    case 2: return <DownloadV2 />;
    case 3: return <DownloadV3 />;
    case 4: return <DownloadV4 />;
    case 5: return <DownloadV5 />;
    default: return <DownloadV5 />;
  }
}
