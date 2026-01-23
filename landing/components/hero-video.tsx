"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function HeroVideo() {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = 0.8; // Slow down slightly for majesty
        }
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1, type: "spring" }}
            className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl group"
        >
            {/* Glowing Border Container */}
            <div className="absolute inset-0 z-20 rounded-2xl border border-white/5 shadow-[0_0_20px_rgba(13,148,136,0.2)] animate-border-pulse pointer-events-none" />

            {/* Glass Overlay */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-surface-0/80 via-transparent to-transparent pointer-events-none" />

            {/* Video Content */}
            <video
                ref={videoRef}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-[2s]"
            >
                <source src="/hero-morph.mp4" type="video/mp4" />
            </video>
        </motion.div>
    );
}
