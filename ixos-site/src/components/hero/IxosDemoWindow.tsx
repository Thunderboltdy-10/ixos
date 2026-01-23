"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFakeSearch, DEMO_QUERIES, type DemoFile } from './fakeSearch';

/**
 * Interactive Ixos demo for the landing page hero section
 * - Auto-cycles through curated queries
 * - User can click to type their own query
 */
export function IxosDemoWindow() {
  const [queryIndex, setQueryIndex] = useState(0);
  const [userQuery, setUserQuery] = useState<string | null>(null);
  const [isUserMode, setIsUserMode] = useState(false);
  const [typedText, setTypedText] = useState('');
  const { search, results, isSearching, reset } = useFakeSearch();

  // Get current query
  const currentDemoQuery = DEMO_QUERIES[queryIndex].query;
  const displayQuery = isUserMode ? (userQuery || '') : typedText;

  // Auto-cycle through demo queries
  useEffect(() => {
    if (isUserMode) return;

    const timer = setInterval(() => {
      setQueryIndex(i => (i + 1) % DEMO_QUERIES.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [isUserMode]);

  // Typing animation for auto-cycle mode
  useEffect(() => {
    if (isUserMode) return;

    // Reset typed text when query changes
    setTypedText('');
    reset();

    let charIndex = 0;
    const timer = setInterval(() => {
      if (charIndex <= currentDemoQuery.length) {
        setTypedText(currentDemoQuery.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(timer);
        // Trigger search after typing is complete
        search(currentDemoQuery);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [queryIndex, isUserMode, currentDemoQuery, search, reset]);

  // Handle user input
  const handleFocus = useCallback(() => {
    setIsUserMode(true);
    setUserQuery('');
    reset();
  }, [reset]);

  const handleBlur = useCallback(() => {
    // Resume auto-cycle after delay if user didn't type anything meaningful
    setTimeout(() => {
      if (!userQuery || userQuery.length < 2) {
        setIsUserMode(false);
        setUserQuery(null);
      }
    }, 2000);
  }, [userQuery]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserQuery(value);
    if (value.length >= 2) {
      search(value);
    } else {
      reset();
    }
  }, [search, reset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsUserMode(false);
      setUserQuery(null);
    }
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-bg-graphite-0 min-h-[400px]">
      {/* Search bar area */}
      <div className="p-4 lg:p-5 pb-2">
        <div
          className={cn(
            "relative bg-bg-graphite-2/80 border rounded-xl transition-all duration-200",
            isSearching || displayQuery
              ? "border-accent-teal/50 shadow-[0_0_20px_rgba(20,184,166,0.15)]"
              : "border-stroke-hairline hover:border-white/20"
          )}
        >
          <div className="flex items-center px-4 py-3.5 gap-3">
            {/* Search icon / Loading spinner */}
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-accent-teal animate-spin flex-shrink-0" />
            ) : (
              <Search
                className={cn(
                  "w-5 h-5 transition-colors flex-shrink-0",
                  displayQuery ? "text-accent-teal" : "text-fg-muted opacity-50"
                )}
              />
            )}

            {/* Input */}
            <input
              type="text"
              value={displayQuery}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={isUserMode ? "Try your own query..." : ""}
              className={cn(
                "flex-1 bg-transparent text-fg-porcelain font-sans text-base",
                "placeholder:text-fg-muted/50",
                "focus:outline-none",
                !isUserMode && "cursor-pointer caret-transparent"
              )}
              readOnly={!isUserMode}
            />

            {/* Typing cursor for auto mode */}
            {!isUserMode && typedText.length < currentDemoQuery.length && (
              <motion.span
                className="w-0.5 h-5 bg-accent-teal"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
        </div>

        {/* Click hint */}
        {!isUserMode && (
          <p className="text-[11px] text-fg-muted/40 mt-2 text-center">
            Click to try your own search
          </p>
        )}
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-hidden px-2 pb-2">
        <AnimatePresence mode="popLayout">
          {results.map((result, i) => (
            <DemoResultCard key={`${result.directory}/${result.filename}`} result={result} index={i} />
          ))}
        </AnimatePresence>

        {/* Empty state during typing */}
        {!isSearching && results.length === 0 && displayQuery && displayQuery.length >= 2 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-fg-muted/50 text-sm py-8"
          >
            No matches found
          </motion.p>
        )}
      </div>
    </div>
  );
}

/**
 * Simplified result card for demo
 */
function DemoResultCard({ result, index }: { result: DemoFile; index: number }) {
  const scorePercent = Math.round(result.score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        "px-3 py-2.5 rounded-md mb-1",
        "bg-bg-graphite-1/50 hover:bg-bg-graphite-1",
        "border border-transparent hover:border-stroke-hairline",
        "transition-colors duration-150"
      )}
    >
      <div className="flex items-center gap-3">
        <FileText
          className={cn(
            "w-4 h-4 flex-shrink-0",
            scorePercent >= 90 ? "text-accent-teal" : "text-fg-muted/50"
          )}
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-fg-porcelain truncate">{result.filename}</p>
          <p className="text-xs text-fg-muted/50 truncate font-mono">{result.directory}</p>
        </div>

        <span
          className={cn(
            "text-xs font-mono tabular-nums",
            scorePercent >= 90
              ? "text-accent-amber"
              : scorePercent >= 75
              ? "text-accent-teal"
              : "text-fg-muted/60"
          )}
        >
          {scorePercent}%
        </span>
      </div>
    </motion.div>
  );
}
