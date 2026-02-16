"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGroup } from "framer-motion";
import { Pricing, type BillingCycle } from "@/components/sections/Pricing";
import { ProFeatures } from "@/components/sections/ProFeatures";

type CardHost = "pricing" | "hidden" | "features";

export function PricingProFlow({
  pricingSectionClassName = "section-pricing accent-magenta",
  proSectionClassName = "accent-teal",
}: {
  pricingSectionClassName?: string;
  proSectionClassName?: string;
}) {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [cardHost, setCardHost] = useState<CardHost>("pricing");
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1024;
  });
  const pricingSlotRef = useRef<HTMLDivElement | null>(null);
  const featuresSlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const updateHost = () => {
      const pricingRect = pricingSlotRef.current?.getBoundingClientRect();
      const featureTop = featuresSlotRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const viewportHeight = window.innerHeight || 1;
      const pricingBottom = pricingRect?.bottom ?? Number.POSITIVE_INFINITY;

      if (!isDesktop) {
        setCardHost(featureTop <= viewportHeight * 0.72 ? "features" : "pricing");
        return;
      }

      if (featureTop <= viewportHeight * 0.66) {
        setCardHost("features");
      } else if (pricingBottom <= viewportHeight * 0.24) {
        setCardHost("hidden");
      } else {
        setCardHost("pricing");
      }
    };

    updateHost();
    window.addEventListener("scroll", updateHost, { passive: true });
    window.addEventListener("resize", updateHost);
    return () => {
      window.removeEventListener("scroll", updateHost);
      window.removeEventListener("resize", updateHost);
    };
  }, [isDesktop]);

  return (
    <LayoutGroup id="pricing-pro-card-flow">
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
