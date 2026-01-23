"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

// Register GSAP plugins
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/**
 * HeroCinematic - Scroll-driven search animation
 *
 * Visualizes the Ixos search pipeline:
 * 1. Hotkey chord appears (Ctrl+Shift+Space)
 * 2. Query types itself
 * 3. Fake loader flashes then cuts
 * 4. Lexical results stream in
 * 5. Candidates narrow/compress
 * 6. Semantic reorder with drift
 * 7. Final results with scores
 */

interface SearchResult {
    id: number;
    filename: string;
    path: string;
    lexicalScore: number;
    semanticScore: number;
    finalScore: number;
    isRelevant: boolean;
}

// Simulated search results
const MOCK_RESULTS: SearchResult[] = [
    { id: 1, filename: "Q1_2026_budget_report.xlsx", path: "~/Documents/Finance/", lexicalScore: 0.92, semanticScore: 0.94, finalScore: 0.94, isRelevant: true },
    { id: 2, filename: "quarterly_review_march.docx", path: "~/Documents/Reports/", lexicalScore: 0.88, semanticScore: 0.89, finalScore: 0.89, isRelevant: true },
    { id: 3, filename: "budget_planning_notes.md", path: "~/Documents/Notes/", lexicalScore: 0.75, semanticScore: 0.82, finalScore: 0.82, isRelevant: true },
    { id: 4, filename: "march_meeting_transcript.txt", path: "~/Documents/Meetings/", lexicalScore: 0.71, semanticScore: 0.78, finalScore: 0.78, isRelevant: true },
    { id: 5, filename: "financial_overview_2026.pdf", path: "~/Documents/Finance/", lexicalScore: 0.65, semanticScore: 0.75, finalScore: 0.75, isRelevant: true },
    { id: 6, filename: "report_template.docx", path: "~/Documents/Templates/", lexicalScore: 0.82, semanticScore: 0.45, finalScore: 0.52, isRelevant: false },
    { id: 7, filename: "budget_archive_2025.zip", path: "~/Documents/Archive/", lexicalScore: 0.78, semanticScore: 0.42, finalScore: 0.48, isRelevant: false },
    { id: 8, filename: "quarterly_data_backup.sql", path: "~/Documents/Backups/", lexicalScore: 0.68, semanticScore: 0.38, finalScore: 0.44, isRelevant: false },
];

const QUERY_TEXT = "quarterly budget report";

