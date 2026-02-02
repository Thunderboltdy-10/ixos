import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { useSearchStore } from '@/stores/searchStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { cn } from '@/lib/utils';

function formatDuration(ms: number) {
  const seconds = Math.max(0, ms / 1000);
  return `${seconds.toFixed(1)}s`;
}

export function SearchDeck() {
  const underlineRef = useRef<HTMLDivElement>(null);
  const setDeckUnderlineBox = useLayoutStore((s) => s.setDeckUnderlineBox);

  // Store selectors
  const phase = useSearchStore((s) => s.phase);
  const streamStats = useSearchStore((s) => s.streamStats);
  const streamStage = useSearchStore((s) => s.streamStage);
  const statusFromStore = useSearchStore((s) => s.statusMessage);
  const searchStartTime = useSearchStore((s) => s.searchStartTime);
  const cacheMode = useSearchStore((s) => s.cacheMode);
  const journalistMode = useSearchStore((s) => s.journalistMode);
  const lexicalResults = useSearchStore((s) => s.lexicalResults);
  const semanticResults = useSearchStore((s) => s.semanticResults);
  const hasSearchIntent = useSearchStore((s) => s.hasSearchIntent);
  const scanTrail = useSearchStore((s) => s.scanTrail);

  // Local state
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalElapsedMs, setFinalElapsedMs] = useState<number | null>(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Derived state
  const isActive = phase === 'lexical' || phase === 'semantic' || phase === 'refining';
  const isComplete = phase === 'complete';
  const shouldShow = hasSearchIntent || isActive || isComplete;
  const resultCount = semanticResults.length > 0 ? semanticResults.length : lexicalResults.length;
  const mode = journalistMode ? 'journalist' : cacheMode;

  const modePalette = {
    jit: {
      accent: 'var(--accent-amber)',
      accentSoft: 'rgba(246, 185, 76, 0.2)',
      accentStrong: 'rgba(246, 185, 76, 0.7)',
    },
    cache: {
      accent: 'var(--accent-teal)',
      accentSoft: 'rgba(20, 184, 166, 0.2)',
      accentStrong: 'rgba(20, 184, 166, 0.7)',
    },
    journalist: {
      accent: 'var(--accent-violet)',
      accentSoft: 'rgba(124, 92, 255, 0.2)',
      accentStrong: 'rgba(124, 92, 255, 0.7)',
    },
  } as const;

  const activePalette = modePalette[mode];

  // Progress calculation
  const progress = useMemo(() => {
    if (isComplete) return 1;
    if (!isActive && hasSearchIntent) return 0.05;
    const stats = streamStats ?? { filesScanned: 0, candidates: 0, embedded: 0, cacheHits: 0 };
    // Better progress estimation based on phase and stats
    if (phase === 'semantic' || phase === 'refining') {
      if (stats.embedded > 0) return 0.5 + Math.min(0.4, stats.embedded / 100 * 0.4);
      return 0.5;
    }
    if (phase === 'lexical') {
      if (stats.candidates > 0) return 0.2 + Math.min(0.3, stats.candidates / 200 * 0.3);
      if (stats.filesScanned > 0) return 0.1 + Math.min(0.1, stats.filesScanned / 500 * 0.1);
      return 0.1;
    }
    return 0.1;
  }, [isComplete, isActive, hasSearchIntent, streamStats, phase]);

  // Smoothly animate progress
  useEffect(() => {
    if (isComplete) {
      setAnimatedProgress(1);
    } else if (!shouldShow) {
      setAnimatedProgress(0);
    } else {
      // Only animate forward, never backward (except reset)
      setAnimatedProgress(prev => Math.max(prev, progress));
    }
  }, [progress, isComplete, shouldShow]);

  // Measure underline position
  useEffect(() => {
    if (!underlineRef.current) return;

    const measure = () => {
      const rect = underlineRef.current?.getBoundingClientRect();
      if (rect) {
        setDeckUnderlineBox({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
        });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(underlineRef.current);

    return () => observer.disconnect();
  }, [setDeckUnderlineBox]);

  // Determine if we have results (timer should freeze when first results arrive)
  const hasResults = semanticResults.length > 0 || lexicalResults.length > 0;

  // Freeze elapsed time when first results arrive (not just on completion)
  useEffect(() => {
    // Freeze timer when results arrive OR when complete
    if ((hasResults || isComplete) && finalElapsedMs === null && searchStartTime) {
      setFinalElapsedMs(Date.now() - searchStartTime);
    }
    // Reset for next search
    if (!isComplete && !isActive && !hasSearchIntent) {
      setFinalElapsedMs(null);
    }
  }, [isComplete, isActive, hasSearchIntent, searchStartTime, finalElapsedMs, hasResults]);

  // Elapsed time tracking (stop when results arrive or complete)
  useEffect(() => {
    if (!shouldShow || !searchStartTime || isComplete || hasResults) return;

    setElapsedMs(Date.now() - searchStartTime);
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - searchStartTime);
    }, 100);

    return () => window.clearInterval(timer);
  }, [shouldShow, searchStartTime, isComplete, hasResults]);

  // Use frozen time for complete state
  const displayElapsedMs = finalElapsedMs ?? elapsedMs;

  // Status message
  const statusMessage = useMemo(() => {
    if (statusFromStore) return statusFromStore;
    if (isComplete) return 'Search complete';
    if (!isActive && hasSearchIntent) return 'Starting search...';

    const stats = streamStats ?? { filesScanned: 0, candidates: 0, embedded: 0 };

    if (stats.embedded > 0) return `Processing ${stats.embedded} files...`;
    if (stats.candidates > 0) return `Found ${stats.candidates} candidates...`;
    if (stats.filesScanned > 0) return `Scanning ${stats.filesScanned} files...`;

    return 'Initializing...';
  }, [isActive, isComplete, hasSearchIntent, streamStats, statusFromStore]);

  // Mode badge text
  const modeBadge = useMemo(() => {
    if (journalistMode) return 'Secure';
    return cacheMode === 'cache' ? 'Cache' : 'JIT';
  }, [journalistMode, cacheMode]);

  const streamStatsSafe = streamStats ?? { filesScanned: 0, candidates: 0, embedded: 0, cacheHits: 0 };
  const stageLabel = streamStage
    ? streamStage.charAt(0).toUpperCase() + streamStage.slice(1)
    : 'Boot';
  const trailLabel = scanTrail.length > 0
    ? scanTrail.slice(-3).map((item) => item.split(/[/\\\\]/).pop() || item).join(' - ')
    : '';

  if (!shouldShow) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="w-full mt-4 rounded-lg overflow-hidden bg-graphite-1 border border-stroke-hairline"
    >
      {/* Status bar */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Status icon */}
        {isSearching() ? (
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: activePalette.accent }} />
        ) : isComplete ? (
          <Check className="w-4 h-4 text-success flex-shrink-0" />
        ) : null}

        {/* Status message */}
        <span className="text-sm text-fg-muted flex-1 truncate">{statusMessage}</span>

        {/* Metrics */}
        <div className="flex items-center gap-3 text-xs text-fg-dim font-mono">
          {resultCount > 0 && (
            <span className="tabular-nums">{resultCount} results</span>
          )}
          {displayElapsedMs > 0 && (
            <span className="tabular-nums">{formatDuration(displayElapsedMs)}</span>
          )}
          <span className={cn(
            "px-1.5 py-0.5 rounded text-2xs uppercase tracking-wider",
            mode === 'jit'
              ? "text-accent-amber"
              : mode === 'cache'
                ? "text-accent-teal"
                : "text-accent-violet"
          )}>
            {modeBadge}
          </span>
        </div>
      </div>

      <div className="px-4 pb-3 -mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-fg-dim font-mono">
        <span className="uppercase tracking-[0.2em] text-fg-ghost">Live</span>
        <span>{stageLabel}</span>
        <span className="tabular-nums">{streamStatsSafe.filesScanned} scanned</span>
        <span className="tabular-nums">{streamStatsSafe.candidates} candidates</span>
        <span className="tabular-nums">{streamStatsSafe.embedded} embedded</span>
        {streamStatsSafe.cacheHits > 0 && (
          <span className="tabular-nums">{streamStatsSafe.cacheHits} cache hits</span>
        )}
        {trailLabel && (
          <span className="text-fg-ghost truncate max-w-[40%]">Last: {trailLabel}</span>
        )}
      </div>

      {/* Progress underline */}
      <div
        ref={underlineRef}
        className="relative h-[3px] w-full overflow-hidden bg-graphite-3"
      >
        {/* Background track */}
        <div className="absolute inset-0 bg-graphite-2" />

        {/* Progress fill - solid amber bar */}
        <motion.div
          className="absolute top-0 left-0 h-full"
          style={{
            backgroundColor: isComplete ? 'var(--accent-success)' : activePalette.accent,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${animatedProgress * 100}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Electric sweep animation - moves within remaining distance */}
        {isActive && animatedProgress < 0.98 && (
          <div
            className="absolute inset-y-0 right-0 overflow-hidden pointer-events-none"
            style={{ left: `${animatedProgress * 100}%` }}
          >
            <motion.div
              className="absolute top-0 h-full"
              style={{
                width: '64px',
                background: `linear-gradient(90deg, transparent, ${activePalette.accentSoft}, ${activePalette.accentStrong}, ${activePalette.accentSoft}, transparent)`,
                filter: 'blur(1px)',
              }}
              initial={{ left: 0 }}
              animate={{
                left: ['0%', 'calc(100% - 64px)'],
              }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut'
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );

  function isSearching() {
    return isActive || (hasSearchIntent && !isComplete);
  }
}
