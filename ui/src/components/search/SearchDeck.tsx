import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useSearchStore } from '@/stores/searchStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';

type StepState = 'pending' | 'active' | 'done';

interface PipelineStep {
  key: 'scan' | 'embed' | 'rank' | 'done';
  label: string;
  detail: string;
  state: StepState;
}

// Mode-specific accent classes
const MODE_ACCENTS = {
  memory: {
    dot: 'bg-accent-amber',
    sonar: 'bg-accent-amber',
    text: 'text-accent-amber',
    activeBorder: 'border-accent-amber/40',
    activeBg: 'bg-accent-amber/10',
    dotBorder: 'border-accent-amber bg-accent-amber',
    bar: 'var(--accent-amber, #F6B94C)',
  },
  local: {
    dot: 'bg-accent-teal',
    sonar: 'bg-accent-teal',
    text: 'text-accent-teal',
    activeBorder: 'border-accent-teal/40',
    activeBg: 'bg-accent-teal/10',
    dotBorder: 'border-accent-teal bg-accent-teal',
    bar: 'var(--accent-teal, #14B8A6)',
  },
  deepSearch: {
    dot: 'bg-accent-violet',
    sonar: 'bg-accent-violet',
    text: 'text-accent-violet',
    activeBorder: 'border-accent-violet/40',
    activeBg: 'bg-accent-violet/10',
    dotBorder: 'border-accent-violet bg-accent-violet',
    bar: 'var(--accent-violet, #7C5CFF)',
  },
} as const;

function formatDuration(ms: number) {
  const seconds = Math.max(0, ms / 1000);
  return `${seconds.toFixed(1)}s`;
}

