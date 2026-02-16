"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { Pricing, type BillingCycle } from "@/components/sections/Pricing";
import { ProFeatures } from "@/components/sections/ProFeatures";
import { ProCard } from "@/components/sections/ProCard";

type CardHost = "pricing" | "hidden" | "features";

export function PricingProFlow({
  pricingSectionClassName = "section-pricing accent-magenta",
  proSectionClassName = "accent-teal",
}: {
  pricingSectionClassName?: string;
  proSectionClassName?: string;
}) {
  const [billing, setBilling] = useState<BillingCycle>("annual");
  const [cardHost, setCardHost] = useState<CardHost>("pricing");
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1024;
  });
  const [pricingRatio, setPricingRatio] = useState(1);
  const [featuresRatio, setFeaturesRatio] = useState(0);
  const pricingSlotRef = useRef<HTMLDivElement | null>(null);
  const featuresSlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const pricingEl = pricingSlotRef.current;
    const featuresEl = featuresSlotRef.current;
    if (!pricingEl || !featuresEl) return;

    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
    const pricingObserver = new IntersectionObserver(
      ([entry]) => setPricingRatio(entry.intersectionRatio),
      { threshold: thresholds, rootMargin: "-20% 0px -20% 0px" }
    );
    const featuresObserver = new IntersectionObserver(
      ([entry]) => setFeaturesRatio(entry.intersectionRatio),
      { threshold: thresholds, rootMargin: "-22% 0px -22% 0px" }
    );

    pricingObserver.observe(pricingEl);
    featuresObserver.observe(featuresEl);

    return () => {
      pricingObserver.disconnect();
      featuresObserver.disconnect();
    };
  }, [isDesktop]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCardHost((prev) => {
        if (!isDesktop) {
          return featuresRatio > 0.28 ? "features" : "pricing";
        }

        if (prev === "pricing") {
          if (featuresRatio > 0.24) return "features";
          if (pricingRatio < 0.14) return "hidden";
          return prev;
        }

        if (prev === "hidden") {
          if (featuresRatio > 0.22) return "features";
          if (pricingRatio > 0.3) return "pricing";
          return prev;
        }

        if (pricingRatio > 0.34) return "pricing";
        if (featuresRatio < 0.12) return "hidden";
        return prev;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [featuresRatio, isDesktop, pricingRatio]);

  return (
    <LayoutGroup id="pricing-pro-card-flow">
      {isDesktop && cardHost === "hidden" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed top-[44vh] right-[-430px] z-[65] hidden h-[640px] w-[420px] lg:block"
        >
          <motion.div
            layoutId="pro-card-flow"
            transition={{ type: "spring", stiffness: 56, damping: 29, mass: 1.34 }}
            className="h-full w-full opacity-0"
          >
            <ProCard
              price={billing === "monthly" ? "$7.99" : "$6.35"}
              period="/ month"
              desc="Ask Mode evidence answers. Saved searches. Priority support."
              actionNode={<div />}
            />
          </motion.div>
        </div>
      ) : null}

      <section className={pricingSectionClassName}>
        <Pricing
          billing={billing}
          onBillingChange={setBilling}
          showProCard={cardHost === "pricing"}
          proCardLayoutId="pro-card-flow"
          proCardSlotRef={pricingSlotRef}
        />
      </section>

      <section className={proSectionClassName}>
        <ProFeatures
          billing={billing}
          showProCard={cardHost === "features"}
          proCardLayoutId="pro-card-flow"
          cardAnchorRef={featuresSlotRef}
        />
      </section>
    </LayoutGroup>
  );
}
