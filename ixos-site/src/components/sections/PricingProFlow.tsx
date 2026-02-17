"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Pricing, type BillingCycle } from "@/components/sections/Pricing";
import { ProFeatures } from "@/components/sections/ProFeatures";
import { ProCard } from "@/components/sections/ProCard";
import { ProUpgradeAction } from "@/components/sections/ProUpgradeAction";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

// Spring config for the snap animation - bouncy but controlled
const SNAP_TRANSITION = { 
  type: "spring" as const,
  stiffness: 220, 
  damping: 22, 
  mass: 0.9 
};

export function PricingProFlow({
  pricingSectionClassName = "section-pricing accent-magenta",
  proSectionClassName = "accent-teal",
}: {
  pricingSectionClassName?: string;
  proSectionClassName?: string;
}) {
  const [billing, setBilling] = useState<BillingCycle>("annual");
  const [isDesktop, setIsDesktop] = useState(false);

  // Mobile: simple intersection-based host toggle
  const [mobileHost, setMobileHost] = useState<"pricing" | "features">("pricing");

  // Refs for slots
  const pricingSlotRef = useRef<HTMLDivElement | null>(null);
  const featuresSlotRef = useRef<HTMLDivElement | null>(null);
  
  // Desktop: which section hosts the card
  const [cardHost, setCardHost] = useState<"pricing" | "features">("pricing");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Scroll tracking
  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);
  const velocitySmoothing = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Mobile: intersection observer
  useEffect(() => {
    if (isDesktop) return;
    const featuresEl = featuresSlotRef.current;
    if (!featuresEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setMobileHost(entry.intersectionRatio > 0.25 ? "features" : "pricing");
      },
      { threshold: [0, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5] }
    );
    observer.observe(featuresEl);
    return () => observer.disconnect();
  }, [isDesktop]);

  // Desktop: scroll-driven snap with velocity awareness
  const checkScrollPosition = useCallback(() => {
    const pricingEl = pricingSlotRef.current;
    const featuresEl = featuresSlotRef.current;
    if (!pricingEl || !featuresEl) return;

    const pR = pricingEl.getBoundingClientRect();
    const fR = featuresEl.getBoundingClientRect();
    const vh = window.innerHeight;
    const vMid = vh / 2;

    // Calculate velocity
    const now = performance.now();
    const dy = window.scrollY - lastScrollY.current;
    const dt = Math.max(1, now - lastScrollY.current);
    const rawVelocity = Math.abs(dy / dt) * 16;
    velocitySmoothing.current = velocitySmoothing.current * 0.85 + rawVelocity * 0.15;
    scrollVelocity.current = velocitySmoothing.current;
    lastScrollY.current = window.scrollY;

    // Determine which section's slot center is closer to viewport center
    const pMid = pR.top + pR.height / 2;
    const fMid = fR.top + fR.height / 2;
    
    // Progress from pricing (0) to features (1)
    const range = fMid - pMid;
    const rawProgress = clamp01((vMid - pMid) / Math.max(range, 1));

    // Dynamic threshold: fast scroll snaps earlier
    const velocityFactor = clamp01((scrollVelocity.current - 1) / 8);
    const threshold = 0.52 - velocityFactor * 0.18; // 0.52 → 0.34

    const nextHost = rawProgress < threshold ? "pricing" : "features";

    if (nextHost !== cardHost && !isTransitioning) {
      setIsTransitioning(true);
      setCardHost(nextHost);
      // Reset transitioning flag after animation completes
      setTimeout(() => setIsTransitioning(false), 600);
    }
  }, [cardHost, isTransitioning]);

  useEffect(() => {
    if (!isDesktop) return;

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        checkScrollPosition();
        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    checkScrollPosition();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isDesktop, checkScrollPosition]);

  const renderProCard = (inPricing: boolean) => (
    <motion.div
      layoutId="pro-card-desktop"
      transition={SNAP_TRANSITION}
      className="relative group h-full lg:sticky lg:top-24"
      style={{ 
        willChange: "transform",
        transformOrigin: "center center"
      }}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-b from-accent-magenta/40 to-transparent rounded-lg opacity-50 blur-lg group-hover:opacity-80 transition-opacity duration-700" />
      <ProCard
        price={billing === "monthly" ? "$7.99" : "$6.35"}
        period="/ month"
        desc="Ask Mode evidence answers. Saved searches. Priority support."
        actionNode={<ProUpgradeAction />}
      />
    </motion.div>
  );

  // Desktop: render card inside the active section
  if (isDesktop) {
    return (
      <>
        <section className={pricingSectionClassName}>
          <Pricing
            billing={billing}
            onBillingChange={setBilling}
            showProCard={cardHost === "pricing"}
            proCardSlotRef={pricingSlotRef}
            proCardContent={cardHost === "pricing" ? renderProCard(true) : null}
          />
        </section>

        <section className={proSectionClassName}>
          <ProFeatures
            billing={billing}
            showProCard={cardHost === "features"}
            cardAnchorRef={featuresSlotRef}
            proCardContent={cardHost === "features" ? renderProCard(false) : null}
          />
        </section>
      </>
    );
  }

  // Mobile: simpler layout toggle
  return (
    <div id="pricing-pro-card-flow">
      <section className={pricingSectionClassName}>
        <Pricing
          billing={billing}
          onBillingChange={setBilling}
          showProCard={mobileHost === "pricing"}
          proCardSlotRef={pricingSlotRef}
        />
      </section>

      <section className={proSectionClassName}>
        <ProFeatures
          billing={billing}
          showProCard={mobileHost === "features"}
          cardAnchorRef={featuresSlotRef}
        />
      </section>
    </div>
  );
}
