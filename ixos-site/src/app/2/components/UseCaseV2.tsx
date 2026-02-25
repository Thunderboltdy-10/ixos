"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Terminal, Code2 } from "lucide-react";

const FULL_COMMAND = `ixos search "jwt validation" --format json | jq '.results[0]'`;

const JSON_OUTPUT = `{
  "file": "src/auth/token.rs",
  "score": 0.945,
  "metrics": {
    "lexical": 0.31,
    "semantic": 0.99
  },
  "snippet": "pub fn validate_jwt(token: &str) -> Result<...>",
  "line": 142
}`;

const RESULT_LINES = JSON_OUTPUT.split("\n");

function TypingTerminal() {
  const [typedChars, setTypedChars] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    setTypedChars(0);
    setShowResults(false);
    setVisibleLines(0);
    setBlink(true);

    const typeTimer = setInterval(() => {
      setTypedChars(prev => {
        if (prev >= FULL_COMMAND.length) {
          clearInterval(typeTimer);
          setTimeout(() => {
            setShowResults(true);
            setBlink(false);
          }, 400);
          return prev;
        }
        return prev + 1;
      });
    }, 40);

    return () => clearInterval(typeTimer);
  }, []);

  useEffect(() => {
    if (!showResults) return;
    const lineTimer = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= RESULT_LINES.length) {
          clearInterval(lineTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(lineTimer);
  }, [showResults]);

  useEffect(() => {
    const blinkTimer = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(blinkTimer);
  }, []);

  return (
    <div className="p-6 font-mono text-xs text-fg-porcelain leading-loose flex-1 overflow-y-auto">
      <div className="flex mb-2 gap-1 flex-wrap items-baseline">
        <span className="text-fg-muted">~/projects/core-api</span>
        <span className="text-accent-amber ml-1">$</span>
        <span className="text-fg-porcelain ml-2 break-all">
          {FULL_COMMAND.slice(0, typedChars)}
          <span
            className="inline-block w-2 h-[13px] align-middle bg-fg-porcelain ml-px"
            style={{ opacity: blink ? 1 : 0, transition: "opacity 0.05s" }}
          />
        </span>
      </div>

      {showResults && (
        <div className="text-fg-muted/80 mt-2">
          {RESULT_LINES.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className="whitespace-pre"
              style={{
                color: line.includes('"score"') || line.includes('"semantic"') ? "#A5D6FF" :
                  line.includes('"file"') ? "#FCD34D" :
                    line.includes('"snippet"') ? "#FF7B72" :
                      undefined
              }}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {visibleLines >= RESULT_LINES.length && showResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex mt-3 gap-1 items-baseline"
        >
          <span className="text-fg-muted">~/projects/core-api</span>
          <span className="text-accent-amber ml-1">$</span>
          <span
            className="inline-block w-2 h-[13px] align-middle bg-fg-porcelain ml-2"
            style={{ opacity: blink ? 1 : 0 }}
          />
        </motion.div>
      )}
    </div>
  );
}

export function UseCaseV2() {
  const [view, setView] = useState<"cli" | "gui">("cli");

  return (
    <section className="py-32 bg-[#0A0D14] border-b border-white/5">
      <SectionDivider accent="amber" label="INTERFACE_MODALITY" />

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row items-start gap-12">

          {/* Left */}
          <div className="w-full lg:w-1/3">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-6"
            >
              From shell to
              <br />
              <span className="text-accent-amber italic">screen.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.07 }}
              className="font-mono text-fg-muted leading-relaxed mb-8"
            >
              Ixos is built as a highly extensible Rust binary. Access its raw power directly via STDIN/STDOUT piping, or use the native GUI overlay for an immersive focus state.
            </motion.p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setView("cli")}
                className={`flex items-center gap-4 p-4 border transition-all cursor-pointer ${
                  view === "cli"
                    ? "border-accent-amber/50 bg-accent-amber/5 text-fg-porcelain"
                    : "border-white/5 bg-white/[0.02] text-fg-muted hover:border-white/10"
                }`}
              >
                <Terminal className={`w-5 h-5 ${view === "cli" ? "text-accent-amber" : ""}`} />
                <div className="text-left">
                  <div className="font-display font-medium">Headless CLI</div>
                  <div className="font-mono text-xs text-fg-muted mt-0.5">Unix pipes & JSON streaming</div>
                </div>
              </button>

              <button
                onClick={() => setView("gui")}
                className={`flex items-center gap-4 p-4 border transition-all cursor-pointer ${
                  view === "gui"
                    ? "border-accent-amber/50 bg-accent-amber/5 text-fg-porcelain"
                    : "border-white/5 bg-white/[0.02] text-fg-muted hover:border-white/10"
                }`}
              >
                <Code2 className={`w-5 h-5 ${view === "gui" ? "text-accent-amber" : ""}`} />
                <div className="text-left">
                  <div className="font-display font-medium">Overlay GUI</div>
                  <div className="font-mono text-xs text-fg-muted mt-0.5">Native window & hotkeys</div>
                </div>
              </button>
            </div>
          </div>

          {/* Right: Dynamic Panel */}
          <div className="w-full lg:w-2/3 h-[440px] bg-[#0A0D14] border border-white/10 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {view === "cli" ? (
                <motion.div
                  key="cli"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col h-full"
                >
                  <div className="h-10 bg-[#161B22] border-b border-white/10 flex items-center px-4 shrink-0">
                    <span className="font-mono text-xs text-fg-muted">zsh — ixos pipe</span>
                  </div>
                  <TypingTerminal />
                </motion.div>
              ) : (
                <motion.div
                  key="gui"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col h-full"
                >
                  <div className="h-10 bg-[#161B22] border-b border-white/10 flex items-center px-4 gap-2 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F56] opacity-60" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E] opacity-60" />
                    <div className="w-3 h-3 rounded-full bg-[#27C93F] opacity-60" />
                    <span className="font-mono text-xs text-fg-muted mx-auto">Ixos Semantic Search</span>
                  </div>
                  <div className="flex-1 p-8 flex flex-col justify-center items-center bg-bg-graphite-1/20">
                    <motion.div
                      initial={{ scale: 0.97, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="w-full max-w-md bg-bg-graphite-0 border border-white/10 rounded-lg overflow-hidden"
                    >
                      <div className="border-b border-white/5 p-4 flex items-center gap-3 bg-bg-graphite-0">
                        <Terminal className="w-4 h-4 text-accent-amber shrink-0" />
                        <span className="font-mono text-sm text-fg-porcelain flex-1">jwt validation</span>
                        <span className="font-mono text-[10px] text-fg-muted bg-bg-graphite-2 border border-white/10 px-1.5 py-0.5 rounded">↵ to open</span>
                      </div>

                      <div className="p-3 flex flex-col gap-2 bg-bg-graphite-1/50">
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="p-3 bg-white/5 border border-accent-amber/30 rounded flex justify-between items-center"
                        >
                          <div>
                            <span className="font-mono text-sm text-fg-porcelain block mb-1">src/auth/token.rs</span>
                            <span className="font-mono text-[10px] text-fg-muted">pub fn validate_jwt(token: &amp;str) -&gt; Result&lt;...&gt;</span>
                          </div>
                          <span className="font-mono text-xs text-accent-amber bg-accent-amber/10 px-2 py-1 border border-accent-amber/20 rounded shrink-0 ml-3">94%</span>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="p-3 border border-white/5 rounded opacity-60"
                        >
                          <span className="font-mono text-sm text-fg-porcelain block mb-1">scripts/verify.sh</span>
                          <span className="font-mono text-[10px] text-fg-muted">curl -H &quot;Authorization: Bearer $JWT&quot; ...</span>
                        </motion.div>
                      </div>

                      <div className="px-4 py-2.5 border-t border-white/5 bg-bg-graphite-0 flex justify-between">
                        <span className="font-mono text-[10px] text-fg-muted">2 results · 29ms</span>
                        <span className="font-mono text-[10px] text-fg-muted">↑↓ navigate · esc close</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
