"use client";

import { cn } from "@/lib/utils";

/**
 * TerminalWindow - Terminal Glass Design
 *
 * macOS-style terminal window with:
 * - Traffic light dots (red, yellow, green)
 * - Centered title in monospace
 * - Optional coordinate label
 * - Optional progress bar
 */

interface TerminalWindowProps {
    children: React.ReactNode;
    title?: string;
    coords?: string;
    progress?: number; // 0-100
    className?: string;
    sticky?: boolean;
}

export function TerminalWindow({
    children,
    title = "terminal",
    coords,
    progress,
    className,
    sticky = false,
}: TerminalWindowProps) {
    return (
        <div
            className={cn(
                "relative bg-surface-1 border border-white/[0.06] overflow-hidden",
                sticky && "sticky top-20",
                className
            )}
        >
            {/* Coordinate Label */}
            {coords && (
                <span className="absolute -top-6 right-2 font-mono text-xs text-brand-teal/60">
                    {coords}
                </span>
            )}

            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b border-white/[0.04] bg-surface-0/50">
                {/* Traffic Lights */}
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80 hover:brightness-110 transition-all" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]/80 hover:brightness-110 transition-all" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]/80 hover:brightness-110 transition-all" />
                </div>

                {/* Title */}
                <span className="flex-1 text-center font-mono text-xs text-content-muted">
                    {title}
                </span>

                {/* Coords badge (right side) */}
                {coords && (
                    <span className="font-mono text-xs text-brand-teal">
                        {coords}
                    </span>
                )}

                {/* Spacer to balance traffic lights */}
                {!coords && <div className="w-[52px]" />}
            </div>

            {/* Content */}
            <div className="p-4 font-mono text-sm leading-relaxed text-content-secondary">
                {children}
            </div>

            {/* Progress Bar (optional) */}
            {typeof progress === "number" && (
                <div className="h-0.5 bg-surface-2">
                    <div
                        className="h-full bg-brand-teal transition-all duration-200 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}

export default TerminalWindow;
