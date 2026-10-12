"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";
import { CLI_INSTALL_COMMANDS, type InstallOs } from "@/lib/downloads";

const CLI_EXAMPLES = [
  {
    cmd: 'search "authentication token refresh" --dir . --profile code',
    hint: "Find source files by meaning and keywords",
  },
  {
    cmd: 'search "cell growth" --dir ./papers --profile documents --json',
    hint: "Print ranked document results as JSON",
  },
  {
    cmd: 'grep "fn refresh" --dir . --fixed',
    hint: "Find an exact source pattern",
  },
  {
    cmd: "mcp --dir . --profile code",
    hint: "Serve search, grep and read tools over stdio",
  },
];
const FEATURES = [
  {
    title: "Hybrid search",
    desc: "Combine full-text BM25 with static embeddings, or choose either mode.",
    color: "#F6B94C",
  },
  {
    title: "JSON output",
    desc: "File paths, ranking scores and source snippets for scripts and AI clients.",
    color: "#14B8A6",
  },
  {
    title: "MCP tools",
    desc: "Keep the engine resident between search, grep and read calls.",
    color: "#7C5CFF",
  },
  {
    title: "Cache management",
    desc: "Inspect records. Clear them with a dry run first and explicit confirmation.",
    color: "#F6B94C",
  },
];

function InstallBlock() {
  const [os, setOs] = useState<InstallOs>("windows");
  const [copied, setCopied] = useState(false);
  const cmd = CLI_INSTALL_COMMANDS[os];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cmd.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="border border-amber-400/15 bg-[#0A0D0F] overflow-hidden">
      {/* OS tabs */}
      <div className="flex border-b border-white/8">
        {(["windows", "macos", "linux"] as const).map((o) => (
          <button
            key={o}
            onClick={() => setOs(o)}
            className={`px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${
              os === o
                ? "text-amber-400 bg-amber-400/8 border-b-2 border-amber-400"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {o === "macos" ? "macOS" : o.charAt(0).toUpperCase() + o.slice(1)}
          </button>
        ))}
      </div>

      {/* Command */}
      <div className="p-5">
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
            {cmd.shell}
          </span>
          <button
            onClick={handleCopy}
            className="text-[10px] font-mono text-amber-400/80 hover:text-amber-400 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="font-mono text-sm text-white/90 bg-white/[0.04] border border-white/10 p-4 overflow-x-auto">
          <span className="text-white/50">$ </span>
          {cmd.command}
        </div>
      </div>
    </div>
  );
}

export default function CLIPage() {
  return (
    <div
      className="relative min-h-screen text-[#f3f5f7] selection:bg-amber-400/30"
      style={{ overflowX: "clip" }}
    >
      <main className="relative z-10">
        {/* Hero */}
        <section className="relative pt-36 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/60 mb-6">
                ▸ Command Line Interface
              </p>
              <h1
                className="text-4xl md:text-6xl font-semibold font-display text-white mb-6"
                style={{ letterSpacing: "-0.03em", lineHeight: 1.08 }}
              >
                The Ixos CLI.
              </h1>
              <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed mb-12">
                Scriptable local search from your terminal. Pipe results, export
                JSON, and integrate into any workflow.
              </p>
            </motion.div>

            {/* Install */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              <InstallBlock />
            </motion.div>
          </div>
        </section>

        {/* Usage examples */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <FadeInView direction="up">
              <div className="text-center mb-12">
                <h2
                  className="text-3xl md:text-4xl font-semibold font-display text-white"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  Usage
                </h2>
              </div>
            </FadeInView>

            <FadeInView direction="up" delay={100}>
              <div className="border border-amber-400/8 bg-[#0A0D0F] overflow-hidden relative">
                <CornerBrackets size={14} color="rgba(246,185,76,0.12)" />
                <div className="flex items-center gap-3 px-5 py-3 border-b border-amber-400/8 bg-amber-400/[0.02]">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-white/10" />
                    <span className="w-3 h-3 rounded-full bg-white/10" />
                    <span className="w-3 h-3 rounded-full bg-white/10" />
                  </div>
                  <span className="font-mono text-xs text-amber-400/60 ml-2 uppercase tracking-widest">
                    ixos — terminal
                  </span>
                </div>

                <div className="p-6 font-mono text-[13px] leading-[2.2] space-y-4">
                  {CLI_EXAMPLES.map((item, i) => (
                    <div key={i}>
                      <div>
                        <span className="text-white/50">$ </span>
                        <span className="text-amber-400">ixos</span>
                        <span className="text-white/90"> {item.cmd}</span>
                      </div>
                      <div className="text-white/50 ml-4 text-xs mt-0.5">
                        # {item.hint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInView>
          </div>
        </section>

        {/* Feature cards */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <FadeInView direction="up">
              <div className="text-center mb-14">
                <h2
                  className="text-3xl md:text-4xl font-semibold font-display text-white"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  CLI Features
                </h2>
              </div>
            </FadeInView>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {FEATURES.map((f, i) => (
                <FadeInView key={f.title} direction="up" delay={i * 80}>
                  <div
                    className="relative p-7 border h-full"
                    style={{
                      borderColor: `${f.color}20`,
                      background: `${f.color}04`,
                    }}
                  >
                    <CornerBrackets size={10} color={`${f.color}25`} />
                    <h3
                      className="text-lg font-semibold font-display mb-2"
                      style={{ color: f.color }}
                    >
                      {f.title}
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </FadeInView>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="max-w-xl mx-auto text-center">
            <FadeInView direction="up">
              <Link
                href="/download"
                className="inline-block px-8 py-3.5 bg-amber-400 text-[#0A0D0F] font-semibold text-sm hover:bg-amber-300 transition-colors"
              >
                Download the Desktop App
              </Link>
              <p className="mt-4 text-xs text-white/25 font-mono">
                Download a CLI binary from Releases, or build it from the
                repository with the command above.
              </p>
            </FadeInView>
          </div>
        </section>
      </main>
    </div>
  );
}
