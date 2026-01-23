"use client";

import { cn } from "@/lib/utils";

/**
 * DividerLabel - Terminal Glass Design
 *
 * Section divider with comment-style label.
 * Creates section breaks with semantic markers ("// pipeline_sequence")
 */

interface DividerLabelProps {
    label: string;
    align?: "left" | "center" | "right";
    className?: string;
}

export function DividerLabel({
    label,
    align = "center",
    className,
}: DividerLabelProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-4 py-8",
                align === "center" && "justify-center",
                align === "left" && "justify-start",
                align === "right" && "justify-end",
                className
            )}
        >
            {/* Left line */}
            {(align === "center" || align === "right") && (
                <div className="flex-1 h-px bg-white/[0.06]" />
            )}

            {/* Label */}
            <span className="font-mono text-xs text-content-muted tracking-wider">
                // {label}
            </span>

            {/* Right line */}
            {(align === "center" || align === "left") && (
                <div className="flex-1 h-px bg-white/[0.06]" />
            )}
        </div>
    );
}

export default DividerLabel;
