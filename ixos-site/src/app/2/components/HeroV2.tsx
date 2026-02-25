"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Search, ChevronRight } from "lucide-react";

function useCounter(target: number) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let c = 0; const step = target / 60;
    const t = setInterval(() => { c += step; if (c >= target) { setCount(target); clearInterval(t); } else setCount(Math.floor(c)); }, 16);
    return () => clearInterval(t);
  }, [inView, target]);
  return { count, ref };
}

const FULL_QUERY = "jwt validation";

// Syntax-colored code lines for the left panel
// Each line: array of { text, color }
type CodeToken = { text: string; color: string };
type CodeLine = { tokens: CodeToken[]; highlighted?: boolean };

const CODE: CodeLine[] = [
  { tokens: [{ text: "use", color: "#C792EA" }, { text: " ixos::search::", color: "#E8EAF0" }, { text: "Engine", color: "#82AAFF" }, { text: ";", color: "#E8EAF0" }] },
  { tokens: [{ text: "use", color: "#C792EA" }, { text: " ixos::models::", color: "#E8EAF0" }, { text: "SearchResult", color: "#82AAFF" }, { text: ";", color: "#E8EAF0" }] },
  { tokens: [] },
  { tokens: [{ text: "pub", color: "#C792EA" }, { text: " ", color: "#E8EAF0" }, { text: "async", color: "#C792EA" }, { text: " ", color: "#E8EAF0" }, { text: "fn", color: "#C792EA" }, { text: " validate_jwt(", color: "#E8EAF0" }] },
  { tokens: [{ text: "    token: &", color: "#E8EAF0" }, { text: "str", color: "#C792EA" }, { text: ",", color: "#E8EAF0" }] },
  { tokens: [{ text: ") -> ", color: "#E8EAF0" }, { text: "Result", color: "#82AAFF" }, { text: "<", color: "#E8EAF0" }, { text: "Claims", color: "#82AAFF" }, { text: ", ", color: "#E8EAF0" }, { text: "AuthError", color: "#82AAFF" }, { text: "> {", color: "#E8EAF0" }] },
  { tokens: [{ text: "    // Search for token validation context", color: "rgba(243,245,247,0.35)", italic: true } as CodeToken & { italic?: boolean }] },
  // highlighted line
  { tokens: [{ text: "    let ctx = ", color: "#E8EAF0" }, { text: "Engine", color: "#82AAFF" }, { text: "::jit()", color: "#E8EAF0" }], highlighted: true },
  { tokens: [{ text: "        .query(", color: "#E8EAF0" }, { text: '"jwt validation"', color: "#C3E88D" }, { text: ")", color: "#E8EAF0" }] },
  { tokens: [{ text: "        .dir(&workspace)", color: "#E8EAF0" }] },
  { tokens: [{ text: "        .run().", color: "#E8EAF0" }, { text: "await", color: "#C792EA" }, { text: "?;", color: "#E8EAF0" }] },
  { tokens: [] },
  { tokens: [{ text: "    match ctx.top() {", color: "#E8EAF0" }] },
  { tokens: [{ text: "        Some", color: "#82AAFF" }, { text: "(r) ", color: "#E8EAF0" }, { text: "if", color: "#C792EA" }, { text: " r.score > 0.9 => {", color: "#E8EAF0" }] },
  { tokens: [{ text: "            verify_with_context(token, r)", color: "#E8EAF0" }] },
  { tokens: [{ text: "        }", color: "#E8EAF0" }] },
  { tokens: [{ text: "        _ => ", color: "#E8EAF0" }, { text: "Err", color: "#82AAFF" }, { text: "(", color: "#E8EAF0" }, { text: "AuthError", color: "#82AAFF" }, { text: "::Insufficient)", color: "#E8EAF0" }] },
  { tokens: [{ text: "    }", color: "#E8EAF0" }] },
];

const LINE_START = 135;

