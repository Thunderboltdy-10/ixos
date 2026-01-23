"use client";

import Link from "next/link";
import Image from "next/image";
import { Github, Twitter } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";
import { HalftoneStrip } from "../shared/HalftoneStrip";
import { PrivacySeal } from "../micro/PrivacySeal";

const FOOTER_LINKS = {
  product: [
    { label: "Download", href: "/download" },
    { label: "Pricing", href: "/pricing" },
    { label: "Docs", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Security", href: "/security" },
  ],
  social: [
    { label: "GitHub", href: SITE_CONFIG.links.github, icon: Github },
    { label: "Twitter", href: SITE_CONFIG.links.twitter, icon: Twitter },
  ],
};

export function FooterV2() {
  return (
    <footer style={{ background: "var(--v2-bg2)" }}>
      {/* Halftone Divider */}
      <HalftoneStrip opacity={0.08} />

      <div className="max-w-[var(--v2-container-max)] mx-auto px-[var(--v2-container-padding)] pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-8 h-8">
                <Image
                  src="/Icon.png"
                  alt="Ixos"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span
                className="font-[family-name:var(--v2-font-mono)] font-medium text-lg"
                style={{ color: "var(--v2-text)" }}
              >
                Ixos
              </span>
            </div>
            <p
              className="font-[family-name:var(--v2-font-mono)] text-sm leading-relaxed mb-6"
              style={{ color: "var(--v2-muted)" }}
            >
              Search at the speed of thought.
            </p>
            <p
              className="font-[family-name:var(--v2-font-mono)] text-xs"
              style={{ color: "var(--v2-muted2)" }}
            >
              &copy; {new Date().getFullYear()} Ixos. All rights reserved.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3
              className="font-[family-name:var(--v2-font-mono)] text-xs uppercase tracking-[0.08em] mb-4"
              style={{ color: "var(--v2-muted2)" }}
            >
              Product
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="font-[family-name:var(--v2-font-mono)] text-sm transition-colors duration-150"
                    style={{ color: "var(--v2-muted)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--v2-text)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--v2-muted)";
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3
              className="font-[family-name:var(--v2-font-mono)] text-xs uppercase tracking-[0.08em] mb-4"
              style={{ color: "var(--v2-muted2)" }}
            >
              Legal
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="font-[family-name:var(--v2-font-mono)] text-sm transition-colors duration-150"
                    style={{ color: "var(--v2-muted)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--v2-text)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--v2-muted)";
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h3
              className="font-[family-name:var(--v2-font-mono)] text-xs uppercase tracking-[0.08em] mb-4"
              style={{ color: "var(--v2-muted2)" }}
            >
              Social
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.social.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-[family-name:var(--v2-font-mono)] text-sm transition-colors duration-150"
                    style={{ color: "var(--v2-muted)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--v2-text)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--v2-muted)";
                    }}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Privacy Seal */}
        <div
          className="pt-8 border-t"
          style={{ borderColor: "var(--v2-border2)" }}
        >
          <PrivacySeal />
        </div>
      </div>
    </footer>
  );
}

export default FooterV2;
