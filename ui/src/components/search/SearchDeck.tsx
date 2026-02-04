import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MessageCircleQuestion } from 'lucide-react';
import { useSearchStore } from '@/stores/searchStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { cn } from '@/lib/utils';

function formatDuration(ms: number) {
  const seconds = Math.max(0, ms / 1000);
  return `${seconds.toFixed(1)}s`;
}

const STAGE_MESSAGES = {
  priming: ['Preparing search...', 'Initializing...'],
  enumerating: ['Exploring your files...', 'Scanning directories...'],
  reading: ['Reading content...', 'Analyzing files...'],
  embedding: ['Finding relationships...', 'Understanding context...'],
  scoring: ['Ranking results...', 'Calculating relevance...'],
  converging: ['Finalizing...', 'Almost there...'],
} as const;

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
  const askModeOverride = useSearchStore((s) => s.askModeOverride);
  const toggleAskModeOverride = useSearchStore((s) => s.toggleAskModeOverride);

  // Toast state for Ask Mode shortcut
  const [showAskModeToast, setShowAskModeToast] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  // Local state
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalElapsedMs, setFinalElapsedMs] = useState<number | null>(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [predictedProgress, setPredictedProgress] = useState(0);

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

  // Keyboard shortcut: Ctrl+Shift+A to toggle Ask Mode for this search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        toggleAskModeOverride();

        // Show toast notification
        setShowAskModeToast(true);
        if (toastTimeoutRef.current) {
          window.clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = window.setTimeout(() => {
          setShowAskModeToast(false);
        }, 2000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [toggleAskModeOverride]);

  // Rotate messages occasionally
  useEffect(() => {
    if (!isActive) {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % 2);
    }, 2500);

    return () => clearInterval(interval);
  }, [isActive]);

  // Progress calculation - combines real data with time-based prediction
  const progress = useMemo(() => {
    if (isComplete) return 1;
    if (!isActive && hasSearchIntent) return 0.05;
    const stats = streamStats ?? { filesScanned: 0, candidates: 0, embedded: 0, cacheHits: 0 };

    // Real data-based progress
    let dataProgress = 0.05;
    if (phase === 'semantic' || phase === 'refining') {
      if (stats.embedded > 0) {
        dataProgress = 0.4 + (0.55 * (1 - Math.exp(-stats.embedded / 50)));
      } else {
        dataProgress = 0.4;
      }
    } else if (phase === 'lexical') {
      if (stats.filesScanned > 0) {
        dataProgress = 0.1 + (0.3 * (1 - Math.exp(-stats.filesScanned / 200)));
      } else {
        dataProgress = 0.1;
      }
    }

    // Use whichever is higher: real data or time-based prediction
    return Math.max(dataProgress, predictedProgress);
  }, [isComplete, isActive, hasSearchIntent, streamStats, phase, predictedProgress]);

  // Time-based progress prediction (ensures bar always moves)
  useEffect(() => {
    if (!shouldShow || isComplete) {
      setPredictedProgress(0);
      return;
    }

    // Predict progress based on elapsed time (assume ~15s average search)
    const avgSearchTime = 15000; // 15 seconds
    const updateInterval = setInterval(() => {
      const elapsed = searchStartTime ? Date.now() - searchStartTime : 0;
      // Asymptotic curve: approaches 0.9 but never reaches it
      const timePrediction = 0.9 * (1 - Math.exp(-elapsed / (avgSearchTime * 0.6)));
      setPredictedProgress(timePrediction);
    }, 100);

    return () => clearInterval(updateInterval);
  }, [shouldShow, isComplete, searchStartTime]);

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

    // Use predefined stage messages
    let stageKey: keyof typeof STAGE_MESSAGES = 'priming';
    const stats = streamStats ?? { filesScanned: 0, candidates: 0, embedded: 0 };

    if (streamStage === 'tail') stageKey = 'converging';
    else if (streamStage === 'semantic') {
      if (stats.embedded > 0) stageKey = 'scoring';
      else stageKey = 'embedding';
    }
    else if (stats.filesScanned > 10) stageKey = 'reading';
    else if (stats.filesScanned > 0) stageKey = 'enumerating';

    const messages = STAGE_MESSAGES[stageKey];
    return messages[messageIndex % messages.length];

  }, [isActive, isComplete, hasSearchIntent, streamStats, statusFromStore, streamStage, messageIndex]);

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
    <>
      {/* Ask Mode Toggle Toast */}
      <AnimatePresence>
        {showAskModeToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg bg-graphite-2 border border-accent-violet/30 shadow-xl backdrop-blur-md flex items-center gap-3"
          >
            <MessageCircleQuestion className="w-5 h-5 text-accent-violet" />
            <div>
              <span className="text-sm font-medium text-porcelain">
                Ask Mode: {askModeOverride === 'always' ? 'ON' : 'OFF'}
              </span>
              <span className="text-xs text-fg-dim ml-2">
                {askModeOverride === 'always' ? 'for this search' : 'using settings'}
              </span>
            </div>
            <span className="text-2xs text-fg-ghost px-1.5 py-0.5 rounded bg-graphite-3">
              Ctrl+Shift+A
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="w-full mt-4 rounded-lg overflow-hidden bg-graphite-1 border border-stroke-hairline"
      >
        {/* Status bar */}
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Status icon - only show check when complete */}
          {isComplete && (
            <Check className="w-4 h-4 text-success flex-shrink-0" />
          )}

          {/* Status message with shimmer animation during search */}
          <AnimatePresence mode="wait">
            <motion.div
              key={statusMessage}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.2 }}
              className="flex-1 truncate"
            >
              {isSearching() ? (
                <span
                  className="text-sm uppercase tracking-[0.15em] font-semibold bg-clip-text text-transparent animate-shimmer-slow bg-[length:200%_100%]"
                  style={{
                    WebkitBackgroundClip: 'text',
                    backgroundImage: `linear-gradient(90deg, rgba(243,245,247,0.8) 0%, rgba(243,245,247,0.8) 20%, ${activePalette.accent} 45%, ${activePalette.accent} 55%, rgba(243,245,247,0.8) 80%, rgba(243,245,247,0.8) 100%)`
                  }}
                >
                  {statusMessage}
                </span>
              ) : (
                <span className="text-sm text-fg-muted">{statusMessage}</span>
              )}
            </motion.div>
          </AnimatePresence>

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

        {/* Live stats - only show when we have meaningful data */}
        {(streamStatsSafe.filesScanned > 0 || streamStatsSafe.embedded > 0 || trailLabel) && (
          <div className="px-4 pb-3 -mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-fg-dim font-mono">
            <span className="uppercase tracking-[0.2em] text-fg-ghost">Live</span>
            <span>{stageLabel}</span>
            {streamStatsSafe.filesScanned > 0 && (
              <span className="tabular-nums">{streamStatsSafe.filesScanned} scanned</span>
            )}
            {streamStatsSafe.embedded > 0 && (
              <span className="tabular-nums">{streamStatsSafe.embedded} embedded</span>
            )}
            {streamStatsSafe.cacheHits > 0 && (
              <span className="tabular-nums">{streamStatsSafe.cacheHits} cache hits</span>
            )}
            {trailLabel && (
              <span className="text-fg-ghost truncate max-w-[40%]">Last: {trailLabel}</span>
            )}
          </div>
        )}

        {/* Progress underline */}
        <div
          ref={underlineRef}
          className="relative h-[3px] w-full overflow-hidden bg-graphite-3"
        >
          {/* Background track */}
          <div className="absolute inset-0 bg-graphite-2" />

          {/* Progress fill - solid accent bar with flowing light */}
          <motion.div
            className="absolute top-0 left-0 h-full overflow-hidden"
            style={{
              backgroundColor: isComplete ? 'var(--accent-success)' : activePalette.accent,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${animatedProgress * 100}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Flowing light indicator within the filled portion */}
            {isSearching() && animatedProgress > 0.05 && (
              <motion.div
                className="absolute inset-y-0 w-12"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 70%, transparent 100%)`,
                }}
                animate={{
                  left: ['-10%', '110%'],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'linear',
                  repeatDelay: 0
                }}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </>
  );

  function isSearching() {
    return isActive || (hasSearchIntent && !isComplete);
  }
}
