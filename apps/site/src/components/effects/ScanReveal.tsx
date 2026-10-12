"use client";

import { useState, useEffect, useRef } from "react";

export function ScanReveal({
  children,
  threshold = 0.05,
  clipFrom = "right",
}: {
  children: React.ReactNode;
  threshold?: number;
  clipFrom?: "left" | "right";
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px 0px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  const clipStart =
    clipFrom === "right" ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
  const clipEnd = "inset(0 0% 0 0)";

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0.04,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        clipPath: visible ? clipEnd : clipStart,
        transition: `opacity 1.2s ease, transform 1.2s ease, clip-path 1.8s cubic-bezier(0.16, 1, 0.3, 1) 200ms`,
      }}
    >
      {children}
    </div>
  );
}