function fileTail(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function SearchDeck() {
  const underlineRef = useRef<HTMLDivElement>(null);
  const setDeckUnderlineBox = useLayoutStore((state) => state.setDeckUnderlineBox);

  const phase = useSearchStore((state) => state.phase);
  const streamStats = useSearchStore((state) => state.streamStats);
  const streamStage = useSearchStore((state) => state.streamStage);
  const streamSequence = useSearchStore((state) => state.streamSequence);
  const searchStartTime = useSearchStore((state) => state.searchStartTime);
  const activeThreadId = useSearchStore((state) => state.activeThreadId);
  const cacheMode = useSearchStore((state) => state.cacheMode);
  const deepSearchMode = useSearchStore((state) => state.deepSearchMode);
  const lexicalResults = useSearchStore((state) => state.lexicalResults);
  const semanticResults = useSearchStore((state) => state.semanticResults);
  const hasSearchIntent = useSearchStore((state) => state.hasSearchIntent);
  const scanTrail = useSearchStore((state) => state.scanTrail);
  const streamEvents = useSearchStore((state) => state.streamEvents);
  const qualityMode = useSettingsStore((state) => state.config?.search.searchMode ?? 'auto');

  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalElapsedMs, setFinalElapsedMs] = useState<number | null>(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [predictedProgress, setPredictedProgress] = useState(0);
  const lastSearchStartRef = useRef<number | null>(null);

  // Derive mode key for accent colors
  const modeKey: 'memory' | 'local' | 'deepSearch' = deepSearchMode
    ? 'deepSearch'
    : cacheMode === 'native-cache'
      ? 'local'
      : 'memory';
  const accent = MODE_ACCENTS[modeKey];

  const isActive = phase === 'lexical' || phase === 'semantic' || phase === 'refining';
  const isComplete = phase === 'complete';
  const hasStartedSearch = searchStartTime !== null;
  const shouldShow = isActive || isComplete || (hasStartedSearch && hasSearchIntent);
  const resultCount = semanticResults.length > 0 ? semanticResults.length : lexicalResults.length;
  const hasResults = resultCount > 0;
  const stats = streamStats ?? { filesScanned: 0, candidates: 0, embedded: 0, cacheHits: 0 };

  const averageSearchMs = useMemo(() => {
    let base = qualityMode === 'flash' ? 9_000 : qualityMode === 'pro' ? 28_000 : 18_000;
    if (deepSearchMode) base += 3_000;
    if (cacheMode === 'native-cache') base = Math.max(6_000, base - 4_000);
    return base;
  }, [cacheMode, deepSearchMode, qualityMode]);

  const embedTarget = useMemo(() => {
    const baseline = Math.max(stats.candidates, lexicalResults.length, semanticResults.length, 1);
    return baseline;
  }, [lexicalResults.length, semanticResults.length, stats.candidates]);

  const stageIndex = useMemo(() => {
    const effectiveStage =
      streamStage ??
      (phase === 'refining'
        ? 'refining'
        : phase === 'semantic'
          ? 'semantic'
          : phase === 'lexical'
            ? 'lexical'
            : null);

    if (isComplete) return 3;
    if (effectiveStage === 'tail' || effectiveStage === 'refining') return 2;
    if (effectiveStage === 'semantic') {
      if (semanticResults.length > 0) return 2;
      return 1;
    }
    if (effectiveStage === 'lexical') return 0;
    return hasSearchIntent ? 0 : -1;
  }, [hasSearchIntent, isComplete, phase, semanticResults.length, streamStage]);

  const progress = useMemo(() => {
    if (isComplete) return 1;
    if (!isActive && hasSearchIntent) return 0.05;

    const scanProgress = 0.12 * (1 - Math.exp(-stats.filesScanned / 180));
    const embedProgress = 0.38 * Math.min(1, stats.embedded / embedTarget);
    const rankProgress = semanticResults.length > 0 ? 0.35 : 0;
    const dataProgress = Math.min(0.92, 0.08 + scanProgress + embedProgress + rankProgress);

    return Math.max(dataProgress, predictedProgress);
  }, [embedTarget, hasSearchIntent, isActive, isComplete, predictedProgress, semanticResults.length, stats.embedded, stats.filesScanned]);

  const statusMessage = useMemo(() => {
    if (isComplete) {
      return `${resultCount} ${resultCount === 1 ? 'result' : 'results'} | ${formatDuration(finalElapsedMs ?? elapsedMs)}`;
    }
    if (!isActive && hasSearchIntent) return 'Starting search';
    if (streamStage === 'lexical' || phase === 'lexical') return `Scanning ${stats.filesScanned} files`;
    if ((streamStage === 'semantic' || phase === 'semantic') && semanticResults.length === 0) {
      return `Embedding ${stats.embedded} candidates`;
    }
    if (
      streamStage === 'tail' ||
      streamStage === 'refining' ||
      phase === 'refining' ||
      semanticResults.length > 0
    ) {
      return `Ranking ${Math.max(resultCount, semanticResults.length)} results`;
    }
    return 'Preparing search';
  }, [elapsedMs, finalElapsedMs, hasSearchIntent, isActive, isComplete, phase, resultCount, semanticResults.length, stats.embedded, stats.filesScanned, streamStage]);

  const pipelineSteps = useMemo<PipelineStep[]>(() => {
    const doneDetail = isComplete
      ? `${resultCount} ${resultCount === 1 ? 'result' : 'results'} | ${formatDuration(finalElapsedMs ?? elapsedMs)}`
      : 'Awaiting final ranking';

    return [
      {
        key: 'scan',
        label: 'Scan',
        detail: `${stats.filesScanned} files`,
        state: stageIndex > 0 || isComplete ? 'done' : stageIndex === 0 ? 'active' : 'pending',
      },
      {
        key: 'embed',
        label: 'Embed',
        detail: `${stats.embedded} embedded`,
        state: stageIndex > 1 || isComplete ? 'done' : stageIndex === 1 ? 'active' : 'pending',
      },
      {
        key: 'rank',
        label: 'Rank',
        detail: `${Math.max(resultCount, semanticResults.length)} candidates`,
        state: stageIndex > 2 || isComplete ? 'done' : stageIndex === 2 ? 'active' : 'pending',
      },
      {
        key: 'done',
        label: 'Done',
        detail: doneDetail,
        state: isComplete ? 'done' : stageIndex === 3 ? 'active' : 'pending',
      },
    ];
  }, [elapsedMs, finalElapsedMs, isComplete, resultCount, semanticResults.length, stageIndex, stats.embedded, stats.filesScanned]);

  useEffect(() => {
    if (!searchStartTime) {
      lastSearchStartRef.current = null;
      return;
    }

    if (lastSearchStartRef.current !== searchStartTime) {
      lastSearchStartRef.current = searchStartTime;
      setElapsedMs(0);
      setFinalElapsedMs(null);
      setPredictedProgress(0);
      setAnimatedProgress(0);
    }
  }, [searchStartTime]);

  useEffect(() => {
    if (!shouldShow || isComplete) {
      setPredictedProgress(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      const elapsed = searchStartTime ? Date.now() - searchStartTime : 0;
      const prediction = 0.9 * (1 - Math.exp(-elapsed / (averageSearchMs * 0.65)));
      setPredictedProgress(prediction);
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [averageSearchMs, isComplete, searchStartTime, shouldShow, activeThreadId]);

  useEffect(() => {
    if (isComplete) {
      setAnimatedProgress(1);
      return;
    }
    if (!shouldShow) {
      setAnimatedProgress(0);
      return;
    }
    setAnimatedProgress((previous) => Math.max(previous, progress));
  }, [isComplete, progress, shouldShow, activeThreadId]);

  useEffect(() => {
    if ((hasResults || isComplete) && finalElapsedMs === null && searchStartTime) {
      setFinalElapsedMs(Date.now() - searchStartTime);
    }
    if (!isComplete && !isActive && !hasSearchIntent) {
      setFinalElapsedMs(null);
    }
  }, [finalElapsedMs, hasResults, hasSearchIntent, isActive, isComplete, searchStartTime]);

  useEffect(() => {
    if (!shouldShow || !searchStartTime || isComplete || hasResults) return;
    setElapsedMs(Date.now() - searchStartTime);
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - searchStartTime);
    }, 100);
    return () => window.clearInterval(timer);
  }, [hasResults, isComplete, searchStartTime, shouldShow]);

  useEffect(() => {
    if (!underlineRef.current) return;
    const measure = () => {
      const rect = underlineRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDeckUnderlineBox({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(underlineRef.current);
    return () => observer.disconnect();
  }, [setDeckUnderlineBox]);

  if (!shouldShow) return null;

  const displayElapsedMs = finalElapsedMs ?? elapsedMs;
  const modeBadge = deepSearchMode
    ? 'Deep Search'
    : cacheMode === 'native-cache'
      ? 'Local'
      : 'Memory';
  const currentFile = (() => {
    const latestScan = scanTrail[scanTrail.length - 1];
    if (latestScan) return latestScan;
    for (let i = streamEvents.length - 1; i >= 0; i -= 1) {
      const path = streamEvents[i]?.path;
      if (path) return path;
    }
    return null;
  })();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="mt-4 w-full overflow-hidden rounded-lg border border-stroke-hairline bg-graphite-1"
      >
        <div className="px-4 pb-2 pt-3">
          <div className="flex items-center gap-3">
            {/* Sonar dot — mode-colored */}
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {!isComplete && (
                <span className={cn('absolute inline-flex h-full w-full rounded-full animate-sonar', accent.sonar)} />
              )}
              <span className={cn(
                'relative h-2.5 w-2.5 rounded-full',
                isComplete ? 'bg-success' : accent.dot
              )} />
            </span>
            <span className="flex-1 truncate text-sm font-medium text-porcelain">{statusMessage}</span>
            <div className="flex items-center gap-3 text-xs font-mono text-fg-ghost">
              {resultCount > 0 && <span className="tabular-nums">{resultCount} results</span>}
              {displayElapsedMs > 0 && <span className="tabular-nums">{formatDuration(displayElapsedMs)}</span>}
              <span className={cn('rounded px-1.5 py-0.5 text-2xs bg-graphite-2', accent.text)}>{modeBadge}</span>
            </div>
          </div>

          {/* Scan trail ticker */}
          {scanTrail.length > 0 && (
            <div
              className="mt-1 flex items-center gap-1.5 overflow-hidden text-xs text-fg-dim"
              style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 15%)' }}
            >
              <span className="shrink-0 text-fg-ghost">Scanning:</span>
              <AnimatePresence mode="popLayout">
                {scanTrail.slice(-4).map((path, i) => (
                  <motion.span
                    key={`${path}-${streamSequence}-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="shrink-0 truncate"
                  >
                    {fileTail(path)}{i < Math.min(scanTrail.length, 4) - 1 ? ' |' : ''}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2 text-2xs text-fg-dim md:grid-cols-4">
            <div className="rounded border border-white/10 bg-graphite-2/55 px-2 py-1.5">
              Files scanned: <span className="text-porcelain font-mono">{stats.filesScanned}</span>
            </div>
            <div className="rounded border border-white/10 bg-graphite-2/55 px-2 py-1.5">
              Embeddings: <span className="text-porcelain font-mono">{stats.embedded}</span>
            </div>
            <div className="rounded border border-white/10 bg-graphite-2/55 px-2 py-1.5">
              Cache hits: <span className="text-porcelain font-mono">{stats.cacheHits}</span>
            </div>
            <div className="rounded border border-white/10 bg-graphite-2/55 px-2 py-1.5 truncate">
              Current file: <span className="text-porcelain font-mono">{currentFile ? fileTail(currentFile) : '...'}</span>
            </div>
          </div>
        </div>

        {/* Pipeline steps — mode-colored accents */}
        <div className="grid grid-cols-1 gap-2 px-4 pb-3 md:grid-cols-4">
          {pipelineSteps.map((step) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0.5, y: 4 }}
              animate={
                step.state === 'active'
                  ? { opacity: 1, y: 0, scale: [1, 1.015, 1] }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              transition={
                step.state === 'active'
                  ? { scale: { repeat: Infinity, duration: 2, ease: 'easeInOut' }, opacity: { duration: 0.2 } }
                  : { duration: 0.2 }
              }
              className={cn(
                'rounded-md border px-3 py-2',
                step.state === 'active'
                  ? `${accent.activeBorder} ${accent.activeBg}`
                  : step.state === 'done'
                    ? 'border-white/10 bg-graphite-2/60'
                    : 'border-white/5 bg-graphite-2/35'
              )}
            >
              <div className="flex items-center gap-2 text-xs">
                {step.state === 'done' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <Check className="h-3.5 w-3.5 text-success" />
                  </motion.div>
                ) : (
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                    {step.state === 'active' && (
                      <span className={cn('absolute inline-flex h-full w-full rounded-full animate-sonar', accent.sonar)} />
                    )}
                    <span className={cn(
                      'relative h-2.5 w-2.5 rounded-full border',
                      step.state === 'active'
                        ? accent.dotBorder
                        : 'border-fg-ghost/40 bg-transparent'
                    )} />
                  </span>
                )}
                <span className={cn(
                  'font-medium',
                  step.state === 'active' ? accent.text : 'text-fg-muted'
                )}>
                  {step.label}
                </span>
              </div>
              <div className="mt-1 truncate text-2xs text-fg-dim">{step.detail}</div>
            </motion.div>
          ))}
        </div>

        {/* Progress bar — mode-colored, green when done */}
        <div ref={underlineRef} className="relative h-[3px] w-full overflow-hidden bg-graphite-3">
          <div className="absolute inset-0 bg-graphite-2" />
          <motion.div
            className="absolute left-0 top-0 h-full overflow-hidden"
            style={{ backgroundColor: isComplete ? 'var(--accent-success)' : accent.bar }}
            initial={{ width: 0 }}
            animate={{ width: `${animatedProgress * 100}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {!isComplete && (
              <div
                className="absolute inset-0 animate-progress-shimmer"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                  width: '100%',
                }}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
