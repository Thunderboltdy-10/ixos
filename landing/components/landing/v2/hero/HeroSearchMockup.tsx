"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { SearchBar } from "@shared-ui/components/SearchBar";
import { ResultList } from "@shared-ui/components/ResultList";
import type { ResultData } from "@shared-ui/components/ResultCard";

const DEMO_SETS: Array<{ query: string; results: ResultData[] }> = [
  {
    query: "quarterly review March",
    results: [
      {
        filename: "quarterly_review_march.docx",
        directory: "~/Documents/Reports",
        score: 0.92,
        snippet: "Quarterly review highlights margin expansion across March cohorts.",
        tags: ["finance", "Q1"],
      },
      {
        filename: "march_board_minutes.pdf",
        directory: "~/Documents/Meetings",
        score: 0.86,
        snippet: "Board requested a March quarterly review follow-up summary.",
        tags: ["board", "minutes"],
      },
    ],
  },
  {
    query: "privacy policy draft",
    results: [
      {
        filename: "privacy_policy_draft.md",
        directory: "~/Documents/Legal",
        score: 0.9,
        snippet: "Draft privacy policy updates for 2025 compliance review.",
        tags: ["legal"],
      },
      {
        filename: "policy_change_log.txt",
        directory: "~/Documents/Compliance",
        score: 0.74,
        snippet: "Draft privacy policy revisions logged for audit trail.",
        tags: ["audit"],
      },
    ],
  },
];

const DEMO_DIRECTORY = "~/Documents";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function HeroSearchMockup() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [userControlled, setUserControlled] = useState(false);
  const loopRef = useRef(0);

  const palette = {
    accent: "var(--accent-amber)",
    accentSoft: "rgba(246, 185, 76, 0.2)",
    accentStrong: "rgba(246, 185, 76, 0.7)",
  };

  useEffect(() => {
    if (userControlled) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        for (const demo of DEMO_SETS) {
          if (cancelled) return;
          await runSequence(demo.query, demo.results, ++loopRef.current);
          await sleep(1000);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [userControlled]);

  const runSequence = async (text: string, demoResults: ResultData[], loopId: number) => {
    resetSearch();
    await sleep(300);

    for (let i = 1; i <= text.length; i += 1) {
      if (loopRef.current !== loopId) return;
      setQuery(text.slice(0, i));
      await sleep(35 + Math.random() * 30);
    }

    await simulateSearch(demoResults, loopId);
  };

  const simulateSearch = async (demoResults: ResultData[], loopId: number) => {
    if (loopRef.current !== loopId) return;
    setIsSearching(true);
    setStatus("Scanning files");
    setProgress(0.15);

    await sleep(420);
    if (loopRef.current !== loopId) return;
    setStatus("Scanning 126 files");
    setProgress(0.45);

    await sleep(420);
    if (loopRef.current !== loopId) return;
    setStatus("Understanding matches");
    setProgress(0.72);

    await sleep(520);
    if (loopRef.current !== loopId) return;
    setResults(demoResults);
    setStatus(`Found ${demoResults.length} results`);
    setProgress(0.9);

    await sleep(520);
    if (loopRef.current !== loopId) return;
    setStatus("Search complete");
    setProgress(1);
    setIsSearching(false);
  };

  const resetSearch = () => {
    setResults([]);
    setSelectedIndex(-1);
    setProgress(0);
    setIsSearching(false);
    setStatus("Ready");
    setQuery("");
  };

  const handleUserQueryChange = (value: string) => {
    setUserControlled(true);
    loopRef.current += 1;
    resetSearch();
    setQuery(value);
  };

  const handleUserSearch = async () => {
    if (!query.trim()) return;
    setUserControlled(true);
    loopRef.current += 1;
    await simulateSearch(DEMO_SETS[0].results, loopRef.current);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleUserSearch();
    }
  };

  const showResults = results.length > 0;

  return (
    <motion.div
      className="relative overflow-hidden"
      style={{
        background: "var(--v2-bg)",
        borderRadius: "var(--v2-radius-xl)",
        border: "1px solid var(--v2-border)",
        boxShadow: "var(--v2-edge-ring), var(--v2-top-highlight), var(--v2-shadow-deck)",
      }}
      initial={{ opacity: 0, scale: 0.95, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 1,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.6,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 60%)",
        }}
      />

      <div
        className="relative z-10 px-6 py-6"
        data-theme="desktop"
        style={{
          '--font-body': "'IBM Plex Mono', ui-monospace, monospace",
          '--font-display': "'Space Grotesk', system-ui, sans-serif",
          '--font-mono': "'IBM Plex Mono', ui-monospace, monospace",
        } as CSSProperties}
      >
        <div className="relative">
          <SearchBar
            value={query}
            onChange={handleUserQueryChange}
            onKeyDown={handleKeyDown}
            isSearching={isSearching}
            placeholder="Type what you remember..."
            autoFocus={false}
            tone="jit"
            className="rounded-xl"
          />

          <motion.div
            className="absolute -inset-[2px] rounded-2xl pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${palette.accentSoft} 0%, rgba(246, 185, 76, 0.08) 100%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: query.length >= 2 || isSearching ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
        </div>

        <div className="mt-4 rounded-lg overflow-hidden bg-graphite-1 border border-stroke-hairline">
          <div className="px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-fg-muted flex-1 truncate">{status}</span>
            <span className="text-xs text-fg-dim font-mono">{DEMO_DIRECTORY}</span>
          </div>
          <div className="relative h-[3px] w-full overflow-hidden bg-graphite-3">
            <div className="absolute inset-0 bg-graphite-2" />
            <motion.div
              className="absolute top-0 left-0 h-full"
              style={{ backgroundColor: palette.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
            {isSearching && progress < 0.98 && (
              <div className="absolute inset-y-0 right-0 overflow-hidden pointer-events-none" style={{ left: `${progress * 100}%` }}>
                <motion.div
                  className="absolute top-0 h-full"
                  style={{
                    width: '64px',
                    background: `linear-gradient(90deg, transparent, ${palette.accentSoft}, ${palette.accentStrong}, ${palette.accentSoft}, transparent)`,
                    filter: 'blur(1px)',
                  }}
                  initial={{ left: 0 }}
                  animate={{ left: ['0%', 'calc(100% - 64px)'] }}
                  transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                />
              </div>
            )}
          </div>
        </div>

        {showResults && (
          <div className="mt-5 max-h-[320px] overflow-hidden">
            <ResultList
              results={results}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              isDemo
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default HeroSearchMockup;
