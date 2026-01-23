import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Target, Check, Loader2, FolderSearch, FileText, BarChart3 } from 'lucide-react';
import { useSearchStore } from '@/stores/searchStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { cn } from '@/lib/utils';

// Constants
const SCRAMBLE_DURATION_MS = 280;
const SCRAMBLE_STEPS = 6;
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/.';
const FILE_CYCLE_INTERVAL_MS = 400;
const MAX_ACTIVITY_LINES = 3;

// Utilities
function formatPath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 2) return normalized;
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function scrambleFrame(text: string, revealCount: number) {
  const chars = text.split('');
  return chars.map((char, index) => {
    if (char === ' ' || char === '.' || char === '/' || index < revealCount) return char;
    return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
  }).join('');
}

// Granular stage configuration - more detailed sub-stages
type StageKey = 'priming' | 'enumerating' | 'reading' | 'embedding' | 'scoring' | 'converging' | 'done';

interface StageConfig {
  label: string;
  Icon: typeof Loader2;
  color: string;
  glowColor: string;
  bgColor: string;
}

const STAGE_CONFIG: Record<StageKey, StageConfig> = {
  priming: {
    label: 'Priming',
    Icon: Loader2,
    color: 'text-fg-dim',
    glowColor: 'rgba(243, 245, 247, 0.3)',
    bgColor: 'rgba(243, 245, 247, 0.1)'
  },
  enumerating: {
    label: 'Enumerating',
    Icon: FolderSearch,
    color: 'text-accent-teal',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    bgColor: 'rgba(20, 184, 166, 0.15)'
  },
  reading: {
    label: 'Reading',
    Icon: FileText,
    color: 'text-accent-teal',
    glowColor: 'rgba(20, 184, 166, 0.5)',
    bgColor: 'rgba(20, 184, 166, 0.15)'
  },
  embedding: {
    label: 'Embedding',
    Icon: Brain,
    color: 'text-accent-teal-glow',
    glowColor: 'rgba(6, 214, 193, 0.5)',
    bgColor: 'rgba(6, 214, 193, 0.15)'
  },
  scoring: {
    label: 'Scoring',
    Icon: BarChart3,
    color: 'text-accent-teal-glow',
    glowColor: 'rgba(6, 214, 193, 0.4)',
    bgColor: 'rgba(6, 214, 193, 0.15)'
  },
  converging: {
    label: 'Converging',
    Icon: Target,
    color: 'text-accent-teal-glow',
    glowColor: 'rgba(6, 214, 193, 0.3)',
    bgColor: 'rgba(6, 214, 193, 0.15)'
  },
  done: {
    label: 'Complete',
    Icon: Check,
    color: 'text-success',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    bgColor: 'rgba(16, 185, 129, 0.15)'
  },
};

// Scrambled text component with smooth reveal
function ScrambledText({ text, className }: { text: string; className?: string }) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!text) {
      setDisplayText('');
      return;
    }

    let step = 0;
    const stepMs = Math.max(16, SCRAMBLE_DURATION_MS / SCRAMBLE_STEPS);

    const timer = window.setInterval(() => {
      step += 1;
      const revealCount = Math.floor((step / SCRAMBLE_STEPS) * text.length);
      setDisplayText(scrambleFrame(text, revealCount));

      if (step >= SCRAMBLE_STEPS) {
        window.clearInterval(timer);
        setDisplayText(text);
      }
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [text]);

  return <span className={className}>{displayText}</span>;
}

