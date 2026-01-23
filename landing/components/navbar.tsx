"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Github, Menu, X, Download } from "lucide-react";
import { useState } from "react";
import { SITE_CONFIG } from "@/lib/constants";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const NAV_LINKS = [
    { label: "Features", href: "/#features" },
    { label: "How it Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Download", href: "/download" },
    { label: "Docs", href: "/docs" },
];

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Determine if link should use smooth scroll (same page anchors) or navigation
    const handleLinkClick = (href: string, e: React.MouseEvent) => {
        if (href.startsWith("/#") && pathname === "/") {
            // Same page, smooth scroll to anchor
            e.preventDefault();
            const id = href.replace("/#", "");
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
            }
            setIsOpen(false);
        }
        // Otherwise let the link navigate normally
    };

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="fixed top-0 inset-x-0 z-50 bg-surface-0/80 backdrop-blur-xl border-b border-white/5"
        >
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-brand p-[1px] shadow-lg shadow-brand-teal/20 group-hover:shadow-brand-teal/40 transition-shadow">
                        <div className="w-full h-full rounded-[7px] bg-surface-1 flex items-center justify-center">
                            <span className="text-brand-teal font-bold text-sm">IX</span>
                        </div>
                    </div>
                    <span className="font-display font-semibold text-lg text-white">Ixos</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={(e) => handleLinkClick(link.href, e)}
                            className="text-sm text-content-muted hover:text-white transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(SITE_CONFIG.links.github, "_blank")}
                    >
                        <Github className="w-4 h-4" />
                        GitHub
                    </Button>

                    <SignedOut>
                        <Link href="/sign-in">
                            <Button variant="ghost" size="sm">
                                Sign In
                            </Button>
                        </Link>
                    </SignedOut>

                    <SignedIn>
                        <Link href="/account">
                            <Button variant="ghost" size="sm">
                                Account
                            </Button>
                        </Link>
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8",
                                },
                            }}
                        />
                    </SignedIn>

                    <Link href="/download">
                        <Button size="sm" className="bg-gradient-brand shadow-lg shadow-brand-teal/20 gap-2">
                            <Download className="w-4 h-4" />
                            Download
                        </Button>
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-white p-2"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:hidden bg-surface-1 border-t border-white/5 p-4 space-y-4"
                >
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={(e) => handleLinkClick(link.href, e)}
                            className="block text-content-muted hover:text-white transition-colors py-2"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <SignedOut>
                        <Link href="/sign-in" onClick={() => setIsOpen(false)}>
                            <Button variant="ghost" size="sm" className="w-full">
                                Sign In
                            </Button>
                        </Link>
                    </SignedOut>
                    <SignedIn>
                        <Link href="/account" onClick={() => setIsOpen(false)}>
                            <Button variant="ghost" size="sm" className="w-full">
                                Account
                            </Button>
                        </Link>
                    </SignedIn>
                    <Link href="/download" onClick={() => setIsOpen(false)}>
                        <Button size="sm" className="w-full bg-gradient-brand gap-2">
                            <Download className="w-4 h-4" />
                            Download
                        </Button>
                    </Link>
                </motion.div>
            )}
        </motion.nav>
    );
}
