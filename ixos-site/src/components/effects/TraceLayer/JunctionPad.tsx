"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import type { JunctionPadProps, AccentColor } from "./types";
import { ACCENT_HEX } from "./types";

export function JunctionPad({ junction, isActive }: JunctionPadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const hasActivated = useRef(false);

  const color = ACCENT_HEX[junction.color];

  // Activation animation
  useEffect(() => {
    if (!isActive || hasActivated.current) return;
    if (!innerRef.current || !outerRef.current) return;

    hasActivated.current = true;

    // Pulse animation when first activated
    gsap.fromTo(
      outerRef.current,
      { scale: 1, opacity: 0.4 },
      {
        scale: 2,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
      }
    );

    gsap.to(innerRef.current, {
      scale: 1.3,
      duration: 0.2,
      ease: "power2.out",
      yoyo: true,
      repeat: 1,
    });
  }, [isActive]);

  // Reset activation flag when scrolling back up
  useEffect(() => {
    if (!isActive && hasActivated.current) {
      hasActivated.current = false;
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none"
      style={{
        left: junction.position.x - 8,
        top: junction.position.y - 8,
        width: 16,
        height: 16,
      }}
    >
      {/* Outer pulse ring */}
      <div
        ref={outerRef}
        className="absolute inset-0 rounded-full"
        style={{
          border: `1px solid ${color}`,
          opacity: isActive ? 0.4 : 0,
        }}
      />

      {/* Glow backdrop */}
      {isActive && (
        <div
          className="absolute -inset-2 rounded-full blur-md"
          style={{
            background: color,
            opacity: 0.2,
          }}
        />
      )}

      {/* Inner filled circle */}
      <div
        ref={innerRef}
        className="absolute inset-2 rounded-full transition-all duration-300"
        style={{
          background: isActive ? color : "rgba(243, 245, 247, 0.2)",
          boxShadow: isActive ? `0 0 8px ${color}` : "none",
        }}
      />

      {/* Center bright dot */}
      <div
        className="absolute rounded-full"
        style={{
          left: 6,
          top: 6,
          width: 4,
          height: 4,
          background: isActive ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.3)",
        }}
      />
    </div>
  );
}
