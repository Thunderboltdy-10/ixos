"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDecodeEffect } from "@/hooks/useDecodeEffect";
import { CornerBrackets } from "@/components/effects/CornerBrackets";
import { detectDesktopPlatform, getDownloadUrl, type DownloadPlatform } from "@/lib/downloads";

const PLATFORM_LABELS: Record<DownloadPlatform, string> = {
  "windows-x64": "Windows",
  "macos-arm64": "macOS (Apple Silicon)",
  "macos-x64": "macOS (Intel)",
  "linux-x64": "Linux",
};

const PLATFORM_SHORT: Record<DownloadPlatform, string> = {
  "windows-x64": "Windows",
  "macos-arm64": "macOS",
  "macos-x64": "macOS",
  "linux-x64": "Linux",
};

function DecodedCTAHeading({ text }: { text: string }) {
  const { ref, display } = useDecodeEffect(text, 50);
  return (
    <h2
      ref={ref as React.Ref<HTMLHeadingElement>}
      className="text-4xl md:text-6xl font-semibold font-display text-white"
      style={{ letterSpacing: "-0.02em", lineHeight: 1.08 }}
    >
      {display}
    </h2>
  );
}

export function FinalCTASection() {
  const [platform, setPlatform] = useState<DownloadPlatform>("windows-x64");

  useEffect(() => {
    setPlatform(detectDesktopPlatform());
  }, []);

  const downloadUrl = getDownloadUrl(platform);

  return (
    <section className="relative z-10 py-32 px-6">
      <div className="max-w-3xl mx-auto text-center relative">
        <CornerBrackets size={24} color="rgba(246,185,76,0.15)" />

        {/* Ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: "80%",
            height: 300,
            background: "radial-gradient(ellipse, rgba(246,185,76,0.05) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 p-12">
          <DecodedCTAHeading text="Start searching in seconds." />

          <p className="mt-6 mb-10 text-white/45 text-sm max-w-lg mx-auto leading-relaxed">
            Ixos is free to download. No account required. No cloud dependency.
            Your files, your device, your search.
          </p>

          {/* Primary CTA */}
          <a
            href={downloadUrl}
            className="inline-block px-10 py-4 bg-amber-400 text-[#0A0D0F] font-semibold text-sm hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            Download for {PLATFORM_SHORT[platform]}
          </a>

          {/* Secondary */}
          <div className="mt-4">
            <Link
              href="/docs"
              className="text-xs text-white/30 hover:text-white/50 transition-colors"
            >
              View documentation →
            </Link>
          </div>

          {/* Platform badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs font-mono text-white/20">
            <span>macOS</span>
            <span className="text-white/8">|</span>
            <span>Windows</span>
            <span className="text-white/8">|</span>
            <span>Linux</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-white/12 text-xs font-mono">
        © 2026 Ixos Inc. All rights reserved.
      </div>
    </section>
  );
}
