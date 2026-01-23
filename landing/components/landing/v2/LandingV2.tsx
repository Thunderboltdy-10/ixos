"use client";

import { HeroV2 } from "./hero/HeroV2";
import { StickyDemo } from "./sticky-demo/StickyDemo";
import { TrustPanel } from "./trust/TrustPanel";
import { PricingPanelV2 } from "./pricing/PricingPanelV2";
import { ParticlesV2 } from "./particles/ParticlesV2";
import { GrainOverlay } from "./shared/GrainOverlay";

// Import V2 theme CSS
import "./theme/tokens-v2.css";

/**
 * LandingV2 - "Graphite Noir + Porcelain Ink" Theme
 *
 * Premium desktop instrument aesthetic landing page
 * North-star claim: "No indexing. Instant results."
 */
export function LandingV2() {
  return (
    <main
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: "var(--v2-bg)" }}
    >
      {/* Particle background */}
      <ParticlesV2 intensity="hero" accentSparks />

      {/* Grain texture overlay */}
      <GrainOverlay opacity={0.025} />

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <HeroV2 />

        {/* Sticky Demo Section - How it works */}
        <StickyDemo />

        {/* Trust/Security Section */}
        <TrustPanel />

        {/* Pricing Section */}
        <PricingPanelV2 />

        {/* CTA Section */}
        <CTASection />
      </div>
    </main>
  );
}

/**
 * Final CTA Section
 */
function CTASection() {
  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{ background: "var(--v2-bg)" }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 100%, var(--v2-teal-glow) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-[var(--v2-container-max)] mx-auto px-[var(--v2-container-padding)] relative z-10">
        <div className="text-center max-w-2xl mx-auto">
          <h2
            className="font-[family-name:var(--v2-font-display)] text-3xl md:text-4xl mb-6"
            style={{ color: "var(--v2-text)" }}
          >
            Ready to Search Smarter?
          </h2>
          <p
            className="font-[family-name:var(--v2-font-mono)] text-sm mb-8"
            style={{ color: "var(--v2-muted)" }}
          >
            Join thousands of users who've upgraded from filename search to semantic search.
            <br />
            No cloud. No indexing wait. Just results.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/download">
              <button
                className="h-12 px-8 rounded-md font-[family-name:var(--v2-font-mono)] text-sm uppercase tracking-[0.04em] font-medium transition-all duration-200"
                style={{
                  background: "var(--v2-teal)",
                  color: "var(--v2-bg)",
                  border: "1px solid var(--v2-teal)",
                }}
              >
                Download for Free
              </button>
            </a>
            <a href="/docs">
              <button
                className="h-12 px-8 rounded-md font-[family-name:var(--v2-font-mono)] text-sm uppercase tracking-[0.04em] font-medium transition-all duration-200"
                style={{
                  background: "transparent",
                  color: "var(--v2-text)",
                  border: "1px solid var(--v2-border)",
                }}
              >
                Read the Docs
              </button>
            </a>
          </div>

          {/* Trust badges */}
          <div
            className="flex flex-wrap items-center justify-center gap-6 mt-12 pt-8 border-t"
            style={{ borderColor: "var(--v2-border2)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "#22c55e" }}
              />
              <span
                className="font-[family-name:var(--v2-font-mono)] text-xs"
                style={{ color: "var(--v2-muted)" }}
              >
                100% Offline
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--v2-teal2)" }}
              />
              <span
                className="font-[family-name:var(--v2-font-mono)] text-xs"
                style={{ color: "var(--v2-muted)" }}
              >
                181ms P50
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--v2-amber)" }}
              />
              <span
                className="font-[family-name:var(--v2-font-mono)] text-xs"
                style={{ color: "var(--v2-muted)" }}
              >
                No Telemetry
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingV2;
