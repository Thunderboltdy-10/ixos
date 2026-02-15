"use client";

import { useState, useEffect, useCallback, useRef, createElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Zap, Shield, ChevronDown, ChevronUp, X, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFakeSearch, DEMO_QUERIES, type DemoFile, type PauseAtStage } from './fakeSearch';
import { getFileIcon } from './fileIcons';

export type DemoMode = 'memory' | 'local' | 'deep-search';
type DemoQuality = 'flash' | 'auto' | 'pro';

const MODE_META: Record<DemoMode, { icon: typeof Zap; label: string; shortLabel: string; description: string; detail: string }> = {
  memory: {
    icon: Zap,
    label: 'Memory Search',
    shortLabel: 'MEMORY',
    description: 'JIT embeddings in RAM, nothing to disk',
    detail: 'Fastest mode. Embeddings computed on-the-fly and kept only in working memory. Perfect for quick lookups on sensitive data.',
  },
  local: {
    icon: Sparkles,
    label: 'Local Search',
    shortLabel: 'LOCAL',
    description: 'Cached via ADS/xattr for fast repeats',
    detail: 'Recommended mode. Embeddings cached alongside files using native OS metadata. Instant re-search with zero cloud sync.',
  },
  'deep-search': {
    icon: Shield,
    label: 'Deep Search',
    shortLabel: 'DEEP',
    description: 'Expanded evidence extraction, thorough scan',
    detail: 'Maximum coverage. Scans more files, reads deeper into content, and extracts cross-references. Slower but comprehensive.',
  },
};

const QUALITY_META: Record<
  DemoQuality,
  { label: string; shortLabel: string; description: string; detail: string; color: string; bgFaint: string; borderFaint: string; icon: typeof Sparkles }
> = {
  flash: {
    label: 'Ixos Flash',
    shortLabel: 'FLASH',
    description: 'Fastest, lowest latency',
    detail: 'Runs Flash directly for the quickest recall when context is already clear.',
    color: 'text-accent-amber',
    bgFaint: 'bg-accent-amber/10',
    borderFaint: 'border-accent-amber/20',
    icon: Zap,
  },
  auto: {
    label: 'Auto Mode',
    shortLabel: 'AUTO',
    description: 'Adapts to your query',
    detail: 'Starts in Flash and refines only when confidence is weak or intent is ambiguous.',
    color: 'text-accent-teal',
    bgFaint: 'bg-accent-teal/10',
    borderFaint: 'border-accent-teal/20',
    icon: Sparkles,
  },
  pro: {
    label: 'Ixos Pro',
    shortLabel: 'PRO',
    description: 'Highest quality ranking',
    detail: 'Prioritizes depth and richer evidence extraction for harder queries.',
    color: 'text-accent-violet',
    bgFaint: 'bg-accent-violet/10',
    borderFaint: 'border-accent-violet/20',
    icon: Shield,
  },
};

const QUALITY_ORDER: DemoQuality[] = ['flash', 'auto', 'pro'];
const QUERY_CYCLE_MS = 10_000;
const SYNC_POLL_MS = 120;
const SCROLL_GUIDED_QUERY = DEMO_QUERIES[0].query;
const USER_INTERACTION_TIMEOUT_MS = 30_000;

const MODE_TOKENS = {
  memory: {
    text: 'text-accent-amber',
    border: 'border-accent-amber',
    bg: 'bg-accent-amber',
    bgFaint: 'bg-accent-amber/10',
    borderFaint: 'border-accent-amber/20',
    glow: 'shadow-[0_0_30px_rgba(246,185,76,0.15)]',
    selection: 'selection:bg-accent-amber/20',
    insetGlow: 'shadow-[inset_4px_0_12px_-4px_rgba(246,185,76,0.2)]',
  },
  local: {
    text: 'text-accent-teal',
    border: 'border-accent-teal',
    bg: 'bg-accent-teal',
    bgFaint: 'bg-accent-teal/10',
    borderFaint: 'border-accent-teal/20',
    glow: 'shadow-[0_0_30px_rgba(20,184,166,0.15)]',
    selection: 'selection:bg-accent-teal/20',
    insetGlow: 'shadow-[inset_4px_0_12px_-4px_rgba(20,184,166,0.2)]',
  },
  'deep-search': {
    text: 'text-accent-violet',
    border: 'border-accent-violet',
    bg: 'bg-accent-violet',
    bgFaint: 'bg-accent-violet/10',
    borderFaint: 'border-accent-violet/20',
    glow: 'shadow-[0_0_30px_rgba(124,92,255,0.15)]',
    selection: 'selection:bg-accent-violet/20',
    insetGlow: 'shadow-[inset_4px_0_12px_-4px_rgba(124,92,255,0.2)]',
  },
} as const;

