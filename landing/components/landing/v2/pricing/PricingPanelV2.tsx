"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { LightingWash } from "../shared/LightingWash";

interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  isPopular?: boolean;
  isComingSoon?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "FREE_LICENSE",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Flash mode for personal use",
    features: [
      "Flash mode (Ixos-Flash-v2)",
      "Up to 10,000 indexed files",
      "Text, Markdown, JSON, Code",
      "No telemetry, 100% offline",
    ],
    cta: "Download Free",
    ctaHref: "/download",
  },
  {
    id: "pro",
    name: "PRO_LICENSE",
    monthlyPrice: 7.95,
    annualPrice: 79.50,
    description: "Unlimited refines + evidence depth",
    features: [
      "Everything in Free",
      "Unlimited Auto refines",
      "Evidence depth + explanations",
      "PDF, DOCX support",
      "Priority updates",
    ],
    cta: "Start Pro",
    ctaHref: "/pricing",
    isPopular: true,
  },
  {
    id: "enterprise",
    name: "ENTERPRISE_LICENSE",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Compliance and enterprise support",
    features: [
      "Everything in Pro",
      "Cryptographic attestation",
      "EU AI Act compliance reports",
      "Audit logs",
      "SSO integration",
      "Dedicated support",
    ],
    cta: "Coming Soon",
    ctaHref: "#",
    isComingSoon: true,
  },
];

