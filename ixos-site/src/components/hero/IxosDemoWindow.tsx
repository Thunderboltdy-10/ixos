"use client";

import { useState, useEffect, useCallback, useRef, createElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Zap, Shield, ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFakeSearch, DEMO_QUERIES, type DemoFile, type PauseAtStage } from './fakeSearch';
import { getFileIcon } from './fileIcons';

type DemoMode = 'memory' | 'local' | 'deep-search';
type DemoModel = 'Ixos Flash' | 'Ixos Pro';

const MODELS: DemoModel[] = ['Ixos Flash', 'Ixos Pro'];
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
}

/**
 * Interactive Ixos demo - desktop-faithful replica
 */
export function IxosDemoWindow({ onInteract, controlledStep = null }: IxosDemoWindowProps) {
  const [syncClock, setSyncClock] = useState(() => Date.now());
  const [userQuery, setUserQuery] = useState<string | null>(null);
  const [isUserMode, setIsUserMode] = useState(false);
  const [typedText, setTypedText] = useState('');
  const previousControlledStepRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeMode, setActiveMode] = useState<DemoMode>('local');
  const [activeModel, setActiveModel] = useState<DemoModel>('Ixos Flash');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { search, results, isSearching, searchStage, reset, setPauseAtStage } = useFakeSearch();
  const tokens = MODE_TOKENS[activeMode];
  const isControlled = controlledStep !== null && controlledStep !== undefined;
  const queryIndex = isControlled ? 0 : Math.floor(syncClock / QUERY_CYCLE_MS) % DEMO_QUERIES.length;

  const currentDemoQuery = isControlled ? SCROLL_GUIDED_QUERY : DEMO_QUERIES[queryIndex].query;
  const displayQuery = isUserMode ? (userQuery || '') : typedText;
  // Controlled step: lock demo progression to scroll stage without autonomous loops.
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

    if (step === 3) {
      setActiveMode('deep-search');
    } else {
      setActiveMode(prev => (prev === 'deep-search' ? 'local' : prev));
    }

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

  // Keep all demo instances synchronized on the same query cycle.
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
      // Scroll-guided mode: no autonomous looping queries.
      if (controlledStep !== 0) {
        return;
      }
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
      setShowModelMenu(false);
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
    if (value.length >= 2) search(value);
    else reset();
  }, [search, reset, startUserMode]);

  const handleModeChange = (mode: DemoMode) => {
    setActiveMode(mode);
    startUserMode();
  };

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-bg-graphite-0 shadow-2xl",
        isControlled && "pointer-events-none select-none"
      )}
      onClick={isControlled ? undefined : startUserMode}
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
                  onClick={startUserMode}
                  placeholder="Search your files..."
                  className={cn(
                    "flex-1 bg-transparent text-fg-porcelain text-base font-medium placeholder:text-fg-muted/30 focus:outline-none",
                    tokens.selection
                  )}
                  readOnly={!isUserMode}
                />

                {/* Controls */}
                <div className="flex items-center gap-2 md:gap-3 text-[11px] font-mono text-fg-muted/40">
                  {/* Model Selector */}
                  <div className="relative hidden md:block">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowModelMenu(!showModelMenu); startUserMode(); }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-colors text-fg-muted/60 hover:text-fg-muted"
                    >
                      <Sparkles className={cn("w-3 h-3", tokens.text)} />
                      <span>{activeModel}</span>
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </button>
                    {showModelMenu && (
                      <div className="absolute top-full right-0 mt-2 w-36 bg-bg-graphite-2 border border-white/10 rounded-md shadow-xl overflow-hidden py-1 z-50">
                        {MODELS.map(m => (
                          <button
                            key={m}
                            onClick={() => { setActiveModel(m); setShowModelMenu(false); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-fg-muted hover:text-fg-porcelain transition-colors"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleModeChange('memory'); }}
                      className={cn(
                        "px-2 py-1 rounded-md transition-all flex items-center gap-1.5",
                        activeMode === 'memory' ? `${MODE_TOKENS.memory.bgFaint} ${MODE_TOKENS.memory.text} shadow-sm` : "hover:text-fg-muted"
                      )}
                      title="Memory Mode"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline font-bold tracking-wider">MEMORY</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleModeChange('local'); }}
                      className={cn(
                        "px-2 py-1 rounded-md transition-all flex items-center gap-1.5",
                        activeMode === 'local' ? `${MODE_TOKENS.local.bgFaint} ${MODE_TOKENS.local.text} shadow-sm` : "hover:text-fg-muted"
                      )}
                      title="Local Mode"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span className="hidden sm:inline font-bold tracking-wider">LOCAL</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleModeChange('deep-search'); }}
                      className={cn(
                        "px-2 py-1 rounded-md transition-all flex items-center gap-1.5",
                        activeMode === 'deep-search' ? `${MODE_TOKENS['deep-search'].bgFaint} ${MODE_TOKENS['deep-search'].text} shadow-sm` : "hover:text-fg-muted"
                      )}
                      title="Deep Search Mode"
                    >
                      <Shield className="w-3 h-3" />
                      <span className="hidden sm:inline font-bold tracking-wider">DEEP SEARCH</span>
                    </button>
                  </div>
                </div>

                {displayQuery.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setUserQuery(''); setTypedText(''); reset(); inputRef.current?.focus(); }}
                    className="text-fg-muted/40 hover:text-fg-porcelain transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="px-12 pb-2.5 flex items-center text-[10px] font-mono text-fg-muted/25 tracking-wide">
                <span>~/Documents</span>
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
                  {/* Mini pipeline stages */}
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
                    {activeMode === "memory"
                      ? "MEMORY"
                      : activeMode === "local"
                        ? "LOCAL"
                        : "DEEP SEARCH"}
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
                />
              ))}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * Desktop-faithful result card
 */
function DemoResultCard({ result, index, activeMode }: { result: DemoFile; index: number; activeMode: DemoMode }) {
  const scorePercent = Math.round(result.score * 100);
  const isSelected = index === 0;
  const tokens = MODE_TOKENS[activeMode];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        "group relative flex items-center gap-3.5 px-4 py-3 mb-1 rounded-lg border transition-all duration-200 cursor-default overflow-hidden",
        isSelected
          ? `bg-bg-graphite-2/80 border-l-[3px] ${tokens.border} border-y-white/[0.04] border-r-white/[0.04] ${tokens.insetGlow}`
          : "bg-bg-graphite-1/40 border-white/[0.06] hover:bg-bg-graphite-2/50 hover:border-white/10"
      )}
    >
      {/* Left accent on hover for non-selected */}
      {!isSelected && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-0",
          tokens.bg
        )} />
      )}

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
            <span className="shrink-0 px-1.5 py-0.5 text-[9px] rounded-full bg-accent-teal/10 text-accent-teal border border-accent-teal/25 font-mono tracking-wider">
              Semantic
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
            ? `bg-white/[0.04] text-fg-muted/50 border-white/[0.06]`
            : "bg-white/[0.02] text-fg-muted/30 border-white/[0.04]"
      )}>
        {scorePercent}%
      </div>

      {/* Chevron */}
      <ChevronRight className={cn(
        "w-3.5 h-3.5 shrink-0 transition-colors",
        isSelected ? "text-fg-muted/40" : "text-fg-muted/15 group-hover:text-fg-muted/30"
      )} />
    </motion.div>
  );
}

