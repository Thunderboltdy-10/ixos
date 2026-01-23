"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { HeroBadge } from "./HeroBadge";
import { HeroButtons } from "./HeroButtons";
import { HeroVideo } from "./HeroVideo";
import { LightingWash } from "../shared/LightingWash";

// Register GSAP plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function HeroV2() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  // GSAP scroll animation for video deck
  useGSAP(() => {
    gsap.set(videoRef.current, {
      rotationX: 0,
      scale: 1,
      y: 0,
      opacity: 1,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom center",
        scrub: 1.5,
        invalidateOnRefresh: true,
      },
    });

    tl.fromTo(
      videoRef.current,
      {
        rotationX: 0,
        scale: 1,
        y: 0,
        opacity: 1,
      },
      {
        rotationX: 20,
        scale: 0.92,
        y: 80,
        opacity: 0.9,
        ease: "power2.inOut",
      }
    );
  }, { scope: containerRef });

  const handleWatchDemo = useCallback(() => {
    const video = videoRef.current?.querySelector("video");
    if (video) {
      video.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        video.play();
      }, 500);
    }
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[130vh] flex flex-col items-center pt-32 pb-20 px-4 overflow-hidden"
      style={{
        perspective: "1000px",
        background: "var(--v2-bg)",
      }}
    >
      {/* Background Lighting */}
      <LightingWash intensity={6} position="top" />

      {/* Subtle ambient orbs */}
      <div
        className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full animate-pulse -z-10"
        style={{
          background: "var(--v2-teal-glow)",
          filter: "blur(100px)",
          animationDuration: "8s",
        }}
      />
      <div
        className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] rounded-full animate-pulse -z-10"
        style={{
          background: "var(--v2-violet-glow)",
          filter: "blur(100px)",
          animationDuration: "10s",
          animationDelay: "2s",
        }}
      />

      <div className="max-w-[var(--v2-container-max)] mx-auto relative z-10 flex flex-col items-center w-full">
        {/* Header Content */}
        <div className="text-center w-full max-w-4xl mb-16 relative">
          {/* Animated Badge */}
          <HeroBadge className="mb-8" />

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <span
              className="block font-[family-name:var(--v2-font-display)] text-5xl md:text-6xl lg:text-[4.5rem] leading-[1.1] tracking-[-0.02em]"
              style={{ color: "var(--v2-text)" }}
            >
              Search at the
            </span>
            <span
              className="block font-[family-name:var(--v2-font-display)] text-5xl md:text-6xl lg:text-[4.5rem] leading-[1.1] tracking-[-0.02em] italic"
              style={{ color: "var(--v2-text)" }}
            >
              Speed of Thought.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-[family-name:var(--v2-font-mono)] text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--v2-muted)" }}
          >
            Find the meeting notes PDF&mdash;without waiting for indexing.
            <br className="hidden md:block" />
            <span style={{ color: "var(--v2-text2)" }}>
              No indexing. Instant results.
            </span>
          </motion.p>

          {/* CTAs */}
          <HeroButtons onWatchDemo={handleWatchDemo} />
        </div>

        {/* Video Deck */}
        <div
          ref={videoRef}
          className="w-full max-w-[1100px] relative will-change-transform"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Glow behind deck */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full -z-10 animate-pulse"
            style={{
              background: "var(--v2-teal-glow)",
              filter: "blur(80px)",
              animationDuration: "4s",
            }}
          />

          <HeroVideo autoPlayOnScroll />

          {/* Floating Label - Left */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="hidden lg:flex absolute -left-4 top-[30%] px-4 py-3 rounded-lg items-center gap-3 z-20"
            style={{
              background: "var(--v2-surface)",
              border: "1px solid var(--v2-border)",
              boxShadow: "var(--v2-shadow-lg)",
            }}
          >
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{
                background: "var(--v2-bg)",
                border: "1px solid var(--v2-border2)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--v2-teal2)" }}
              />
            </div>
            <div className="flex flex-col">
              <span
                className="font-[family-name:var(--v2-font-mono)] text-sm font-medium"
                style={{ color: "var(--v2-text)" }}
              >
                181ms P50
              </span>
              <span
                className="font-[family-name:var(--v2-font-mono)] text-[10px]"
                style={{ color: "var(--v2-muted2)" }}
              >
                Flash Mode
              </span>
            </div>
          </motion.div>

          {/* Floating Label - Right */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="hidden lg:flex absolute -right-4 bottom-[25%] px-4 py-3 rounded-lg items-center gap-3 z-20"
            style={{
              background: "var(--v2-surface)",
              border: "1px solid var(--v2-border)",
              boxShadow: "var(--v2-shadow-lg)",
            }}
          >
            <div className="flex flex-col text-right">
              <span
                className="font-[family-name:var(--v2-font-mono)] text-sm font-medium"
                style={{ color: "var(--v2-text)" }}
              >
                100% Local
              </span>
              <span
                className="font-[family-name:var(--v2-font-mono)] text-[10px]"
                style={{ color: "var(--v2-muted2)" }}
              >
                No Cloud Required
              </span>
            </div>
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{
                background: "var(--v2-bg)",
                border: "1px solid var(--v2-border2)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#22c55e",
                  boxShadow: "0 0 10px rgba(34, 197, 94, 0.5)",
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default HeroV2;
