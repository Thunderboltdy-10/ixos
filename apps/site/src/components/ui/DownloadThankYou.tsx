"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DownloadThankYouProps {
    isVisible: boolean;
    onClose: () => void;
    platformName: string;
}

export function DownloadThankYou({ isVisible, onClose, platformName }: DownloadThankYouProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true);
            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        } else {
            setIsAnimating(false);
        }
    }, [isVisible, onClose]);

    if (!isVisible && !isAnimating) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center transition-all duration-500",
                isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-bg-graphite-0/80 backdrop-blur-sm" />

            {/* Content */}
            <div
                className={cn(
                    "relative z-10 max-w-md mx-4 p-8 rounded-lg bg-bg-graphite-1 border border-white/10 shadow-2xl transition-all duration-500",
                    isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Animated checkmark */}
                <div className="flex justify-center mb-6">
                    <div className="relative w-20 h-20">
                        {/* Outer ring animation */}
                        <div className="absolute inset-0 rounded-full border-2 border-accent-amber/30 animate-ping" />
                        {/* Inner circle */}
                        <div className="absolute inset-2 rounded-full bg-accent-amber/10 flex items-center justify-center">
                            <svg
                                className="w-10 h-10 text-accent-amber"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    className="animate-pulse"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Thank you message */}
                <h2 className="text-2xl font-semibold text-center text-porcelain mb-2">
                    Thank you for downloading{" "}
                    <span className="heading-gradient-amber">Ixos</span>
                </h2>

                {/* Platform indicator */}
                <p className="text-sm text-fg-muted text-center mb-4 font-mono">
                    {platformName}
                </p>

                {/* Marketing tagline */}
                <p className="text-center text-fg-muted/80 text-sm italic">
                    "Your files. Your device. Your search."
                </p>

                {/* Progress bar for auto-dismiss */}
                <div className="mt-6 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-accent-amber/50 transition-all duration-[5000ms] ease-linear"
                        style={{ width: isVisible ? "0%" : "100%" }}
                    />
                </div>

                {/* Close hint */}
                <p className="text-center text-fg-ghost text-xs mt-4">
                    Click anywhere to dismiss
                </p>

                {/* Corner accents */}
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent-amber/50" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent-amber/30" />
            </div>
        </div>
    );
}