export function HeroV2() {
  const [typedQuery, setTypedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [lineDrawn, setLineDrawn] = useState(false);

  const { count: msCount, ref: msRef } = useCounter(29);
  const { count: filesCount, ref: filesRef } = useCounter(179964);

  useEffect(() => {
    // Draw amber line after short delay
    const lineTimer = setTimeout(() => setLineDrawn(true), 300);
    return () => clearTimeout(lineTimer);
  }, []);

  useEffect(() => {
    let i = 0;
    const timer = setTimeout(() => {
      const typer = setInterval(() => {
        if (i < FULL_QUERY.length) {
          setTypedQuery(FULL_QUERY.slice(0, ++i));
        } else {
          clearInterval(typer);
          setTimeout(() => setShowResults(true), 400);
        }
      }, 45);
      return () => clearInterval(typer);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="min-h-screen bg-[#0E1117] flex flex-col items-center justify-center pt-16 px-6">
      {/* Header text */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <p className="font-mono text-[10px] text-fg-muted uppercase tracking-widest mb-4">
          {"// Ixos v3.2 — Semantic file search"}
        </p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-display font-bold text-fg-porcelain leading-tight"
        >
          Find the right code.
          <br />
          <span className="text-accent-amber italic">In milliseconds.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.07 }}
          className="font-mono text-fg-muted text-base max-w-xl mx-auto mt-4"
        >
          Semantic search that understands intent. Zero index. Zero background daemon. Just fast.
        </motion.p>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="flex gap-4 justify-center mt-8"
        >
          <button className="h-10 px-7 bg-accent-amber hover:bg-[#FCD34D] text-[#0A0D14] font-display font-semibold text-sm transition-colors shadow-[0_0_20px_rgba(246,185,76,0.25)]">
            Download Free
          </button>
          <button className="h-10 px-6 border border-white/15 bg-white/5 hover:bg-white/10 transition-all font-mono text-sm text-fg-muted hover:text-fg-porcelain flex items-center gap-2">
            View CLI Docs
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </div>

      {/* MAIN SPLIT DEMO */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.21 }}
        className="w-full max-w-6xl mx-auto"
      >
        <div className="bg-[#0A0D14] border border-white/10 flex flex-col lg:flex-row" style={{ height: "460px" }}>

          {/* LEFT PANEL — code editor */}
          <div className="flex-1 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col min-h-0">
            {/* Tab bar */}
            <div className="h-9 bg-[#161B22] border-b border-white/10 flex items-center px-4 gap-1 shrink-0">
              <div className="bg-bg-graphite-2 px-3 py-1 font-mono text-xs text-fg-porcelain border-t border-t-accent-amber/60 border-x border-b-0 border-white/10">
                token.rs
              </div>
              <div className="px-3 py-1 font-mono text-xs text-fg-muted/50 hover:text-fg-muted cursor-pointer transition-colors">
                middleware.rs
              </div>
            </div>

            {/* Code content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex-1 p-5 font-mono text-xs leading-relaxed overflow-hidden"
            >
              <div className="flex gap-4 h-full">
                {/* Line numbers */}
                <div className="flex flex-col text-[10px] text-fg-muted/30 select-none shrink-0 gap-0.5">
                  {CODE.map((_, i) => (
                    <div key={i} className="leading-[1.6]">{LINE_START + i}</div>
                  ))}
                </div>

                {/* Code lines */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  {CODE.map((line, i) => (
                    <div
                      key={i}
                      className={`leading-[1.6] whitespace-pre ${
                        line.highlighted
                          ? "bg-accent-amber/[0.08] border-l-2 border-l-accent-amber -mx-5 px-5"
                          : ""
                      }`}
                    >
                      {line.tokens.length === 0 ? "\u00a0" : line.tokens.map((tok, ti) => (
                        <span
                          key={ti}
                          style={{
                            color: tok.color,
                            fontStyle: (tok as CodeToken & { italic?: boolean }).italic ? "italic" : "normal",
                          }}
                        >
                          {tok.text}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Status bar */}
            <div className="h-6 bg-[#161B22] border-t border-white/10 flex items-center px-4 gap-4 shrink-0 font-mono text-[10px] text-fg-muted/50">
              <span>Rust</span>
              <span className="text-fg-muted/20">|</span>
              <span>token.rs</span>
              <span className="ml-auto">Ln 142, Col 24</span>
            </div>
          </div>

          {/* CENTER AMBER SEPARATOR (desktop only) */}
          <div className="hidden lg:block relative w-0 overflow-visible shrink-0">
            <div className="absolute top-0 left-0 w-px h-full">
              <motion.div
                className="absolute top-0 left-0 w-full"
                initial={{ height: 0 }}
                animate={{ height: lineDrawn ? "100%" : 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                style={{ background: "rgba(246,185,76,0.20)" }}
              />
            </div>
          </div>

          {/* RIGHT PANEL — search results */}
          <div className="w-full lg:w-80 xl:w-96 flex flex-col shrink-0">
            {/* Search bar */}
            <div className="h-12 bg-[#161B22] border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
              <Search className="w-4 h-4 text-fg-muted/50 shrink-0" />
              <span className="font-mono text-sm text-fg-porcelain flex-1">
                {typedQuery}
                {typedQuery.length < FULL_QUERY.length && (
                  <span className="inline-block w-2 h-4 bg-fg-porcelain ml-px animate-pulse align-middle" />
                )}
                {typedQuery.length === FULL_QUERY.length && (
                  <span className="inline-block w-2 h-4 bg-fg-porcelain ml-px animate-pulse align-middle" />
                )}
              </span>
            </div>

            {/* Results */}
            <div className="flex-1 p-4 flex flex-col gap-2 overflow-hidden">
              <AnimatePresence>
                {showResults && (
                  <>
                    {/* Result 1 — top amber highlight */}
                    <motion.div
                      key="r1"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0 }}
                      className="bg-accent-amber/[0.04] border border-accent-amber/25 p-3"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-sm text-fg-porcelain font-medium truncate">src/auth/token.rs</span>
                        <span className="font-mono text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-2 py-0.5 shrink-0 ml-2">94%</span>
                      </div>
                      <div className="font-mono text-[11px] text-fg-muted mt-1 truncate">
                        pub async fn validate_jwt(token: &amp;str) -&gt; Result&lt;Claims, AuthError&gt;
                      </div>
                      <div className="flex gap-3 mt-2">
                        <span className="font-mono text-[10px] text-fg-muted bg-white/5 px-1.5 py-0.5">[lexical: 31%]</span>
                        <span className="font-mono text-[10px] text-fg-muted bg-white/5 px-1.5 py-0.5">[semantic: 99%]</span>
                      </div>
                    </motion.div>

                    {/* Result 2 — dimmed */}
                    <motion.div
                      key="r2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 0.6, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.07 }}
                      className="bg-transparent border border-white/5 p-3"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-sm text-fg-porcelain truncate">scripts/verify_jwt.sh</span>
                        <span className="font-mono text-xs text-fg-muted bg-white/5 border border-white/10 px-2 py-0.5 shrink-0 ml-2">71%</span>
                      </div>
                      <div className="font-mono text-[11px] text-fg-muted mt-1 truncate">
                        curl -H &quot;Authorization: Bearer $JWT&quot; ...
                      </div>
                    </motion.div>

                    {/* Result 3 — more dimmed */}
                    <motion.div
                      key="r3"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 0.4, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.14 }}
                      className="bg-transparent border border-white/5 p-3"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-sm text-fg-porcelain truncate">src/middleware/auth_guard.rs</span>
                        <span className="font-mono text-xs text-fg-muted bg-white/5 border border-white/10 px-2 py-0.5 shrink-0 ml-2">65%</span>
                      </div>
                      <div className="font-mono text-[11px] text-fg-muted mt-1 truncate">
                        fn apply_auth_guard(token: &amp;str) -&gt; bool
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Stats bar */}
            <div className="h-8 bg-[#161B22] border-t border-white/10 flex items-center px-4 gap-4 shrink-0 font-mono text-[10px] text-fg-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F] shrink-0" />
              <span className="text-accent-amber">29ms</span>
              <span className="text-fg-muted/30">·</span>
              <span>179,964 files</span>
              <span className="text-fg-muted/30">·</span>
              <span>0MB idle</span>
            </div>
          </div>
        </div>

        {/* Three stats below demo */}
        <div className="mt-8 max-w-3xl mx-auto grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-bg-graphite-1 border border-white/5">
            <div ref={msRef} className="font-display text-3xl text-fg-porcelain">
              {msCount}ms
            </div>
            <div className="font-mono text-[10px] text-fg-muted uppercase tracking-widest mt-1">P50 Latency</div>
          </div>
          <div className="p-4 bg-bg-graphite-1 border border-white/5">
            <div className="font-display text-3xl text-fg-porcelain">0MB</div>
            <div className="font-mono text-[10px] text-fg-muted uppercase tracking-widest mt-1">Idle RAM</div>
          </div>
          <div className="p-4 bg-bg-graphite-1 border border-white/5">
            <div ref={filesRef} className="font-display text-3xl text-fg-porcelain">
              {filesCount.toLocaleString()}
            </div>
            <div className="font-mono text-[10px] text-fg-muted uppercase tracking-widest mt-1">Files Indexed</div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
