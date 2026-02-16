"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGroup } from "framer-motion";
import { Pricing, type BillingCycle } from "@/components/sections/Pricing";
import { ProFeatures } from "@/components/sections/ProFeatures";

type CardHost = "pricing" | "features";

export function PricingProFlow({
  pricingSectionClassName = "section-pricing accent-magenta",
  proSectionClassName = "accent-teal",
}: {
  pricingSectionClassName?: string;
  proSectionClassName?: string;
}) {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [cardHost, setCardHost] = useState<CardHost>("pricing");
  const featuresAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = featuresAnchorRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCardHost(entry.isIntersecting ? "features" : "pricing");
      },
      {
        root: null,
        rootMargin: "-42% 0px -42% 0px",
        threshold: 0,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <LayoutGroup id="pricing-pro-card-flow">
      <section className={pricingSectionClassName}>
        <Pricing
          billing={billing}
          onBillingChange={setBilling}
          showProCard={cardHost === "pricing"}
          proCardLayoutId="pro-card-flow"
        />
      </section>

      <section className={proSectionClassName}>
        <ProFeatures
          billing={billing}
          showProCard={cardHost === "features"}
          proCardLayoutId="pro-card-flow"
          cardAnchorRef={featuresAnchorRef}
        />
      </section>
    </LayoutGroup>
  );
}
