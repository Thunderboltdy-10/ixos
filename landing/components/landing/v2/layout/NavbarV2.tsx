"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { SITE_CONFIG } from "@/lib/constants";
import { MobileMenu } from "./MobileMenu";

const NAV_LINKS = [
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
];

export function NavbarV2() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = (href: string, e: React.MouseEvent) => {
    if (href.startsWith("/#") && pathname === "/") {
      e.preventDefault();
      const id = href.replace("/#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
          isScrolled
            ? "bg-[var(--v2-bg)]/90 backdrop-blur-xl border-b border-[var(--v2-border2)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[var(--v2-container-max)] mx-auto px-[var(--v2-container-padding)] h-[var(--v2-nav-height)] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
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
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={(e) => handleLinkClick(link.href, e)}
                className="font-[family-name:var(--v2-font-mono)] text-sm transition-colors duration-150"
                style={{
                  color: "var(--v2-muted)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--v2-text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--v2-muted)";
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/download">
              <button className="v2-btn v2-btn-primary">
                <Download className="w-4 h-4" />
                Download
              </button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-md transition-colors"
            style={{ color: "var(--v2-text)" }}
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        links={NAV_LINKS}
      />
    </>
  );
}

export default NavbarV2;
