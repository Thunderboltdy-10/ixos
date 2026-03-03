"use client";
import { useEffect, useState } from "react";
import { BookOpen, Code, Terminal } from "lucide-react";

function DocsV1() {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans flex p-8 gap-8">
      <aside className="w-64 shrink-0 border-r border-white/10 hidden md:block">
        <h2 className="font-bold text-amber-500 mb-6">Ixos Docs</h2>
        <div className="space-y-3 text-white/50">
          <div className="text-amber-500 font-medium">Getting Started</div>
          <div className="hover:text-white cursor-pointer">Architecture</div>
          <div className="hover:text-white cursor-pointer">CLI Reference</div>
        </div>
      </aside>
      <main className="flex-1 max-w-3xl">
        <h1 className="text-5xl font-bold mb-6">Getting Started</h1>
        <p className="text-xl text-white/50 mb-8">Install and run your first local search.</p>
        <div className="p-6 rounded-xl bg-black/50 border border-white/10 font-mono text-sm mb-8">
          <div className="text-amber-500 mb-2"># Install globally</div>
          <div>npm install -g ixos</div>
          <div className="text-amber-500 mt-4 mb-2"># Index a directory</div>
          <div>ixos index ./my-project</div>
        </div>
        <p className="text-white/70 leading-relaxed mb-6">
          Ixos runs entirely on your local machine. The index is stored securely in your filesystem and never transmitted.
        </p>
      </main>
    </div>
  );
}

function DocsV2() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans">
      <div className="max-w-4xl mx-auto py-32 px-8">
        <h1 className="text-6xl font-semibold tracking-tighter mb-8"><span className="text-teal-400">Documentation</span></h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl hover:bg-white/5 transition-colors cursor-pointer">
            <BookOpen className="w-8 h-8 text-teal-400 mb-4" />
            <h3 className="text-2xl font-medium mb-2">Core Concepts</h3>
            <p className="text-white/40">Learn how the hybrid engine works.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl hover:bg-white/5 transition-colors cursor-pointer">
            <Code className="w-8 h-8 text-teal-400 mb-4" />
            <h3 className="text-2xl font-medium mb-2">API Reference</h3>
            <p className="text-white/40">Integrate Ixos into your tools.</p>
          </div>
        </div>
        <div className="prose prose-invert prose-teal max-w-none">
          <h2>Quick Start</h2>
          <p>Download the binary for your platform and run it. No configuration required.</p>
        </div>
      </div>
    </div>
  );
}

function DocsV3() {
  return (
    <div className="min-h-screen bg-[#0A0D0F] text-[#f3f5f7] font-mono p-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 border-r border-amber-400/20 pr-8">
          <div className="text-amber-400 text-xs uppercase tracking-[0.3em] mb-6">▸ MANUAL</div>
          <ul className="space-y-4 text-xs text-white/50">
            <li className="text-amber-400">1.0_INITIALIZATION</li>
            <li>2.0_EMBEDDINGS</li>
            <li>3.0_SECURITY</li>
          </ul>
        </div>
        <div className="col-span-3 border border-amber-400/20 bg-black/50 p-12 relative">
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-400" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-400" />
          <h1 className="text-3xl font-bold mb-8 uppercase text-amber-400">1.0 Initialization Sequence</h1>
          <p className="mb-6 text-sm text-white/70 leading-relaxed">
            The Ixos engine requires a one-time cold start for the Model2Vec weights. Subsequent invocations use the memory-mapped cache.
          </p>
          <div className="bg-[#0A0D0F] border border-amber-400/10 p-6 text-xs text-amber-400/80 mb-8">
            <span className="text-white/30">$ </span>ixos daemon start<br />
            <span className="text-white/30">$ </span>ixos search "memory map"
          </div>
        </div>
      </div>
    </div>
  );
}

function DocsV4() {
  return (
    <div className="min-h-screen bg-[#04050A] text-white p-8 flex justify-center">
      <div className="max-w-5xl w-full bg-black/40 border border-white/10 rounded-3xl p-12 backdrop-blur-2xl shadow-[0_20px_80px_rgba(124,58,237,0.1)] mt-12">
        <h1 className="text-5xl font-bold mb-12">Documentation</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer">
            <Terminal className="text-violet-400 mb-4" />
            <div className="font-semibold mb-2">CLI Usage</div>
            <div className="text-sm text-white/50">Command line options</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer">
            <Code className="text-blue-400 mb-4" />
            <div className="font-semibold mb-2">Configuration</div>
            <div className="text-sm text-white/50">ixos.toml setup</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer">
            <BookOpen className="text-green-400 mb-4" />
            <div className="font-semibold mb-2">Architecture</div>
            <div className="text-sm text-white/50">How it works</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocsV5() {
  return (
    <div className="min-h-screen bg-[#0C0E10] text-white font-mono p-8">
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-3xl font-bold mb-12">Docs.</h1>
        <div className="border-l border-white/20 pl-8 space-y-12">
          <div>
            <h2 className="text-xl font-bold mb-4 text-teal-400">01 / Setup</h2>
            <p className="text-sm text-white/60 mb-4 leading-relaxed">Download the binary and add it to your PATH. Run `ixos init` in any directory.</p>
            <pre className="p-4 bg-white/[0.02] border border-white/10 text-xs text-amber-400">curl -sL https://ixos.dev/install.sh | bash</pre>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4 text-teal-400">02 / Search</h2>
            <p className="text-sm text-white/60 mb-4 leading-relaxed">Use natural language to find context.</p>
            <pre className="p-4 bg-white/[0.02] border border-white/10 text-xs text-amber-400">ixos search "how does routing work"</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DocsV1, DocsV2, DocsV3, DocsV4, DocsV5 };

export default function DocsPage() {
  const [variant, setVariant] = useState<number>(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ixos_variant');
    if (stored) setVariant(Number(stored));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  switch (variant) {
    case 1: return <DocsV1 />;
    case 2: return <DocsV2 />;
    case 3: return <DocsV3 />;
    case 4: return <DocsV4 />;
    case 5: return <DocsV5 />;
    default: return <DocsV5 />;
  }
}
