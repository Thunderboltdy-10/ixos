"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

interface HeroVideoProps {
  src?: string;
  className?: string;
  autoPlayOnScroll?: boolean;
}

export function HeroVideo({
  src = "/Hero Video.mp4",
  className = "",
  autoPlayOnScroll = true,
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Extract first frame as poster
  const extractPosterFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.currentTime = 0;
      await new Promise((resolve) => {
        video.addEventListener("seeked", resolve, { once: true });
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setPosterUrl(canvas.toDataURL("image/jpeg", 0.9));
      }
    } catch (e) {
      // Poster extraction failed, video will show without custom poster
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener("loadeddata", extractPosterFrame);
    return () => {
      video.removeEventListener("loadeddata", extractPosterFrame);
    };
  }, [extractPosterFrame]);

  // Auto-play on scroll
  useEffect(() => {
    if (!autoPlayOnScroll) return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5 && !hasPlayed) {
            playVideo();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [autoPlayOnScroll, hasPlayed]);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().then(() => {
      setIsPlaying(true);
      setHasPlayed(true);
    }).catch(() => {
      // Autoplay blocked, user will need to click
    });
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
        setHasPlayed(true);
      });
    }
  }, [isPlaying]);

  const handleVideoEnd = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Loop after first play
    video.currentTime = 0;
    video.play();
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        background: "var(--v2-bg)",
        borderRadius: "var(--v2-radius-xl)",
        border: "1px solid var(--v2-border)",
        boxShadow: "var(--v2-edge-ring), var(--v2-top-highlight), var(--v2-shadow-deck)",
      }}
      initial={{ opacity: 0, scale: 0.95, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 1,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.6,
      }}
    >
      {/* Lighting wash behind */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 60%)",
        }}
      />

      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-auto relative z-10"
        src={src}
        poster={posterUrl || undefined}
        muted
        playsInline
        preload="metadata"
        onEnded={handleVideoEnd}
        style={{
          borderRadius: "var(--v2-radius-lg)",
        }}
      />

      {/* Play/Pause Overlay */}
      <motion.button
        onClick={togglePlayPause}
        className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
        initial={{ opacity: 1 }}
        animate={{ opacity: isPlaying && hasPlayed ? 0 : 1 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md"
          style={{
            background: "var(--v2-surface)",
            border: "1px solid var(--v2-border)",
            boxShadow: "var(--v2-shadow-lg)",
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" style={{ color: "var(--v2-text)" }} />
          ) : (
            <Play className="w-6 h-6 ml-1" style={{ color: "var(--v2-text)" }} />
          )}
        </motion.div>
      </motion.button>

      {/* Bottom gradient fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-20 pointer-events-none z-30"
        style={{
          background: "linear-gradient(to top, var(--v2-bg) 0%, transparent 100%)",
        }}
      />
    </motion.div>
  );
}

export default HeroVideo;
