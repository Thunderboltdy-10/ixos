"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Github } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: { label: string; href: string }[];
}

export function MobileMenu({ isOpen, onClose, links }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-[280px] z-[70] md:hidden"
            style={{ background: "var(--v2-bg)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between h-[var(--v2-nav-height)] px-6 border-b"
              style={{ borderColor: "var(--v2-border2)" }}
            >
              <span
                className="font-[family-name:var(--v2-font-mono)] font-medium"
                style={{ color: "var(--v2-text)" }}
              >
                Menu
              </span>
              <button
                onClick={onClose}
                className="p-2 rounded-md transition-colors"
                style={{ color: "var(--v2-muted)" }}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="p-6 space-y-2">
              {links.map((link, index) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="block py-3 font-[family-name:var(--v2-font-mono)] text-base transition-colors"
                    style={{ color: "var(--v2-muted)" }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.color = "var(--v2-text)";
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.color = "var(--v2-muted)";
                    }}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Actions */}
            <div
              className="absolute bottom-0 left-0 right-0 p-6 space-y-3 border-t"
              style={{ borderColor: "var(--v2-border2)" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Link href="/download" onClick={onClose}>
                  <button className="v2-btn v2-btn-primary w-full">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <a
                  href={SITE_CONFIG.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="v2-btn v2-btn-secondary w-full"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MobileMenu;