export function PricingPanelV2() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{ background: "var(--v2-bg)" }}
      id="pricing"
    >
      <LightingWash intensity={4} position="top" />

      <div className="max-w-[var(--v2-container-max)] mx-auto px-[var(--v2-container-padding)]">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2
            className="font-[family-name:var(--v2-font-mono)] text-xs uppercase tracking-[0.08em] mb-4"
            style={{ color: "var(--v2-muted2)" }}
          >
            Pricing
          </h2>
          <h3
            className="font-[family-name:var(--v2-font-display)] text-3xl md:text-4xl mb-4"
            style={{ color: "var(--v2-text)" }}
          >
            Simple, Transparent Pricing
          </h3>
          <p
            className="font-[family-name:var(--v2-font-mono)] text-sm max-w-md mx-auto"
            style={{ color: "var(--v2-muted)" }}
          >
            Start free. Upgrade when you need more power.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span
            className="font-[family-name:var(--v2-font-mono)] text-sm"
            style={{ color: isAnnual ? "var(--v2-muted2)" : "var(--v2-text)" }}
          >
            Monthly
          </span>

          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-14 h-7 rounded-full transition-colors duration-200"
            style={{
              background: isAnnual ? "var(--v2-teal)" : "var(--v2-surface2)",
              border: "1px solid var(--v2-border)",
            }}
          >
            <motion.div
              className="absolute top-1 w-5 h-5 rounded-full"
              style={{ background: "var(--v2-text)" }}
              animate={{ left: isAnnual ? "calc(100% - 24px)" : "4px" }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>

          <span
            className="font-[family-name:var(--v2-font-mono)] text-sm flex items-center gap-2"
            style={{ color: isAnnual ? "var(--v2-text)" : "var(--v2-muted2)" }}
          >
            Annual
            {isAnnual && (
              <span
                className="px-2 py-0.5 rounded text-[10px] uppercase"
                style={{
                  background: "var(--v2-teal-glow)",
                  color: "var(--v2-teal2)",
                  border: "1px solid var(--v2-teal)",
                }}
              >
                Save 17%
              </span>
            )}
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-lg overflow-hidden ${
                tier.isPopular ? "v2-corner-brackets" : ""
              }`}
              style={{
                background: "var(--v2-surface)",
                border: `1px solid ${tier.isPopular ? "var(--v2-teal)" : "var(--v2-border)"}`,
                boxShadow: tier.isPopular
                  ? "0 0 30px var(--v2-teal-glow), var(--v2-shadow-lg)"
                  : "var(--v2-shadow-md)",
                opacity: tier.isComingSoon ? 0.6 : 1,
              }}
            >
              {/* Corner brackets for popular tier */}
              {tier.isPopular && (
                <>
                  <div className="corner-bl" />
                  <div className="corner-br" />
                </>
              )}

              {/* Terminal-style header */}
              <div
                className="px-6 py-4 border-b"
                style={{ borderColor: "var(--v2-border2)" }}
              >
                {/* Traffic lights */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                  {tier.isPopular && (
                    <span
                      className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-[family-name:var(--v2-font-mono)]"
                      style={{
                        background: "var(--v2-teal)",
                        color: "var(--v2-bg)",
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      Popular
                    </span>
                  )}
                </div>

                {/* License name */}
                <span
                  className="font-[family-name:var(--v2-font-mono)] text-xs uppercase tracking-[0.04em]"
                  style={{ color: "var(--v2-muted)" }}
                >
                  {tier.name}
                </span>
              </div>

              {/* Pricing */}
              <div className="px-6 py-6">
                <div className="flex items-baseline gap-1 mb-2">
                  {tier.isComingSoon ? (
                    <span
                      className="font-[family-name:var(--v2-font-display)] text-3xl"
                      style={{ color: "var(--v2-text)" }}
                    >
                      Contact
                    </span>
                  ) : tier.monthlyPrice === 0 ? (
                    <span
                      className="font-[family-name:var(--v2-font-display)] text-3xl"
                      style={{ color: "var(--v2-text)" }}
                    >
                      Free
                    </span>
                  ) : (
                    <>
                      <span
                        className="font-[family-name:var(--v2-font-mono)] text-sm"
                        style={{ color: "var(--v2-muted)" }}
                      >
                        &euro;
                      </span>
                      <span
                        className="font-[family-name:var(--v2-font-display)] text-3xl"
                        style={{ color: "var(--v2-text)" }}
                      >
                        {isAnnual
                          ? (tier.annualPrice / 12).toFixed(2)
                          : tier.monthlyPrice.toFixed(2)}
                      </span>
                      <span
                        className="font-[family-name:var(--v2-font-mono)] text-sm"
                        style={{ color: "var(--v2-muted)" }}
                      >
                        /mo
                      </span>
                    </>
                  )}
                </div>

                {/* Annual price note */}
                {isAnnual && tier.annualPrice > 0 && (
                  <p
                    className="font-[family-name:var(--v2-font-mono)] text-xs mb-4"
                    style={{ color: "var(--v2-muted2)" }}
                  >
                    &euro;{tier.annualPrice.toFixed(2)} billed annually
                  </p>
                )}

                <p
                  className="font-[family-name:var(--v2-font-mono)] text-sm mb-6"
                  style={{ color: "var(--v2-muted)" }}
                >
                  {tier.description}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{
                          color: tier.isPopular ? "var(--v2-teal2)" : "var(--v2-muted)",
                        }}
                      />
                      <span
                        className="font-[family-name:var(--v2-font-mono)] text-sm"
                        style={{ color: "var(--v2-text2)" }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href={tier.ctaHref}>
                  <button
                    className={`w-full py-3 rounded-md font-[family-name:var(--v2-font-mono)] text-sm uppercase tracking-[0.04em] transition-all duration-200 ${
                      tier.isComingSoon ? "cursor-not-allowed" : ""
                    }`}
                    style={{
                      background: tier.isPopular ? "var(--v2-teal)" : "var(--v2-bg)",
                      color: tier.isPopular ? "var(--v2-bg)" : "var(--v2-text)",
                      border: `1px solid ${
                        tier.isPopular ? "var(--v2-teal)" : "var(--v2-border)"
                      }`,
                      opacity: tier.isComingSoon ? 0.5 : 1,
                    }}
                    disabled={tier.isComingSoon}
                  >
                    {tier.cta}
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingPanelV2;