export function SearchDeck() {
  const underlineRef = useRef<HTMLDivElement>(null);
  const setDeckUnderlineBox = useLayoutStore((s) => s.setDeckUnderlineBox);

  // Store selectors
  const phase = useSearchStore((s) => s.phase);
  const streamStage = useSearchStore((s) => s.streamStage);
  const streamStats = useSearchStore((s) => s.streamStats);
  const scanTrail = useSearchStore((s) => s.scanTrail);
  const searchStartTime = useSearchStore((s) => s.searchStartTime);
  const cacheMode = useSearchStore((s) => s.cacheMode);
  const journalistMode = useSearchStore((s) => s.journalistMode);
  const lexicalResults = useSearchStore((s) => s.lexicalResults);
  const semanticResults = useSearchStore((s) => s.semanticResults);
  const hasSearchIntent = useSearchStore((s) => s.hasSearchIntent);
  const streamEvents = useSearchStore((s) => s.streamEvents);

  // Local state
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalElapsedMs, setFinalElapsedMs] = useState<number | null>(null);

  // Derived state
  const isActive = phase === 'lexical' || phase === 'semantic' || phase === 'refining';
  const isComplete = phase === 'complete';
  const shouldShow = hasSearchIntent || isActive || isComplete;
  const showResults = semanticResults.length > 0 || lexicalResults.length > 0;
  const isExpanded = isActive || (hasSearchIntent && !showResults);
  const isStreaming = isActive && showResults;

  // Derive granular stage from milestones
  const currentStage: StageKey = useMemo(() => {
    if (isComplete) return 'done';
    if (!isActive && hasSearchIntent) return 'priming';

    const stats = streamStats ?? { filesScanned: 0, candidates: 0, embedded: 0, cacheHits: 0 };

    // Granular stage derivation based on milestones
    if (streamStage === 'tail') return 'converging';
    if (streamStage === 'semantic' || streamStage === 'refining') {
      if (stats.embedded > 0) return 'scoring';
      return 'embedding';
    }
    // lexical phase
    if (stats.filesScanned > 10) return 'reading';
    if (stats.filesScanned > 0) return 'enumerating';
    return 'priming';
  }, [isActive, isComplete, hasSearchIntent, streamStage, streamStats]);

  const stageConfig = STAGE_CONFIG[currentStage];

  // Measure underline position for spark origin
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

  // File cycling
  useEffect(() => {
    if (!isActive || scanTrail.length === 0) return;

    const timer = window.setInterval(() => {
      setCurrentFileIndex((prev) => (prev + 1) % Math.max(1, scanTrail.length));
    }, FILE_CYCLE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isActive, scanTrail.length]);

  // Freeze elapsed time on completion
  useEffect(() => {
    if (isComplete && finalElapsedMs === null && searchStartTime) {
      setFinalElapsedMs(Date.now() - searchStartTime);
    }
    // Reset for next search
    if (!isComplete && !isActive && !hasSearchIntent) {
      setFinalElapsedMs(null);
    }
  }, [isComplete, isActive, hasSearchIntent, searchStartTime, finalElapsedMs]);

  // Elapsed time tracking (only when not complete)
  useEffect(() => {
    if (!shouldShow || !searchStartTime || isComplete) return;

    setElapsedMs(Date.now() - searchStartTime);
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - searchStartTime);
    }, 200);

    return () => window.clearInterval(timer);
  }, [shouldShow, searchStartTime, isComplete]);

  // Current focus file
  const currentFile = useMemo(() => {
    if (scanTrail.length === 0) {
      if (currentStage === 'priming') return 'Initializing pipeline...';
      if (currentStage === 'done') return 'Search complete';
      return 'Scanning...';
    }
    const safeIndex = Math.min(currentFileIndex, scanTrail.length - 1);
    return formatPath(scanTrail[safeIndex]);
  }, [scanTrail, currentFileIndex, currentStage]);

  // Use frozen time for complete state, live time otherwise
  const displayElapsedMs = finalElapsedMs ?? elapsedMs;

  // Metrics line
  const metricsLine = useMemo(() => {
    const parts: string[] = [];
    const stats = streamStats ?? { filesScanned: 0, candidates: 0, embedded: 0, cacheHits: 0 };

    if (stats.filesScanned > 0) {
      parts.push(`${stats.filesScanned.toLocaleString()} scanned`);
    }

    const seconds = Math.max(1, Math.floor(displayElapsedMs / 1000));
    if (stats.filesScanned > 0) {
      const rate = Math.round(stats.filesScanned / seconds);
      parts.push(`${rate}/s`);
    }

    const resultCount = semanticResults.length > 0 ? semanticResults.length : lexicalResults.length;
    if (resultCount > 0) {
      parts.push(`${resultCount} results`);
    }

    if (displayElapsedMs > 0) {
      parts.push(formatDuration(displayElapsedMs));
    }

    return parts.join(' • ');
  }, [streamStats, displayElapsedMs, lexicalResults.length, semanticResults.length]);

  // Activity ticker events
  const activityEvents = useMemo(() => {
    const events: { id: string; text: string }[] = [];

    // Add stream events
    if (streamEvents && streamEvents.length > 0) {
      const recentEvents = streamEvents.slice(-3);
      recentEvents.forEach((event, idx) => {
        if (event.kind === 'scan' && event.path) {
          events.push({ id: `scan-${idx}`, text: formatPath(event.path) });
        }
        if (event.kind === 'semantic' && event.path) {
          events.push({ id: `semantic-${idx}`, text: formatPath(event.path) });
        }
      });
    }

    return events.slice(-MAX_ACTIVITY_LINES);
  }, [streamEvents]);

  // Compact summary for collapsed state
  const compactSummary = useMemo(() => {
    const resultCount = semanticResults.length > 0 ? semanticResults.length : lexicalResults.length;
    const mode = journalistMode ? 'Journalist' : (semanticResults.length > 0 ? 'Semantic' : 'Lexical');
    const timeStr = finalElapsedMs !== null ? `${(finalElapsedMs / 1000).toFixed(2)}s` : '';

    const parts = [];
    if (resultCount > 0) parts.push(`${resultCount} results`);
    parts.push(mode);
    if (timeStr) parts.push(timeStr);

    return parts.join(' • ');
  }, [semanticResults.length, lexicalResults.length, journalistMode, finalElapsedMs]);

  // Mode badge
  const modeBadge = useMemo(() => {
    if (journalistMode) return 'Journalist';
    return cacheMode === 'cache' ? 'Cache' : 'JIT';
  }, [journalistMode, cacheMode]);

  if (!shouldShow) return null;

  const Icon = stageConfig.Icon;
  const isSpinning = currentStage === 'priming' || currentStage === 'enumerating';

  return (
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "w-full mt-4 rounded-2xl overflow-hidden",
          "bg-gradient-to-b from-white/[0.03] to-graphite-2/70",
          "backdrop-blur-xl",
          "ring-1 ring-white/[0.08]",
          "shadow-lift"
        )}
      >
      {/* Animated height for expand/collapse */}
      <motion.div
        animate={{ height: isExpanded ? 'auto' : 44 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-hidden"
      >
        {/* Expanded content layout */}
        {isExpanded ? (
          <div className="px-5 py-4 space-y-3">
            {/* Row 1: Stage Capsule + Mode Badge + Streaming Indicator */}
            <div className="flex items-center gap-3">
              {/* Stage Capsule - pill styling */}
              <motion.div
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
                  "transition-colors duration-300"
                )}
                style={{
                  backgroundColor: stageConfig.bgColor,
                  boxShadow: `0 0 18px ${stageConfig.glowColor}`
                }}
              >
                <motion.div
                  animate={isSpinning ? { rotate: 360 } : {}}
                  transition={isSpinning ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
                >
                  <Icon className={cn("w-3.5 h-3.5", stageConfig.color)} />
                </motion.div>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={stageConfig.label}
                    initial={{ opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "text-[11px] font-semibold tracking-wide uppercase",
                      stageConfig.color
                    )}
                  >
                    {stageConfig.label}
                  </motion.span>
                </AnimatePresence>
              </motion.div>

              {/* Streaming indicator */}
              {isStreaming && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-teal/10"
                >
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-accent-teal"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <span className="text-[10px] font-medium text-accent-teal uppercase tracking-wider">
                    streaming
                  </span>
                </motion.div>
              )}

              {/* Mode badge - right aligned */}
              <span className="ml-auto text-[9px] font-mono text-fg-dim/50 uppercase tracking-wider">
                {modeBadge}
              </span>
            </div>

            {/* Row 2: Focus Line - Current file being processed */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFile}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="font-mono text-xs text-fg-muted/70 truncate pl-1"
              >
                <ScrambledText text={currentFile} />
              </motion.div>
            </AnimatePresence>

            {/* Row 3: Metrics Line */}
            {metricsLine && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="font-mono text-[10px] text-fg-dim/50 pl-1"
              >
                {metricsLine}
              </motion.div>
            )}

            {/* Row 4: Activity Ticker - recent files */}
            {activityEvents.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="space-y-0.5 pt-1 border-t border-white/[0.04]"
              >
                <AnimatePresence mode="popLayout">
                  {activityEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="font-mono text-[9px] text-fg-dim/35 truncate flex items-center gap-2"
                    >
                      <span className="w-1 h-1 rounded-full bg-accent-teal/40 flex-shrink-0" />
                      {event.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        ) : (
          /* Compact summary line for collapsed state */
          <div className="px-5 h-[44px] flex items-center">
            <div className="flex items-center gap-3 w-full">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: stageConfig.bgColor }}
              >
                <Check className="w-3.5 h-3.5 text-success" />
              </div>
              <span className="font-mono text-xs text-fg-muted/70 truncate">
                {compactSummary}
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Electric Underline */}
      <div
        ref={underlineRef}
        className="relative h-[2px] w-full overflow-hidden"
      >
        {/* Base glow */}
        <motion.div
          className="absolute inset-0 transition-colors duration-300"
          style={{ backgroundColor: stageConfig.glowColor }}
          animate={{ opacity: isComplete ? 0.7 : 0.4 }}
        />

        {/* Pulse train animation - active during search */}
        {(isActive || currentStage === 'priming') && (
          <>
            <motion.div
              className="absolute top-0 h-full"
              style={{
                width: '20%',
                background: `linear-gradient(90deg, transparent, ${currentStage === 'embedding' || currentStage === 'scoring' ? 'rgba(6, 214, 193, 0.9)' : 'rgba(20, 184, 166, 0.9)'}, transparent)`
              }}
              animate={{ left: ['-20%', '100%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute top-0 h-full"
              style={{
                width: '15%',
                background: `linear-gradient(90deg, transparent, ${currentStage === 'embedding' || currentStage === 'scoring' ? 'rgba(6, 214, 193, 0.6)' : 'rgba(20, 184, 166, 0.6)'}, transparent)`
              }}
              animate={{ left: ['-15%', '100%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: 0.5 }}
            />
          </>
        )}

        {/* Calm full-width glow for complete state */}
        {isComplete && (
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.6)' }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        )}
      </div>
    </motion.div>
  );
}
