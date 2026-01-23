"use client";

import { cn } from "@/lib/utils";

/**
 * CornerBracketCard - Terminal Glass Design
 *
 * Card with corner brackets that create a "blueprint/CAD" aesthetic.
 * Features:
 * - 16px corner brackets positioned at each corner
 * - Optional coordinate label [x,y] above the card
 * - Subtle border that highlights on hover
 * - Monospace accent text
 */

interface CornerBracketCardProps {
    children: React.ReactNode;
    className?: string;
    coords?: string; // e.g., "[0,1]"
    accentColor?: "teal" | "indigo" | "gradient";
    size?: "sm" | "md" | "lg";
}

export function CornerBracketCard({
    children,
    className,
    coords,
    accentColor = "teal",
    size = "md",
}: CornerBracketCardProps) {
    const bracketColors = {
        teal: "border-brand-teal/40",
        indigo: "border-brand-purple/40",
        gradient: "border-brand-teal/40", // Will use gradient via pseudo-elements
    };

    const sizes = {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
    };

    return (
        <div className="relative">
            {/* Coordinate Label */}
            {coords && (
                <span className="absolute -top-6 left-2 font-mono text-xs text-brand-teal/60">
                    {coords}
                </span>
            )}

            {/* Card */}
            <div
                className={cn(
                    "relative bg-surface-1/60 border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-200",
                    sizes[size],
                    className
                )}
            >
                {/* Corner Brackets */}
                {/* Top Left */}
                <span
                    className={cn(
                        "absolute -top-px -left-px w-4 h-4 border-t border-l",
                        bracketColors[accentColor]
                    )}
                />
                {/* Top Right */}
                <span
                    className={cn(
                        "absolute -top-px -right-px w-4 h-4 border-t border-r",
                        bracketColors[accentColor]
                    )}
                />
                {/* Bottom Left */}
                <span
                    className={cn(
                        "absolute -bottom-px -left-px w-4 h-4 border-b border-l",
                        bracketColors[accentColor]
                    )}
                />
                {/* Bottom Right */}
                <span
                    className={cn(
                        "absolute -bottom-px -right-px w-4 h-4 border-b border-r",
                        bracketColors[accentColor]
                    )}
                />

                {/* Content */}
                {children}
            </div>
        </div>
    );
}

export default CornerBracketCard;
