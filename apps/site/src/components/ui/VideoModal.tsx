"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoSrc: string;
}

export function VideoModal({ isOpen, onClose, videoSrc }: VideoModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";

            // Focus trap
            modalRef.current?.focus();

            // Play video when modal opens
            setTimeout(() => {
                videoRef.current?.play();
            }, 300);
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={modalRef}
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8",
                "animate-in fade-in duration-300"
            )}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="Demo video"
            tabIndex={-1}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-bg-graphite-0/90 backdrop-blur-xl"
                aria-hidden="true"
            />

            {/* Modal content */}
            <div
                className={cn(
                    "relative w-full max-w-5xl aspect-video",
                    "bg-bg-graphite-2 rounded-xl overflow-hidden",
                    "shadow-lift border border-stroke-hairline",
                    "animate-in zoom-in-95 duration-300"
                )}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className={cn(
                        "absolute top-4 right-4 z-10",
                        "w-10 h-10 rounded-full",
                        "bg-bg-graphite-1/80 backdrop-blur-sm",
                        "border border-stroke-hairline",
                        "flex items-center justify-center",
                        "text-fg-muted hover:text-fg-porcelain",
                        "transition-colors duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-accent-teal"
                    )}
                    aria-label="Close video"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Video player */}
                <video
                    ref={videoRef}
                    src={videoSrc}
                    controls
                    playsInline
                    className="w-full h-full object-contain bg-black"
                    poster="/assets/hero-poster-fallback.jpg"
                >
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    );
}
