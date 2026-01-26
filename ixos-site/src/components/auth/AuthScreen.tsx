"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

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
        borderRadius: "0.25rem", // More square (rounded-sm equivalent)
        fontFamily: "system-ui, -apple-system, sans-serif",
    },
    elements: {
        rootBox: "w-full",
        card: "bg-transparent shadow-none border-none p-0",
        headerTitle: "hidden",
        headerSubtitle: "hidden",
        // Increased visibility for social buttons: lighter background, subtle border
        socialButtonsBlockButton:
            "bg-[#27272A] border border-white/10 hover:bg-[#3F3F46] text-white transition-all h-10 flex items-center justify-center shadow-lg shadow-black/20",
        socialButtonsBlockButtonText: "text-white font-medium ml-2",
        socialButtonsBlockButtonArrow: "hidden",
        dividerLine: "bg-[#2A2A2E]",
        dividerText: "text-[#6B6B70] text-xs uppercase tracking-wider",
        formFieldLabel:
            "text-[#A1A1A6] text-xs font-medium mb-1.5 uppercase tracking-wide",
        formFieldInput:
            "bg-[#1A1A1E] border border-white/10 text-[#E5E5E7] placeholder:text-[#6B6B70] focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6]/30 rounded-md h-10 px-4 transition-all",
        formButtonPrimary:
            "bg-[--color-accent-teal] hover:bg-[--color-accent-teal-dim] text-[#0A0A0B] font-semibold h-10 rounded-md transition-all uppercase tracking-widest text-xs shadow-glow-teal",
        footerActionLink:
            "text-[#14B8A6] hover:text-[#0D9488] font-medium transition-colors",
        identityPreviewText: "text-[#E5E5E7]",
        identityPreviewEditButton:
            "text-[#14B8A6] hover:text-[#0D9488] transition-colors",
        formFieldAction:
            "text-[#14B8A6] hover:text-[#0D9488] text-xs transition-colors",
        alertText: "text-[#A1A1A6]",
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
            "bg-[#1A1A1E] border border-white/10 text-[#E5E5E7] placeholder:text-[#6B6B70] focus:border-[--color-accent-magenta] focus:ring-1 focus:ring-[--color-accent-magenta]/30 rounded-md h-10 px-4 transition-all",
        formButtonPrimary:
            "bg-[--color-accent-magenta] hover:bg-[--color-accent-magenta-glow] text-[#0A0A0B] font-semibold h-10 rounded-md transition-all uppercase tracking-widest text-xs shadow-glow-magenta",
        footerActionLink:
            "text-[--color-accent-magenta] hover:text-[--color-accent-magenta-glow] font-medium transition-colors",
        identityPreviewEditButton:
            "text-[--color-accent-magenta] hover:text-[--color-accent-magenta-glow] transition-colors",
        formFieldAction:
            "text-[--color-accent-magenta] hover:text-[--color-accent-magenta-glow] text-xs transition-colors",
    },
};

interface AuthScreenProps {
    mode: "sign-in" | "sign-up";
}

export function AuthScreen({ mode }: AuthScreenProps) {
    return (
        <div className="min-h-screen bg-[--color-bg-graphite-0] flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Link href="/">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[--color-accent-amber] to-[--color-accent-amber]/60 p-[1px] shadow-glow-amber">
                            <div className="w-full h-full rounded-[11px] bg-[--color-bg-graphite-1] flex items-center justify-center relative">
                                <Image
                                    src="/assets/icon.png"
                                    alt="Ixos"
                                    width={36}
                                    height={36}
                                    className="w-9 h-9 object-contain"
                                />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-semibold text-[--color-fg-porcelain] mb-2 font-display">
                        {mode === "sign-in" ? "Welcome back" : "Create your account"}
                    </h1>
                    <p className="text-sm text-[--color-fg-muted]">
                        {mode === "sign-in"
                            ? "Sign in to access Ixos"
                            : "Get started with local-first semantic search"}
                    </p>
                </div>

                {/* Tab Toggle */}
                <div className="bg-[--color-bg-graphite-2] rounded-md p-1 flex mb-6 border border-white/5">
                    <Link
                        href="/sign-in"
                        className={`flex-1 py-2 rounded-sm text-xs uppercase tracking-[0.15em] font-semibold transition-all text-center ${mode === "sign-in"
                            ? "bg-[--color-bg-graphite-1] text-[--color-accent-teal] shadow-sm"
                            : "text-[--color-fg-muted] hover:text-[--color-fg-porcelain]"
                            }`}
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/sign-up"
                        className={`flex-1 py-2 rounded-sm text-xs uppercase tracking-[0.15em] font-semibold transition-all text-center ${mode === "sign-up"
                            ? "bg-[--color-bg-graphite-1] text-[--color-accent-magenta] shadow-sm"
                            : "text-[--color-fg-muted] hover:text-[--color-fg-porcelain]"
                            }`}
                    >
                        Sign Up
                    </Link>
                </div>

                {/* Auth Form Container - Subtle/No Border */}
                <div className="bg-[--color-bg-graphite-1]/30 rounded-sm p-6 backdrop-blur-md">
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

                {/* Privacy Notice */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-[--color-fg-muted]/60">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
}
