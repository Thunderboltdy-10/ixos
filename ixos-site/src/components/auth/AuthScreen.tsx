"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SectionDivider } from "@/components/ui/SectionDivider";

// Ixos dark theme for Clerk components - customized sign-in (teal) and sign-up (magenta)
const signInAppearance = {
    variables: {
        colorPrimary: "#14B8A6",
        colorBackground: "#131315",
        colorInputBackground: "#1A1A1E",
        colorInputText: "#E5E5E7",
        colorText: "#E5E5E7",
        colorTextSecondary: "#A1A1A6",
        colorDanger: "#EF4444",
        borderRadius: "0.25rem",
        fontFamily: '"IBM Plex Mono", monospace', // Enforce Mono
    },
    elements: {
        rootBox: "w-full",
        card: "bg-transparent shadow-none border-none p-0",
        headerTitle: "hidden",
        headerSubtitle: "hidden",
        // Increased visibility for social buttons: lighter background, subtle border
        socialButtonsBlockButton:
            "bg-[#27272A] border border-white/10 hover:bg-[#3F3F46] text-white transition-all h-10 flex items-center justify-center shadow-lg shadow-black/20 font-mono text-xs tracking-wide",
        socialButtonsBlockButtonText: "text-white font-medium ml-2 font-mono",
        socialButtonsBlockButtonArrow: "hidden",
        dividerLine: "bg-[#2A2A2E]",
        dividerText: "text-[#6B6B70] text-xs uppercase tracking-wider font-mono",
        formFieldLabel:
            "text-[#A1A1A6] text-xs font-medium mb-1.5 uppercase tracking-wide font-mono",
        formFieldInput:
            "bg-[#1A1A1E] border border-white/10 text-[#E5E5E7] placeholder:text-[#6B6B70] focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6]/30 rounded-md h-10 px-4 transition-all font-mono text-sm",
        formButtonPrimary:
            "bg-[--color-accent-teal] hover:bg-[--color-accent-teal-dim] text-[#0A0A0B] font-semibold h-10 rounded-md transition-all uppercase tracking-widest text-xs shadow-glow-teal font-mono",
        footerActionLink:
            "text-[#14B8A6] hover:text-[#0D9488] font-medium transition-colors font-mono",
        identityPreviewText: "text-[#E5E5E7] font-mono",
        identityPreviewEditButton:
            "text-[#14B8A6] hover:text-[#0D9488] transition-colors font-mono",
        formFieldAction:
            "text-[#14B8A6] hover:text-[#0D9488] text-xs transition-colors font-mono",
        alertText: "text-[#A1A1A6] font-mono",
        footer: "hidden",
        formFieldInputShowPasswordButton:
            "text-[#6B6B70] hover:text-[#A1A1A6] transition-colors",
    },
};

const signUpAppearance = {
    ...signInAppearance,
    variables: {
        ...signInAppearance.variables,
        colorPrimary: "#F472B6",
    },
    elements: {
        ...signInAppearance.elements,
        formFieldInput:
            "bg-[#1A1A1E] border border-white/10 text-[#E5E5E7] placeholder:text-[#6B6B70] focus:border-[--color-accent-magenta] focus:ring-1 focus:ring-[--color-accent-magenta]/30 rounded-md h-10 px-4 transition-all font-mono text-sm",
        formButtonPrimary:
            "bg-[--color-accent-magenta] hover:bg-[--color-accent-magenta-glow] text-[#0A0A0B] font-semibold h-10 rounded-md transition-all uppercase tracking-widest text-xs shadow-glow-magenta font-mono",
        footerActionLink:
            "text-[--color-accent-magenta] hover:text-[--color-accent-magenta-glow] font-medium transition-colors font-mono",
        identityPreviewEditButton:
            "text-[--color-accent-magenta] hover:text-[--color-accent-magenta-glow] transition-colors font-mono",
        formFieldAction:
            "text-[--color-accent-magenta] hover:text-[--color-accent-magenta-glow] text-xs transition-colors font-mono",
    },
};

interface AuthScreenProps {
    mode: "sign-in" | "sign-up";
}

export function AuthScreen({ mode }: AuthScreenProps) {
    return (
        <div className="relative min-h-screen bg-[--color-bg-graphite-0] flex flex-col">
            {/* Decorative Background Elements (Stars/Dots) - subtle noise if possible, but keeping clear for now */}

            {/* Main Content Centered */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">

                {/* Section Divider - The "Special Line" */}
                <div className="w-full max-w-2xl mb-8">
                    <SectionDivider label="AUTHENTICATION" accent={mode === "sign-in" ? "teal" : "magenta"} />
                </div>

                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <Link href="/">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1A1A1E] to-[#0A0A0B] border border-white/10 p-[1px] shadow-2xl relative group">
                                <div className="absolute inset-0 bg-accent-amber/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl duration-500 blur-xl" />
                                <div className="w-full h-full rounded-[11px] bg-[#0A0A0B] flex items-center justify-center relative overflow-hidden">
                                    <Image
                                        src="/assets/icon.png"
                                        alt="Ixos"
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 object-contain opacity-90"
                                    />
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-[--color-fg-porcelain] mb-3 font-mono tracking-tight">
                            {mode === "sign-in" ? "Welcome back" : "Create your account"}
                        </h1>
                        <p className="text-sm text-[--color-fg-muted] font-mono">
                            {mode === "sign-in"
                                ? "Sign in to access Ixos"
                                : "Get started with local-first semantic search"}
                        </p>
                    </div>

                    {/* Tab Toggle */}
                    <div className="bg-[--color-bg-graphite-1] rounded-md p-1 flex mb-8 border border-white/5">
                        <Link
                            href="/sign-in"
                            className={`flex-1 py-3 rounded-sm text-xs uppercase tracking-[0.15em] font-bold transition-all text-center font-mono ${mode === "sign-in"
                                ? "bg-[#1A1A1E] text-[--color-accent-teal] shadow-sm border border-white/5"
                                : "text-[#6B6B70] hover:text-[--color-fg-porcelain] hover:bg-white/5"
                                }`}
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/sign-up"
                            className={`flex-1 py-3 rounded-sm text-xs uppercase tracking-[0.15em] font-bold transition-all text-center font-mono ${mode === "sign-up"
                                ? "bg-[#1A1A1E] text-[--color-accent-magenta] shadow-sm border border-white/5"
                                : "text-[#6B6B70] hover:text-[--color-fg-porcelain] hover:bg-white/5"
                                }`}
                        >
                            Sign Up
                        </Link>
                    </div>

                    {/* Auth Form Container - Subtle/No Border */}
                    <div className="bg-[#0A0A0B] border border-white/5 rounded-sm p-8 shadow-2xl relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-sm" />
                        <div className="relative z-10">
                            {mode === "sign-in" ? (
                                <SignIn
                                    appearance={signInAppearance}
                                    routing="path"
                                    path="/sign-in"
                                    signUpUrl="/sign-up"
                                />
                            ) : (
                                <SignUp
                                    appearance={signUpAppearance}
                                    routing="path"
                                    path="/sign-up"
                                    signInUrl="/sign-in"
                                />
                            )}
                        </div>
                    </div>

                    {/* Privacy Notice */}
                    <div className="mt-8 text-center max-w-xs mx-auto">
                        <p className="text-[10px] text-[#444] font-mono leading-relaxed">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
