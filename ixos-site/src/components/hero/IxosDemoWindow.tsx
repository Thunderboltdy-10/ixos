"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Loader2, Sparkles, Zap, Shield, ChevronDown, X, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFakeSearch, DEMO_QUERIES, type DemoFile } from './fakeSearch';
import { ArcNoiseBackground } from '@/components/effects/ArcNoiseBackground';

type DemoMode = 'jit' | 'cache' | 'journalist';
type DemoModel = 'Flash' | 'Pro' | 'Auto';

const MODELS: DemoModel[] = ['Auto', 'Flash', 'Pro'];

/**
 * Interactive Ixos demo for the landing page hero section
 * Authentic Desktop App Replica with full interactivity
 */
export function IxosDemoWindow({ onInteract }: { onInteract?: () => void }) {
  const [queryIndex, setQueryIndex] = useState(0);
  const [userQuery, setUserQuery] = useState<string | null>(null);
  const [isUserMode, setIsUserMode] = useState(false);
  const [typedText, setTypedText] = useState('');
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive States
  const [activeMode, setActiveMode] = useState<DemoMode>('jit');
  const [activeModel, setActiveModel] = useState<DemoModel>('Auto');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { search, results, isSearching, reset } = useFakeSearch();

  // Get current query
  const currentDemoQuery = DEMO_QUERIES[queryIndex].query;
  const displayQuery = isUserMode ? (userQuery || '') : typedText;

  // Auto-cycle through demo queries
  useEffect(() => {
    if (isUserMode) return;
    const timer = setInterval(() => setQueryIndex(i => (i + 1) % DEMO_QUERIES.length), 8000);
    return () => clearInterval(timer);
  }, [isUserMode]);

  // Typing animation for auto-cycle mode
  useEffect(() => {
    if (isUserMode) return;
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
  }, [queryIndex, isUserMode, currentDemoQuery, search, reset]);

  // Handle user interactions
  const startUserMode = useCallback(() => {
    if (!isUserMode) {
      setIsUserMode(true);
      onInteract?.();
      // Clear auto-typing state
      setTypedText('');
      if (!userQuery) setUserQuery('');
    }

    // Reset inactivity timer
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      setIsUserMode(false);
      setUserQuery(''); // Clear user query when returning to auto mode
    }, 5000);

    inputRef.current?.focus();
  }, [userQuery, isUserMode, onInteract]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    startUserMode(); // Reset timer on typing
    const value = e.target.value;
    setUserQuery(value);
    if (value.length >= 2) search(value);
    else reset();
  }, [search, reset, startUserMode]);

  const handleModeChange = (mode: DemoMode) => {
    setActiveMode(mode);
    startUserMode(); // Switch to user mode if they interact with controls
  };

  const getThemeColor = () => {
    switch (activeMode) {
      case 'jit': return 'text-[#F6B94C] border-[#F6B94C] selection:bg-[#F6B94C]/20';
      case 'cache': return 'text-[#14B8A6] border-[#14B8A6] selection:bg-[#14B8A6]/20';
      case 'journalist': return 'text-[#A78BFA] border-[#A78BFA] selection:bg-[#A78BFA]/20';
      default: return 'text-zinc-400';
    }
  };

  const getGlowColor = () => {
    switch (activeMode) {
      case 'jit': return 'shadow-[0_0_30px_rgba(246,185,76,0.15)]';
      case 'cache': return 'shadow-[0_0_30px_rgba(20,184,166,0.15)]';
      case 'journalist': return 'shadow-[0_0_30px_rgba(167,139,250,0.15)]';
      default: return '';
    }
  };

  // Base hex for inline styles
  const getHexColor = () => {
    switch (activeMode) {
      case 'jit': return '#F6B94C';
      case 'cache': return '#14B8A6';
      case 'journalist': return '#A78BFA';
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-[#050507] rounded-xl overflow-hidden border border-white/10 relative shadow-2xl"
      onClick={startUserMode} // Click anywhere to take control
    >
      <ArcNoiseBackground />

      {/* Floating "TRY ME" Note */}


      {/* Window Controls */}
      <div className="relative z-20 flex items-center justify-end px-4 py-3 gap-2 border-b border-white/5 bg-[#050507]/50 backdrop-blur-sm">
        <div className="w-full absolute top-0 left-0 h-10 app-drag-region" />
        <div className="flex gap-1.5 z-30">
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center p-6 md:p-12 transition-all duration-300">
        <div
          className={cn(
            "w-full max-w-3xl relative transition-all duration-300 z-30",
            results.length > 0 ? "mt-0" : "mt-[10%]"
          )}
        >
          <div
            className={cn(
              "relative bg-[#0A0C10] border rounded-xl transition-all duration-300",
              (isSearching || displayQuery.length > 0)
                ? `border-opacity-50 ${getThemeColor()} ${getGlowColor()}`
                : "border-white/10 hover:border-white/20"
            )}
          >
            <div className="flex flex-col">
              <div className="flex items-center px-4 py-4 gap-4">
                <Search className={cn(
                  "w-5 h-5 transition-colors",
                  displayQuery.length > 0 ? getThemeColor().split(' ')[0] : "text-zinc-500"
                )} />

                <input
                  ref={inputRef}
                  type="text"
                  value={displayQuery}
                  onChange={handleChange}
                  onClick={startUserMode}
                  placeholder={isUserMode ? "Type your query..." : "Type what you remember..."}
                  className={cn(
                    "flex-1 bg-transparent text-[#F3F5F7] text-lg font-medium placeholder:text-zinc-600 focus:outline-none",
                    `caret-[${getHexColor()}]`
                  )}
                  readOnly={!isUserMode}
                />

                {/* Controls */}
                <div className="flex items-center gap-2 md:gap-4 text-xs font-mono text-zinc-500">
                  {/* Model Selector */}
                  <div className="relative hidden md:block">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowModelMenu(!showModelMenu); startUserMode(); }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                      <Sparkles className="w-3 h-3 text-[#14B8A6]" />
                      <span>{activeModel.toUpperCase()}</span>
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </button>
                    {showModelMenu && (
                      <div className="absolute top-full right-0 mt-2 w-24 bg-[#12151A] border border-white/10 rounded-md shadow-xl overflow-hidden py-1 z-50">
                        {MODELS.map(m => (
                          <button
                            key={m}
                            onClick={() => { setActiveModel(m); setShowModelMenu(false); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center bg-white/5 rounded-lg p-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleModeChange('jit'); }}
                      className={cn(
                        "px-2 py-1 rounded-md transition-all flex items-center gap-1.5",
                        activeMode === 'jit' ? "bg-[#F6B94C]/10 text-[#F6B94C] shadow-sm" : "hover:text-zinc-300"
                      )}
                      title="Just-In-Time"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline font-bold tracking-wider">JIT</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleModeChange('cache'); }}
                      className={cn(
                        "px-2 py-1 rounded-md transition-all flex items-center gap-1.5",
                        activeMode === 'cache' ? "bg-[#14B8A6]/10 text-[#14B8A6] shadow-sm" : "hover:text-zinc-300"
                      )}
                      title="Cached Mode"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span className="hidden sm:inline font-bold tracking-wider">CACHE</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleModeChange('journalist'); }}
                      className={cn(
                        "px-2 py-1 rounded-md transition-all flex items-center gap-1.5",
                        activeMode === 'journalist' ? "bg-[#A78BFA]/10 text-[#A78BFA] shadow-sm" : "hover:text-zinc-300"
                      )}
                      title="Journalist Mode"
                    >
                      <Shield className="w-3 h-3" />
                      <span className="hidden sm:inline font-bold tracking-wider">JOURNALIST</span>
                    </button>
                  </div>
                </div>

                {displayQuery.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setUserQuery(''); setTypedText(''); inputRef.current?.focus(); }}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="px-14 pb-3 flex items-center justify-between text-xs font-mono text-zinc-600">
                <span>C:\Users\pablo\Downloads\Ixos\dataset</span>
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <AnimatePresence>
            {(isSearching || results.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 bg-[#12151A] rounded-lg border border-white/5 p-3 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-3 text-zinc-400">
                  {isSearching ? (
                    <>
                      <Loader2 className={cn("w-3.5 h-3.5 animate-spin", getThemeColor().split(' ')[0])} />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center", `border-[${getHexColor()}]`)}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", `bg-[${getHexColor()}]`)} />
                      </div>
                      <span className="text-[#F3F5F7]">Finalizing results</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-zinc-600">
                  <span>{results.length} results</span>
                  <span className={cn(getThemeColor().split(' ')[0])}>{activeMode.toUpperCase()}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Area */}
          <div className="mt-8">
            <AnimatePresence mode="popLayout">
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between mb-2 px-1"
                >
                  <div className={cn("text-xs font-bold tracking-[0.2em]", getThemeColor().split(' ')[0])}>RESULTS</div>
                  <div className="flex items-center gap-1 text-xs text-zinc-600 font-mono">
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
                  color={getHexColor()}
                />
              ))}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}

function DemoResultCard({ result, index, activeMode, color }: { result: DemoFile; index: number; activeMode: DemoMode; color: string }) {
  const scorePercent = Math.round(result.score * 100);
  const isSelected = index === 0;

  // Colors
  const activeClass = activeMode === 'jit'
    ? "border-l-[#F6B94C] border-y-[#F6B94C]/10 border-r-[#F6B94C]/10 shadow-[inset_0_1px_0_rgba(246,185,76,0.1)]"
    : activeMode === 'cache'
      ? "border-l-[#14B8A6] border-y-[#14B8A6]/10 border-r-[#14B8A6]/10 shadow-[inset_0_1px_0_rgba(20,184,166,0.1)]"
      : "border-l-[#A78BFA] border-y-[#A78BFA]/10 border-r-[#A78BFA]/10 shadow-[inset_0_1px_0_rgba(167,139,250,0.1)]";

  const textColor = activeMode === 'jit' ? "text-[#F6B94C]" : activeMode === 'cache' ? "text-[#14B8A6]" : "text-[#A78BFA]";
  const bgBadge = activeMode === 'jit' ? "bg-[#F6B94C]/10 border-[#F6B94C]/20" : activeMode === 'cache' ? "bg-[#14B8A6]/10 border-[#14B8A6]/20" : "bg-[#A78BFA]/10 border-[#A78BFA]/20";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        "group relative flex items-center gap-4 px-5 py-4 mb-1 rounded-lg border transition-all duration-200 cursor-default",
        isSelected
          ? `bg-[#12151A] border-l-2 ${activeClass}`
          : "bg-[#0A0C10]/40 border-white/5 hover:bg-[#12151A] hover:border-white/10"
      )}
    >
      <span className="text-zinc-600 font-mono text-xs w-4">{index + 1}</span>
      <FileText className={cn(
        "w-4 h-4 flex-shrink-0 transition-colors",
        isSelected ? textColor : "text-zinc-500 group-hover:text-zinc-400"
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-sm font-medium truncate",
            isSelected ? "text-[#F3F5F7]" : "text-zinc-300"
          )}>
            {result.filename}
          </span>
        </div>
        <div className="text-xs text-zinc-600 truncate font-mono mt-0.5">
          {result.directory}
        </div>
      </div>
      <div className={cn(
        "px-2 py-0.5 rounded text-xs font-mono font-bold border",
        isSelected
          ? `${bgBadge} ${textColor}`
          : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50"
      )}>
        {scorePercent}%
      </div>
    </motion.div>
  );
}
