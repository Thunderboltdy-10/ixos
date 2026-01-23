import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useSearchStore } from '@/stores/searchStore';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// Phase definitions matching SearchDeck stages
const PHASES = [
    { key: 'priming', label: 'Init' },
    { key: 'enumerating', label: 'Scan' },
    { key: 'reading', label: 'Read' },
    { key: 'embedding', label: 'Embed' },
    { key: 'scoring', label: 'Score' },
    { key: 'converging', label: 'Rank' },
] as const;

type PhaseKey = typeof PHASES[number]['key'] | 'done';

interface PhaseTimelineProps {
    className?: string;
}

export function PhaseTimeline({ className }: PhaseTimelineProps) {
    const phase = useSearchStore((s) => s.phase);
    const streamStage = useSearchStore((s) => s.streamStage);
    const streamStats = useSearchStore((s) => s.streamStats);
    const hasSearchIntent = useSearchStore((s) => s.hasSearchIntent);

    // Determine current stage (same logic as SearchDeck)
    const currentStage: PhaseKey = useMemo(() => {
        const isActive = phase === 'lexical' || phase === 'semantic';
        const isComplete = phase === 'complete';

        if (isComplete) return 'done';
        if (!isActive && hasSearchIntent) return 'priming';

        const stats = streamStats ?? { filesScanned: 0, candidates: 0, embedded: 0, cacheHits: 0 };

        if (streamStage === 'tail') return 'converging';
        if (streamStage === 'semantic') {
            if (stats.embedded > 0) return 'scoring';
            return 'embedding';
        }
        if (stats.filesScanned > 10) return 'reading';
        if (stats.filesScanned > 0) return 'enumerating';
        return 'priming';
    }, [phase, hasSearchIntent, streamStage, streamStats]);

    // Get phase index for progress comparison
    const getPhaseIndex = (key: string) => {
        const idx = PHASES.findIndex(p => p.key === key);
        return idx >= 0 ? idx : PHASES.length;
    };

    const currentIndex = currentStage === 'done' ? PHASES.length : getPhaseIndex(currentStage);
    const isComplete = phase === 'complete';

    return (
        <div className={cn("flex flex-col items-center gap-0", className)}>
            {PHASES.map((p, i) => {
                const isActive = i === currentIndex && !isComplete;
                const isCompleted = i < currentIndex || isComplete;

                return (
                    <div key={p.key} className="flex flex-col items-center">
                        {/* Connecting line (before node, except first) */}
                        {i > 0 && (
                            <motion.div
                                className="w-px h-3"
                                initial={{ opacity: 0 }}
                                animate={{
                                    opacity: isCompleted ? 0.4 : 0.15,
                                    backgroundColor: isCompleted ? 'rgba(13, 148, 136, 0.6)' : 'rgba(100, 116, 139, 0.3)'
                                }}
                                transition={{ duration: 0.3 }}
                            />
                        )}

                        {/* Node */}
                        <motion.div
                            className={cn(
                                "relative flex items-center justify-center",
                                "w-4 h-4 rounded-full",
                                "transition-colors duration-300"
                            )}
                            animate={{
                                backgroundColor: isCompleted
                                    ? 'rgba(13, 148, 136, 0.25)'
                                    : isActive
                                        ? 'rgba(6, 182, 212, 0.2)'
                                        : 'rgba(100, 116, 139, 0.1)',
                                boxShadow: isActive
                                    ? '0 0 8px rgba(6, 182, 212, 0.5)'
                                    : 'none'
                            }}
                        >
                            {/* Inner dot or checkmark */}
                            {isCompleted ? (
                                <Check className="w-2 h-2 text-accent-teal" />
                            ) : (
                                <motion.div
                                    className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        isActive ? "bg-accent-teal" : "bg-fg-dim/30"
                                    )}
                                    animate={isActive ? {
                                        scale: [1, 1.3, 1],
                                        opacity: [1, 0.7, 1]
                                    } : {}}
                                    transition={isActive ? {
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    } : {}}
                                />
                            )}

                            {isActive && (
                                <motion.div
                                    className="absolute inset-0 rounded-full border border-accent-teal/40"
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}
                        </motion.div>

                        <motion.span
                            className={cn(
                                "text-[8px] font-medium uppercase tracking-wider mt-0.5",
                                isCompleted ? "text-accent-teal/60" :
                                    isActive ? "text-accent-teal/80" :
                                        "text-fg-dim/20"
                            )}
                            animate={{ opacity: isActive || isCompleted ? 1 : 0.4 }}
                        >
                            {p.label}
                        </motion.span>
                    </div>
                );
            })}

            <motion.div
                className="w-px h-3"
                animate={{
                    opacity: isComplete ? 0.4 : 0.15,
                    backgroundColor: isComplete ? 'rgba(52, 211, 153, 0.6)' : 'rgba(100, 116, 139, 0.3)'
                }}
                transition={{ duration: 0.3 }}
            />

            <motion.div
                className={cn(
                    "flex items-center justify-center",
                    "w-4 h-4 rounded-full",
                    "transition-colors duration-300"
                )}
                animate={{
                    backgroundColor: isComplete ? 'rgba(52, 211, 153, 0.25)' : 'rgba(100, 116, 139, 0.1)',
                    boxShadow: isComplete ? '0 0 8px rgba(52, 211, 153, 0.4)' : 'none'
                }}
            >
                {isComplete ? (
                    <Check className="w-2.5 h-2.5 text-success" />
                ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-fg-dim/20" />
                )}
            </motion.div>
            <motion.span
                className={cn(
                    "text-[8px] font-medium uppercase tracking-wider mt-0.5",
                    isComplete ? "text-success/60" : "text-fg-dim/20"
                )}
            >
                Done
            </motion.span>
        </div>
    );
}
