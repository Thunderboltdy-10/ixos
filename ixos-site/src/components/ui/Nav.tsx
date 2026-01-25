"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function Nav() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            <header
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                    isScrolled
                        ? "bg-bg-primary/80 backdrop-blur-xl border-b border-white/5 py-4"
                        : "bg-transparent py-6"
                )}
            >
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-8 h-8 transition-transform duration-300 group-hover:scale-110">
                            <Image
                                src="/assets/icon.png"
                                alt="Ixos Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <span className="font-semibold text-xl tracking-tight text-white group-hover:text-accent-teal transition-colors">
                            Ixos
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link href="/#how-it-works" className="text-sm font-medium hover:text-white transition-colors">
                            How it works
                        </Link>
                        <Link href="/pricing" className="text-sm font-medium hover:text-white transition-colors">
                            Pricing
                        </Link>
                        <Link href="/docs" className="text-sm font-medium hover:text-white transition-colors">
                            Docs
                        </Link>
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="#demo">Watch Demo</Link>
                        </Button>
                        <Button variant="primary" size="sm" hasParticleMagnet asChild>
                            <Link href="/download">Download</Link>
                        </Button>
                        <SignedIn>
                            <Link
                                href="/account"
                                className="p-2 rounded-md hover:bg-white/5 text-fg-muted hover:text-white transition-colors"
                            >
                                <User className="w-5 h-5" />
                            </Link>
                        </SignedIn>
                        <SignedOut>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/sign-in">Sign In</Link>
                            </Button>
                            <Button variant="secondary" size="sm" asChild>
                                <Link href="/sign-up">Sign Up</Link>
                            </Button>
                        </SignedOut>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden text-white"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Mobile Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-bg-primary/95 backdrop-blur-3xl pt-24 px-6 md:hidden animate-in slide-in-from-right duration-300">
                    <button
                        className="absolute top-6 right-6 text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <nav className="flex flex-col gap-6 text-lg">
                        <Link href="/#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>How it works</Link>
                        <Link href="/pricing" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
                        <Link href="/docs" onClick={() => setIsMobileMenuOpen(false)}>Docs</Link>
                        <hr className="border-white/10" />
                        <Link href="#demo" onClick={() => setIsMobileMenuOpen(false)}>Watch Demo</Link>
                        <Button variant="primary" size="lg" className="w-full" asChild>
                            <Link href="/download" onClick={() => setIsMobileMenuOpen(false)}>Download for Windows</Link>
                        </Button>
                        <SignedOut>
                            <div className="pt-4 border-t border-white/10 space-y-3">
                                <Button variant="ghost" size="lg" className="w-full" asChild>
                                    <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
                                </Button>
                                <Button variant="secondary" size="lg" className="w-full" asChild>
                                    <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
                                </Button>
                            </div>
                        </SignedOut>
                    </nav>
                </div>
            )}
        </>
    );
}
