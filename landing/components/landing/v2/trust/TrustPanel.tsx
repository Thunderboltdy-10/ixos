"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Database, Lock, Eye, Server } from "lucide-react";
import { LightingWash } from "../shared/LightingWash";
import { PrivacySeal } from "../micro/PrivacySeal";

const TRUST_FEATURES = [
  {
    icon: Shield,
    title: "100% Local Processing",
    description: "Your files never leave your device. All embedding generation happens on-CPU.",
  },
  {
    icon: Zap,
    title: "181ms P50 Latency",
    description: "Faster than traditional indexers cold-start. Results before you finish typing.",
  },
  {
    icon: Database,
    title: "225 Bytes per File",
    description: "No heavy vector databases. Embeddings stored in file metadata (xattr/ADS).",
  },
  {
    icon: Lock,
    title: "Optional Encryption",
    description: "XChaCha20 encryption at rest for sensitive indices. Your data, your key.",
  },
  {
    icon: Eye,
    title: "No Telemetry",
    description: "Zero analytics, zero tracking. We don't know what you search for.",
  },
  {
    icon: Server,
    title: "No Cloud Required",
    description: "Works offline after installation. No API keys, no subscriptions for core features.",
  },
];

export function TrustPanel() {
  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{ background: "var(--v2-bg2)" }}
      id="trust"
    >
      <LightingWash intensity={2} position="top" />

      <div className="max-w-[var(--v2-container-max)] mx-auto px-[var(--v2-container-padding)]">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className="font-[family-name:var(--v2-font-mono)] text-xs uppercase tracking-[0.08em] mb-4"
            style={{ color: "var(--v2-muted2)" }}
          >
            Security & Privacy
          </h2>
          <h3
            className="font-[family-name:var(--v2-font-display)] text-3xl md:text-4xl mb-4"
            style={{ color: "var(--v2-text)" }}
          >
            Built for Privacy-First
          </h3>
          <p
            className="font-[family-name:var(--v2-font-mono)] text-sm max-w-lg mx-auto"
            style={{ color: "var(--v2-muted)" }}
          >
            Your files are your business. We designed Ixos to never compromise that.
          </p>
        </div>

        {/* Trust Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {TRUST_FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 rounded-lg transition-all duration-300"
                style={{
                  background: "var(--v2-surface)",
                  border: "1px solid var(--v2-border2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--v2-border)";
                  e.currentTarget.style.background = "var(--v2-surface2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--v2-border2)";
                  e.currentTarget.style.background = "var(--v2-surface)";
                }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all duration-300"
                  style={{
                    background: "var(--v2-bg)",
                    border: "1px solid var(--v2-border2)",
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-colors duration-300"
                    style={{ color: "var(--v2-muted)" }}
                  />
                </div>

                {/* Content */}
                <h4
                  className="font-[family-name:var(--v2-font-mono)] text-sm font-medium mb-2"
                  style={{ color: "var(--v2-text)" }}
                >
                  {feature.title}
                </h4>
                <p
                  className="font-[family-name:var(--v2-font-mono)] text-xs leading-relaxed"
                  style={{ color: "var(--v2-muted)" }}
                >
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Privacy Seal - Centered */}
        <div className="max-w-md mx-auto">
          <PrivacySeal />
        </div>
      </div>
    </section>
  );
}

export default TrustPanel;