const QUALITY_TOKENS = {
  flash: {
    text: 'text-accent-amber',
    bgFaint: 'bg-accent-amber/10',
    borderFaint: 'border-accent-amber/20',
  },
  auto: {
    text: 'text-accent-teal',
    bgFaint: 'bg-accent-teal/10',
    borderFaint: 'border-accent-teal/20',
  },
  pro: {
    text: 'text-accent-violet',
    bgFaint: 'bg-accent-violet/10',
    borderFaint: 'border-accent-violet/20',
  },
} as const;

const PIPELINE_STAGES = ['Scan', 'Embed', 'Rank'] as const;

export const STEP_LABELS = ['01 INPUT_LAYER', '02 EMBED_ENGINE', '03 RANK_ENGINE', '04 PRIVACY_GUARD', '05 OUTPUT_STREAM'] as const;

const STEP_PAUSE_MAP: Record<number, PauseAtStage> = {
  0: 'scan',
  1: 'embed',
  2: 'rank',
  3: 'results',
  4: null,
};

interface IxosDemoWindowProps {
  onInteract?: () => void;
  controlledStep?: number | null;
  onModeChange?: (mode: DemoMode) => void;
}

export function IxosDemoWindow({ onInteract, controlledStep = null, onModeChange }: IxosDemoWindowProps) {
  const [syncClock, setSyncClock] = useState(() => Date.now());
  const [userQuery, setUserQuery] = useState<string | null>(null);
  const [isUserMode, setIsUserMode] = useState(false);
  const [typedText, setTypedText] = useState('');
  const previousControlledStepRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeMode, setActiveMode] = useState<DemoMode>('local');
  const [activeQuality, setActiveQuality] = useState<DemoQuality>('auto');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [hoveredMode, setHoveredMode] = useState<DemoMode>('local');
  const [hoveredQuality, setHoveredQuality] = useState<DemoQuality>('auto');
  const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const qualityMenuRef = useRef<HTMLDivElement>(null);

  const { search, results, isSearching, searchStage, reset, setPauseAtStage } = useFakeSearch();
  const tokens = MODE_TOKENS[activeMode];
  const isControlled = controlledStep !== null && controlledStep !== undefined;
  const interactionLocked = false;
  const queryIndex = isControlled ? 0 : Math.floor(syncClock / QUERY_CYCLE_MS) % DEMO_QUERIES.length;

  const currentDemoQuery = isControlled ? SCROLL_GUIDED_QUERY : DEMO_QUERIES[queryIndex].query;
  const displayQuery = isUserMode ? (userQuery || '') : typedText;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target as Node)) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Controlled step: lock demo progression to scroll stage
  useEffect(() => {
    if (!isControlled) {
      previousControlledStepRef.current = null;
      setPauseAtStage(null);
      return;
    }

    const step = Math.max(0, Math.min(4, controlledStep ?? 0));
    const previousStep = previousControlledStepRef.current;
    if (previousStep === step) return;
    previousControlledStepRef.current = step;

    setPauseAtStage(STEP_PAUSE_MAP[step] ?? null);
    setIsUserMode(false);
    setUserQuery(null);
    setShowModeMenu(false);
    setShowQualityMenu(false);

    if (step === 0) {
      reset();
      setTypedText('');
      return;
    }

    const isBackward = previousStep !== null && step < previousStep;
    const shouldStartFresh = previousStep === null || previousStep === 0 || isBackward;

    if (shouldStartFresh) {
      setTypedText(currentDemoQuery);
      void search(currentDemoQuery);
    }
  }, [controlledStep, currentDemoQuery, isControlled, reset, search, setPauseAtStage]);

  // Sync clock for autonomous demo
  useEffect(() => {
    if (isUserMode || isControlled) return;
    const timer = window.setInterval(() => {
      setSyncClock(Date.now());
    }, SYNC_POLL_MS);
    return () => window.clearInterval(timer);
  }, [isUserMode, isControlled]);

  // Typing animation
  useEffect(() => {
    if (isUserMode) return;
    if (isControlled) {
      if (controlledStep !== 0) return;
      setTypedText('');
      let charIndex = 0;
      const timer = setInterval(() => {
        if (charIndex <= currentDemoQuery.length) {
          setTypedText(currentDemoQuery.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(timer);
          void search(currentDemoQuery);
        }
      }, 50);
      return () => clearInterval(timer);
    }

    setTypedText('');
    reset();

    let charIndex = 0;
    const timer = setInterval(() => {
      if (charIndex <= currentDemoQuery.length) {
        setTypedText(currentDemoQuery.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(timer);
        search(currentDemoQuery);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [queryIndex, isUserMode, currentDemoQuery, search, reset, isControlled, controlledStep]);

  const startUserMode = useCallback(() => {
    if (!isUserMode) {
      setIsUserMode(true);
      onInteract?.();
      setTypedText('');
      setShowModeMenu(false);
      setShowQualityMenu(false);
      if (!userQuery) setUserQuery('');
    }

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      setIsUserMode(false);
      setUserQuery('');
    }, USER_INTERACTION_TIMEOUT_MS);

    inputRef.current?.focus();
  }, [userQuery, isUserMode, onInteract]);

  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    startUserMode();
    const value = e.target.value;
    setUserQuery(value);
    setExpandedResult(null);
    if (value.length >= 2) search(value);
    else reset();
  }, [search, reset, startUserMode]);

  const handleModeChange = (mode: DemoMode) => {
    setActiveMode(mode);
    setShowModeMenu(false);
    startUserMode();
  };

  const handleQualityChange = (quality: DemoQuality) => {
    setActiveQuality(quality);
    setShowQualityMenu(false);
    startUserMode();
  };

  const modeMeta = MODE_META[activeMode];
  const hoveredModeMeta = MODE_META[hoveredMode];
  const qualityMeta = QUALITY_META[activeQuality];
  const hoveredQualityMeta = QUALITY_META[hoveredQuality];
  const ModeIcon = modeMeta.icon;
  const QualityIcon = qualityMeta.icon;

  useEffect(() => {
    onModeChange?.(activeMode);
  }, [activeMode, onModeChange]);

  useEffect(() => {
    if (!showModeMenu) setHoveredMode(activeMode);
  }, [activeMode, showModeMenu]);

  useEffect(() => {
    if (!showQualityMenu) setHoveredQuality(activeQuality);
  }, [activeQuality, showQualityMenu]);

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-bg-graphite-0 shadow-2xl",
        interactionLocked && "pointer-events-none select-none"
      )}
      onClick={interactionLocked ? undefined : () => { setShowModeMenu(false); setShowQualityMenu(false); }}
    >
      <div className="relative z-10 flex flex-1 flex-col items-center p-3 transition-all duration-300 md:p-4 lg:p-5">
        <div
          className={cn(
            "relative z-30 w-full max-w-2xl transition-all duration-300",
            results.length > 0 ? "mt-0" : "mt-[6%]"
          )}
        >
          {/* Search Bar */}
          <div
            className={cn(
              "relative bg-bg-graphite-1 border rounded-lg transition-all duration-300",
              (isSearching || displayQuery.length > 0)
                ? `border-opacity-50 ${tokens.text} ${tokens.border} ${tokens.glow}`
                : "border-white/10 hover:border-white/20"
            )}
          >
            <div className="flex flex-col">
              {/* Main search row */}
              <div className="flex items-center px-4 py-3.5 gap-3">
                <Search className={cn(
                  "w-4.5 h-4.5 transition-colors shrink-0",
                  displayQuery.length > 0 ? tokens.text : "text-fg-muted/40"
                )} />

                <input
                  ref={inputRef}
                  type="text"
                  value={displayQuery}
                  onChange={handleChange}
                  onClick={(e) => { e.stopPropagation(); startUserMode(); }}
                  placeholder="Search your files..."
                  className={cn(
                    "flex-1 bg-transparent text-fg-porcelain text-base font-medium placeholder:text-fg-muted/30 focus:outline-none",
                    tokens.selection
                  )}
                  readOnly={interactionLocked}
                />

                {displayQuery.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setUserQuery(''); setTypedText(''); reset(); setExpandedResult(null); inputRef.current?.focus(); }}
                    className="text-fg-muted/40 hover:text-fg-porcelain transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Controls row: folder path + dropdowns */}
              <div className="px-4 pb-3 flex items-center justify-between gap-3">
                {/* Folder path - takes up available space */}
                <div className="flex items-center gap-2 text-[10px] font-mono text-fg-muted/30 tracking-wide min-w-0 flex-[2.2]">
                  <Folder className="w-3 h-3 shrink-0 text-fg-muted/25" />
                  <span className="truncate">~/Documents</span>
                </div>

                {/* Dropdowns pushed to the right */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Mode Dropdown */}
                  <div className="relative" ref={modeMenuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModeMenu(!showModeMenu);
                        setShowQualityMenu(false);
                        if (!interactionLocked) startUserMode();
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md transition-all text-[11px] font-mono font-bold tracking-wider border min-w-[176px]",
                        showModeMenu
                          ? `${tokens.bgFaint} ${tokens.text} ${tokens.borderFaint}`
                          : `border-white/8 text-fg-muted/55 hover:text-fg-muted hover:border-white/15 hover:bg-white/[0.03]`
                      )}
                    >
                      <ModeIcon className={cn("w-3.5 h-3.5", showModeMenu ? tokens.text : "")} />
                      <span className="hidden sm:inline">{modeMeta.shortLabel}</span>
                      {showModeMenu ? <ChevronUp className="w-3 h-3 opacity-60" /> : <ChevronDown className="w-3 h-3 opacity-60" />}
                    </button>

                    <AnimatePresence>
                      {showModeMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full right-0 mt-2 w-72 bg-bg-graphite-2 border border-white/12 rounded-lg shadow-2xl overflow-hidden z-50"
                        >
                          {(Object.entries(MODE_META) as [DemoMode, typeof MODE_META['memory']][]).map(([key, meta]) => {
                            const Icon = meta.icon;
                            const isActive = activeMode === key;
                            const modeTokens = MODE_TOKENS[key];
                            return (
                              <button
                                key={key}
                                onClick={(e) => { e.stopPropagation(); handleModeChange(key); }}
                                onMouseEnter={() => setHoveredMode(key)}
                                className={cn(
                                  "w-full text-left px-4 py-3 transition-all group",
                                  isActive
                                    ? `${modeTokens.bgFaint} border-l-2 ${modeTokens.border}`
                                    : "hover:bg-white/[0.04] border-l-2 border-transparent"
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <Icon className={cn("w-4 h-4 shrink-0", isActive ? modeTokens.text : "text-fg-muted/50 group-hover:text-fg-muted/70")} />
                                  <div className="min-w-0 flex-1">
                                    <div className={cn("text-sm font-semibold leading-tight", isActive ? "text-fg-porcelain" : "text-fg-muted group-hover:text-fg-porcelain")}>
                                      {meta.label}
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-fg-muted/55 leading-relaxed group-hover:text-fg-muted/70">
                                      {meta.description}
                                    </p>
                                  </div>
                                  {isActive && <span className={cn("ml-auto text-[9px] font-mono tracking-wider", modeTokens.text)}>ACTIVE</span>}
                                </div>
                              </button>
                            );
                          })}
                          <div className="min-h-[72px] px-4 py-3 border-t border-white/6 bg-bg-graphite-1">
                            <p className={cn("text-[10px] font-mono tracking-[0.12em] uppercase", tokens.text)}>
                              {hoveredModeMeta.shortLabel}
                            </p>
                            <p className="mt-1 text-[11px] text-fg-muted/65 leading-relaxed">
                              {hoveredModeMeta.detail}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Quality Dropdown */}
                  <div className="relative" ref={qualityMenuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQualityMenu(!showQualityMenu);
                        setShowModeMenu(false);
                        if (!interactionLocked) startUserMode();
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md transition-all text-[11px] font-mono font-bold tracking-wider border min-w-[176px]",
                        showQualityMenu
                          ? `${qualityMeta.bgFaint} ${qualityMeta.color} ${qualityMeta.borderFaint}`
                          : `border-white/8 text-fg-muted/55 hover:text-fg-muted hover:border-white/15 hover:bg-white/[0.03]`
                      )}
                    >
                      <QualityIcon className={cn("w-3.5 h-3.5", showQualityMenu ? qualityMeta.color : "")} />
                      <span>{qualityMeta.shortLabel}</span>
                      {showQualityMenu ? <ChevronUp className="w-3 h-3 opacity-60" /> : <ChevronDown className="w-3 h-3 opacity-60" />}
                    </button>

                    <AnimatePresence>
                      {showQualityMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full right-0 mt-2 w-72 bg-bg-graphite-2 border border-white/12 rounded-lg shadow-2xl overflow-hidden z-50"
                        >
                          {QUALITY_ORDER.map((quality) => {
                            const meta = QUALITY_META[quality];
                            const QualityIcon = meta.icon;
                            const isActive = activeQuality === quality;
                            return (
                              <button
                                key={quality}
                                onClick={(e) => { e.stopPropagation(); handleQualityChange(quality); }}
                                onMouseEnter={() => setHoveredQuality(quality)}
                                className={cn(
                                  "w-full text-left px-4 py-3 transition-all group",
                                  isActive
                                    ? `${meta.bgFaint} border-l-2 ${meta.borderFaint.replace('20', '40')}`
                                    : "hover:bg-white/[0.04] border-l-2 border-transparent"
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <QualityIcon className={cn("w-4 h-4 shrink-0", isActive ? meta.color : "text-fg-muted/50 group-hover:text-fg-muted/70")} />
                                  <div className="min-w-0 flex-1">
                                    <div className={cn("text-sm font-semibold leading-tight", isActive ? "text-fg-porcelain" : "text-fg-muted group-hover:text-fg-porcelain")}>
                                      {meta.label}
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-fg-muted/55 leading-relaxed group-hover:text-fg-muted/70">
                                      {meta.description}
                                    </p>
                                  </div>
                                  {quality === 'auto' && (
                                    <span className="text-[9px] px-1 py-px rounded bg-accent-teal/15 text-accent-teal shrink-0">
                                      Default
                                    </span>
                                  )}
                                  {isActive && <span className={cn("ml-auto text-[9px] font-mono tracking-wider", meta.color)}>ACTIVE</span>}
                                </div>
                              </button>
                            );
                          })}
                          <div className="min-h-[72px] px-4 py-3 border-t border-white/6 bg-bg-graphite-1">
                            <p className={cn("text-[10px] font-mono tracking-[0.12em] uppercase", hoveredQualityMeta.color)}>
                              {hoveredQualityMeta.shortLabel}
                            </p>
                            <p className="mt-1 text-[11px] text-fg-muted/65 leading-relaxed">
                              {hoveredQualityMeta.detail}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Status Bar */}
          <AnimatePresence>
            {(isSearching || results.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 bg-bg-graphite-2 rounded-lg border border-white/[0.06] px-3.5 py-2.5 flex items-center justify-between text-[11px] font-mono"
              >
                <div className="flex items-center gap-4">
                  {isSearching ? (
                    <div className="flex items-center gap-1">
                      {PIPELINE_STAGES.map((stage, i) => {
                        const stageKey = stage.toLowerCase() as 'scan' | 'embed' | 'rank';
                        const stageOrder = { scan: 0, embed: 1, rank: 2 };
                        const currentOrder = searchStage === 'idle' ? -1 : stageOrder[searchStage as keyof typeof stageOrder] ?? -1;
                        const isActive = stageKey === searchStage;
                        const isDone = currentOrder > stageOrder[stageKey];

                        return (
                          <span key={stage} className="flex items-center gap-1">
                            {i > 0 && <span className="text-fg-muted/20 mx-0.5">&rarr;</span>}
                            <span className={cn(
                              "px-1.5 py-0.5 rounded transition-all duration-200",
                              isActive ? `${tokens.bgFaint} ${tokens.text}` :
                              isDone ? "text-fg-muted/60" :
                              "text-fg-muted/25"
                            )}>
                              {stage}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full", tokens.bg)} />
                      <span className="text-fg-porcelain">Complete</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-fg-muted/30">
                  <span>{results.length} results</span>
                  <span className={tokens.text}>
                    {modeMeta.shortLabel}
                  </span>
                  <span className={qualityMeta.color}>
                    {qualityMeta.shortLabel}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="mt-5">
            <AnimatePresence mode="popLayout">
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between mb-2 px-1"
                >
                  <div className={cn("text-[10px] font-bold tracking-[0.2em] uppercase", tokens.text)}>Results</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-fg-muted/30 font-mono">
                    <Sparkles className="w-3 h-3" />
                    <span>SEMANTIC</span>
                  </div>
                </motion.div>
              )}
              {results.map((result, i) => (
                <DemoResultCard
                  key={`${result.filename}-${i}`}
                  result={result}
                  index={i}
                  activeMode={activeMode}
                  activeQuality={activeQuality}
                  isExpanded={expandedResult === i}
                  onToggleExpand={() => {
                    if (!interactionLocked) {
                      startUserMode();
                      setExpandedResult(expandedResult === i ? null : i);
                    }
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoResultCard({
  result,
  index,
  activeMode,
  activeQuality,
  isExpanded,
  onToggleExpand,
}: {
  result: DemoFile;
  index: number;
  activeMode: DemoMode;
  activeQuality: DemoQuality;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const scorePercent = Math.round(result.score * 100);
  const isSelected = index === 0;
  const tokens = MODE_TOKENS[activeMode];
  const qualityTokens = QUALITY_TOKENS[activeQuality];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        "group relative mb-1 rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden",
        isSelected
          ? `bg-bg-graphite-2/80 border-l-[3px] ${tokens.border} border-y-white/[0.04] border-r-white/[0.04] ${tokens.insetGlow}`
          : "bg-bg-graphite-1/40 border-white/[0.06] hover:bg-bg-graphite-2/50 hover:border-white/10"
      )}
      onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
    >
      {/* Left accent on hover for non-selected */}
      {!isSelected && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-0",
          tokens.bg
        )} />
      )}

      <div className="flex items-center gap-3.5 px-4 py-3">
        {/* Index */}
        <span className="text-fg-muted/25 font-mono text-[11px] w-4 shrink-0 text-right">{index + 1}</span>

        {/* File Icon */}
        {createElement(getFileIcon(result.fileExtension), {
          className: cn(
            "w-4 h-4 shrink-0 transition-colors",
            isSelected ? tokens.text : "text-fg-muted/40 group-hover:text-fg-muted/60"
          )
        })}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-semibold truncate",
              isSelected ? "text-fg-porcelain" : "text-fg-muted"
            )}>
              {result.filename}
            </span>
            {isSelected && (
              <span className={cn("shrink-0 px-1.5 py-0.5 text-[9px] rounded-full border font-mono tracking-wider",
                `${tokens.bgFaint} ${tokens.text} ${tokens.borderFaint}`
              )}>
                Best Match
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-fg-muted/25 font-mono mt-0.5">
            <span className="truncate">{result.directory}</span>
            <span className="shrink-0">&middot;</span>
            <span className="shrink-0">{result.fileSize}</span>
            <span className="shrink-0">&middot;</span>
            <span className="shrink-0">{result.modifiedAt}</span>
          </div>
        </div>

        {/* Score Badge */}
        <div className={cn(
          "px-2 py-0.5 rounded text-[11px] font-mono font-bold border shrink-0 tabular-nums",
          isSelected
            ? `${tokens.bgFaint} ${tokens.text} ${tokens.borderFaint}`
          : scorePercent >= 70
              ? `${qualityTokens.bgFaint} ${qualityTokens.text} ${qualityTokens.borderFaint}`
              : "bg-white/[0.02] text-fg-muted/30 border-white/[0.04]"
        )}>
          {scorePercent}%
        </div>

        {/* Expand chevron */}
        <ChevronDown className={cn(
          "w-3.5 h-3.5 shrink-0 transition-all",
          isExpanded ? "rotate-180" : "",
          isSelected ? "text-fg-muted/40" : "text-fg-muted/15 group-hover:text-fg-muted/30"
        )} />
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 ml-[52px] border-t border-white/[0.04]">
              <p className="text-[11px] text-fg-muted/55 leading-relaxed font-mono">
                {result.snippet}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.tags.map(tag => (
                  <span
                    key={tag}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] font-mono rounded border tracking-wider",
                      `${qualityTokens.bgFaint} ${qualityTokens.text} ${qualityTokens.borderFaint}`
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
