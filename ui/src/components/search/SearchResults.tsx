import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageCircleQuestion } from 'lucide-react';
import { ResultCard } from './ResultCard';
import { ResultCardErrorBoundary } from './ResultCardErrorBoundary';
import { useStarredStore } from '@/stores/starredStore';
import { useSearchStore } from '@/stores/searchStore';
import { useClearLayoutOnChange } from '@/hooks/useLayoutSync';
import { cn } from '@/lib/utils';
import { sanitizeResults } from '@/lib/searchHistory';
import { getPrimaryMatchSignal } from '@/lib/matchClassification';
import { useAuthStore } from '@/stores/authStore';
import { hasProAccess } from '@/lib/proAccess';
import type { RankedResult, LexicalResult, SearchPhase } from '@/lib/types';

interface SearchResultsProps {
  results: (RankedResult | LexicalResult)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onOpen: () => void;
  onReveal: () => void;
  phase: SearchPhase;
  showStar?: boolean;
}

type SearchMode = 'ephemeral' | 'native-cache' | 'journalist';

function useStabilizedResults<T>(results: T[], phase: SearchPhase): T[] {
  const [displayResults, setDisplayResults] = useState(results);
  const latestRef = useRef(results);
  const lastUpdateRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    latestRef.current = results;

    if (results.length === 0 || phase === 'idle' || phase === 'complete') {
      setDisplayResults(results);
      return;
    }

    const now = performance.now();
    const elapsed = now - lastUpdateRef.current;
    const delay = Math.max(0, 140 - elapsed);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setDisplayResults(latestRef.current);
      lastUpdateRef.current = performance.now();
    }, delay);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [results, phase]);

  return displayResults;
}

export function SearchResults({
  results,
  selectedIndex,
  onSelect,
  onOpen,
  onReveal,
  phase,
  showStar = true,
}: SearchResultsProps) {
  const starred = useStarredStore();
  const searchStore = useSearchStore();
  const entitlement = useAuthStore((s) => s.entitlement);
  const entitlementToken = useAuthStore((s) => s.entitlementToken);
  const proStatus = useAuthStore((s) => s.proStatus);
  const isPro = hasProAccess(entitlement, entitlementToken, proStatus);
  const displayResults = useStabilizedResults(results, phase);
  const firstResult = displayResults[0] as RankedResult | LexicalResult | undefined;
  const hasSemanticResults = !!firstResult && 'scoreBreakdown' in firstResult;
  const isSemanticPhase = hasSemanticResults && (phase === 'semantic' || phase === 'refining' || phase === 'complete');
  const isLexicalFallbackDuringRefine =
    !hasSemanticResults &&
    (phase === 'semantic' || phase === 'refining') &&
    displayResults.length > 0;

  const getMatchType = (result: RankedResult | LexicalResult) => {
    if (!('scoreBreakdown' in result)) return undefined;
    return getPrimaryMatchSignal(result.scoreBreakdown).key;
  };

  useClearLayoutOnChange([displayResults.length]);

  // Check if current search is starred
  const currentThread = searchStore.activeThreadId
    ? starred.getThreadById(searchStore.activeThreadId)
    : undefined;
  const isStarred = currentThread?.starred ?? false;
  const canStar = phase === 'complete' && results.length > 0;

  // Determine active mode for coloring
  const mode: SearchMode = searchStore.deepSearchMode
    ? 'journalist'
    : searchStore.cacheMode;

  const handleStarClick = () => {
    if (!canStar) return;

    if (currentThread) {
      // Toggle existing star
      starred.toggleStar(currentThread.id);
    } else {
      // Add new starred thread (addThread auto-stars now)
      const threadMode = searchStore.deepSearchMode ? 'deep-search' : searchStore.cacheMode;
      const threadId = searchStore.activeThreadId ?? crypto.randomUUID();
      starred.recordThread({
        id: threadId,
        query: searchStore.query,
        directory: searchStore.directory,
        results: sanitizeResults(results as Array<RankedResult | LexicalResult>),
        timestamp: Date.now(),
        mode: threadMode,
        isAskMode: searchStore.isAskModeActive,
        resultCount: results.length,
        durationMs: searchStore.searchStartTime ? Date.now() - searchStore.searchStartTime : 0,
        starred: true,
      });
    }
  };

  // Use Ask Mode state from store
  const isAskMode = searchStore.isAskModeActive && isPro;

  return (
    <div>
      <div className="flex items-center justify-between py-4 px-1 border-b border-stroke-hairline/70 mb-2">
        <div>
          <span className="text-xs text-fg-dim">Results</span>
          <div className="text-sm text-porcelain mt-1 flex items-center gap-2">
            <span>
              {displayResults.length} {displayResults.length === 1 ? 'result' : 'results'}
            </span>
            {isSemanticPhase && <span className="text-accent-teal text-xs">Semantic ranking</span>}
            {isLexicalFallbackDuringRefine && (
              <span className="text-accent-amber text-xs">Quick results - ranking...</span>
            )}
            {isAskMode && isSemanticPhase && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent-violet/10 border border-accent-violet/30 shadow-[0_0_10px_rgba(167,139,250,0.15)] animate-pulse-subtle">
                <MessageCircleQuestion className="w-3.5 h-3.5 text-accent-violet" />
                <span className="text-[10px] font-bold text-accent-violet">Ask Mode active</span>
              </span>
            )}
          </div>
        </div>
        {showStar && (
          <button
            type="button"
            onClick={handleStarClick}
            disabled={!canStar}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-xs',
              'transition-all duration-150 border',
              isStarred
                ? 'text-accent-amber bg-accent-amber/10 border-accent-amber/30'
                : 'text-fg-dim hover:text-accent-amber hover:bg-graphite-3 border-transparent',
              !canStar && 'opacity-50 cursor-not-allowed'
            )}
            title={canStar ? (isStarred ? 'Remove from starred' : 'Star this search') : 'Finish search to star'}
          >
            <motion.span
              animate={{ scale: isStarred ? 1.08 : 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            >
              <Star className={cn('w-4 h-4', isStarred && 'fill-current')} />
            </motion.span>
            <span>{isStarred ? 'Starred' : 'Star'}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <AnimatePresence mode="popLayout">
          {displayResults.map((result, index) => (
            <motion.div
              key={result.path}
              layout="position"
              layoutId={result.path}
              initial={{ opacity: 0, x: 16, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -16, scale: 0.985 }}
              transition={{
                duration: 0.32,
                delay: Math.min(index * 0.02, 0.1),
                ease: [0.22, 1, 0.36, 1],
                layout: {
                  type: 'spring',
                  stiffness: 240,
                  damping: 30,
                  mass: 1,
                },
              }}
              style={{ originX: 0 }}
            >
              <ResultCardErrorBoundary>
                <ResultCard
                  result={result}
                  index={index}
                  isSelected={index === selectedIndex}
                  isSemanticResult={isSemanticPhase && 'scoreBreakdown' in result}
                  matchType={getMatchType(result)}
                  mode={mode}
                  isAskMode={isAskMode}
                  onSelect={() => onSelect(index)}
                  onOpen={onOpen}
                  onReveal={onReveal}
                />
              </ResultCardErrorBoundary>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