export function HeroCinematic() {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const hotkeyRef = useRef<HTMLDivElement>(null);
    const queryRef = useRef<HTMLSpanElement>(null);
    const loaderRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const timingRef = useRef<HTMLSpanElement>(null);
    const traceRef = useRef<SVGPathElement>(null);
    const resultRefs = useRef<(HTMLDivElement | null)[]>([]);

    const [phase, setPhase] = useState<'idle' | 'hotkey' | 'typing' | 'loading' | 'lexical' | 'narrowing' | 'semantic' | 'complete'>('idle');
    const [displayedQuery, setDisplayedQuery] = useState("");
    const [timing, setTiming] = useState(0);
    const [visibleResults, setVisibleResults] = useState<number[]>([]);

    useGSAP(() => {
        if (!containerRef.current || !terminalRef.current) return;

        // Create main scroll-triggered timeline
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top 80%",
                end: "bottom 20%",
                scrub: 0.8,
                onUpdate: (self) => {
                    const progress = self.progress;

                    // Phase transitions based on scroll progress
                    if (progress < 0.1) setPhase('idle');
                    else if (progress < 0.2) setPhase('hotkey');
                    else if (progress < 0.35) setPhase('typing');
                    else if (progress < 0.4) setPhase('loading');
                    else if (progress < 0.55) setPhase('lexical');
                    else if (progress < 0.7) setPhase('narrowing');
                    else if (progress < 0.85) setPhase('semantic');
                    else setPhase('complete');
                }
            }
        });

        // Hotkey chord animation
        tl.fromTo(hotkeyRef.current,
            { opacity: 0, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.1 },
            0
        );

        // Terminal fade in
        tl.fromTo(terminalRef.current,
            { opacity: 0.5, y: 20 },
            { opacity: 1, y: 0, duration: 0.1 },
            0.05
        );

        // Hotkey fade out
        tl.to(hotkeyRef.current,
            { opacity: 0, scale: 0.95, duration: 0.05 },
            0.15
        );

        // Animate results container
        tl.fromTo(resultsRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.1 },
            0.35
        );

        // Electric trace animation
        if (traceRef.current) {
            tl.fromTo(traceRef.current,
                { strokeDashoffset: 1000 },
                { strokeDashoffset: 0, duration: 0.2 },
                0.8
            );
        }

    }, { scope: containerRef });

    // Handle query typing animation
    useEffect(() => {
        if (phase === 'typing') {
            const charIndex = Math.floor(((Date.now() % 2000) / 2000) * QUERY_TEXT.length);
            setDisplayedQuery(QUERY_TEXT.slice(0, charIndex + 1));
        } else if (phase === 'loading' || phase === 'lexical' || phase === 'narrowing' || phase === 'semantic' || phase === 'complete') {
            setDisplayedQuery(QUERY_TEXT);
        } else {
            setDisplayedQuery("");
        }
    }, [phase]);

    // Handle timing updates
    useEffect(() => {
        switch (phase) {
            case 'idle':
            case 'hotkey':
            case 'typing':
                setTiming(0);
                break;
            case 'loading':
                setTiming(12);
                break;
            case 'lexical':
                setTiming(48);
                break;
            case 'narrowing':
                setTiming(95);
                break;
            case 'semantic':
                setTiming(145);
                break;
            case 'complete':
                setTiming(181);
                break;
        }
    }, [phase]);

    // Handle visible results
    useEffect(() => {
        switch (phase) {
            case 'idle':
            case 'hotkey':
            case 'typing':
            case 'loading':
                setVisibleResults([]);
                break;
            case 'lexical':
                setVisibleResults([0, 1, 2, 3, 4, 5, 6, 7]);
                break;
            case 'narrowing':
                setVisibleResults([0, 1, 2, 3, 4, 5, 6, 7]);
                break;
            case 'semantic':
            case 'complete':
                setVisibleResults([0, 1, 2, 3, 4]);
                break;
        }
    }, [phase]);

    return (
        <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
            {/* Hotkey Chord Overlay */}
            <div
                ref={hotkeyRef}
                className={cn(
                    "absolute -top-16 left-1/2 -translate-x-1/2 z-20",
                    "flex items-center gap-1 opacity-0"
                )}
            >
                <kbd className="px-2 py-1 bg-surface-2 border border-white/10 rounded text-xs font-mono text-content-muted">Ctrl</kbd>
                <span className="text-content-muted">+</span>
                <kbd className="px-2 py-1 bg-surface-2 border border-white/10 rounded text-xs font-mono text-content-muted">Shift</kbd>
                <span className="text-content-muted">+</span>
                <kbd className="px-2 py-1 bg-surface-2 border border-white/10 rounded text-xs font-mono text-content-muted">Space</kbd>
            </div>

            {/* Terminal Window */}
            <div
                ref={terminalRef}
                className="relative bg-[#050506] border border-white/[0.06] rounded-lg overflow-hidden shadow-2xl"
            >
                {/* Terminal Header */}
                <div className="flex items-center px-4 py-3 border-b border-white/[0.04] bg-[#030304]">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80" />
                        <div className="w-3 h-3 rounded-full bg-[#febc2e]/80" />
                        <div className="w-3 h-3 rounded-full bg-[#28c840]/80" />
                    </div>
                    <span className="flex-1 text-center font-mono text-xs text-content-muted">
                        ixos search
                    </span>
                    {/* Timing Indicator */}
                    <span
                        ref={timingRef}
                        className={cn(
                            "font-mono text-xs transition-colors duration-200",
                            timing > 0 ? "text-brand-teal" : "text-content-muted"
                        )}
                    >
                        {timing > 0 ? `${timing}ms` : "ready"}
                    </span>
                </div>

                {/* Search Input */}
                <div className="px-4 py-3 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                        <span className="text-brand-teal font-mono text-sm">$</span>
                        <span className="text-content-secondary font-mono text-sm">ixos search</span>
                        <span className="text-white font-mono text-sm">
                            "{displayedQuery}
                            <span className={cn(
                                "inline-block w-[2px] h-4 bg-brand-teal ml-0.5 align-middle",
                                phase === 'typing' ? "animate-type-cursor" : "opacity-0"
                            )} />
                            {(phase !== 'typing' && phase !== 'idle' && phase !== 'hotkey') && '"'}
                        </span>
                    </div>
                </div>

                {/* Loader */}
                <div
                    ref={loaderRef}
                    className={cn(
                        "px-4 py-2 transition-opacity duration-100",
                        phase === 'loading' ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" />
                        <span className="font-mono text-xs text-content-muted">Scanning...</span>
                    </div>
                </div>

                {/* Results */}
                <div
                    ref={resultsRef}
                    className={cn(
                        "px-2 py-2 space-y-0.5 min-h-[200px] transition-opacity duration-200",
                        visibleResults.length > 0 ? "opacity-100" : "opacity-0"
                    )}
                >
                    {MOCK_RESULTS.map((result, index) => {
                        const isVisible = visibleResults.includes(index);
                        const isFading = phase === 'narrowing' && !result.isRelevant;
                        const isReordering = phase === 'semantic' || phase === 'complete';
                        const showScore = phase === 'complete';

                        // Calculate position for semantic reordering
                        let translateY = 0;
                        if (isReordering && !result.isRelevant) {
                            translateY = 100; // Move non-relevant items down (off-screen)
                        }

                        return (
                            <div
                                key={result.id}
                                ref={(el) => { resultRefs.current[index] = el; }}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-1.5 rounded transition-all duration-300",
                                    "font-mono text-xs",
                                    isVisible ? "opacity-100" : "opacity-0",
                                    isFading ? "opacity-30 scale-[0.98]" : "",
                                    result.isRelevant && isReordering ? "bg-brand-teal/5 border border-brand-teal/10" : "border border-transparent",
                                    !result.isRelevant && isReordering ? "hidden" : ""
                                )}
                                style={{
                                    transform: `translateY(${translateY}px)`,
                                    transitionDelay: `${index * 30}ms`
                                }}
                            >
                                {/* File Icon */}
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    result.isRelevant ? "bg-brand-teal" : "bg-content-muted"
                                )} />

                                {/* Filename */}
                                <span className={cn(
                                    "flex-1 truncate",
                                    result.isRelevant ? "text-white" : "text-content-muted"
                                )}>
                                    {result.filename}
                                </span>

                                {/* Path */}
                                <span className="text-content-muted truncate max-w-[120px]">
                                    {result.path}
                                </span>

                                {/* Score */}
                                <span className={cn(
                                    "w-12 text-right transition-opacity duration-300",
                                    showScore ? "opacity-100" : "opacity-0",
                                    result.isRelevant ? "text-brand-teal" : "text-content-muted"
                                )}>
                                    {result.finalScore.toFixed(2)}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Stage Indicator */}
                <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <StageIndicator
                            label="LEXICAL"
                            active={phase === 'lexical' || phase === 'narrowing' || phase === 'semantic' || phase === 'complete'}
                            current={phase === 'lexical'}
                        />
                        <StageIndicator
                            label="FILTER"
                            active={phase === 'narrowing' || phase === 'semantic' || phase === 'complete'}
                            current={phase === 'narrowing'}
                        />
                        <StageIndicator
                            label="SEMANTIC"
                            active={phase === 'semantic' || phase === 'complete'}
                            current={phase === 'semantic'}
                        />
                        <StageIndicator
                            label="RANKED"
                            active={phase === 'complete'}
                            current={phase === 'complete'}
                        />
                    </div>
                    <span className="mono-caps">
                        {phase === 'complete' ? '5 results' : phase === 'lexical' || phase === 'narrowing' ? '8 candidates' : ''}
                    </span>
                </div>
            </div>

            {/* Electric Trace SVG */}
            <svg
                className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[2px] h-20 overflow-visible"
                viewBox="0 0 2 80"
            >
                <path
                    ref={traceRef}
                    d="M 1 0 L 1 80"
                    stroke="var(--accent-primary)"
                    strokeWidth="1"
                    fill="none"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                    opacity="0.4"
                />
            </svg>
        </div>
    );
}

function StageIndicator({
    label,
    active,
    current
}: {
    label: string;
    active: boolean;
    current: boolean;
}) {
    return (
        <div className={cn(
            "flex items-center gap-1.5 transition-all duration-200",
            active ? "opacity-100" : "opacity-30"
        )}>
            <div className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors duration-200",
                current ? "bg-brand-teal animate-pulse" : active ? "bg-brand-teal/60" : "bg-content-muted"
            )} />
            <span className={cn(
                "mono-caps transition-colors duration-200",
                current ? "text-brand-teal" : active ? "text-content-secondary" : ""
            )}>
                {label}
            </span>
        </div>
    );
}

export default HeroCinematic;
