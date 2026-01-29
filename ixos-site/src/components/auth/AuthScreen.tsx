"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/ui/Nav";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { cn } from "@/lib/utils";

// Ixos Premium Glass Theme for Clerk
// Moving away from "hacker terminal" to "modern glass provider"
const commonAppearance = {
    variables: {
        colorPrimary: '#14B8A6', // Teal
        colorBackground: 'transparent',
        colorInputBackground: 'rgba(255, 255, 255, 0.05)',
        colorInputText: '#E5E5E7',
        colorText: '#E5E5E7',
        colorTextSecondary: '#A1A1A6',
        colorDanger: '#EF4444',
        borderRadius: '0.5rem',
        fontFamily: 'var(--font-ixo-heading), sans-serif',
        fontSize: '0.875rem',
    },
    elements: {
        rootBox: 'w-full flex justify-center', // Explicit centering
        card: 'bg-transparent shadow-none border-none p-0 w-full',
        headerTitle: 'hidden',
        headerSubtitle: 'hidden',

        // Social Buttons - Improved Contrast
        socialButtonsBlockButton: 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white transition-all h-10 flex items-center justify-center font-sans text-sm font-medium rounded-lg',
        socialButtonsBlockButtonText: 'text-zinc-100 font-medium ml-2',
        socialButtonsBlockButtonArrow: 'hidden',

        // Divider
        dividerLine: 'bg-white/10',
        dividerText: 'text-white/40 text-xs uppercase tracking-wider font-medium',

        // Inputs
        formFieldLabel: 'text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wide',
        formFieldInput: 'bg-zinc-900/50 border border-white/10 text-white placeholder:text-white/30 focus:border-accent-teal focus:ring-1 focus:ring-accent-teal/30 rounded-lg h-10 px-4 transition-all font-sans text-sm',

        // Buttons
        formButtonPrimary: 'bg-accent-teal hover:bg-accent-teal-glow text-bg-primary font-semibold h-10 rounded-lg transition-all text-sm shadow-lg shadow-accent-teal/20',

        // Footer Actions
        footerActionLink: 'text-accent-teal hover:text-accent-teal-glow font-medium transition-colors',
        identityPreviewText: 'text-white font-sans',
        identityPreviewEditButton: 'text-accent-teal hover:text-accent-teal-glow transition-colors',
        formFieldAction: 'text-accent-teal hover:text-accent-teal-glow text-xs transition-colors',
        alertText: 'text-white/60',
        footer: 'hidden',
        formFieldInputShowPasswordButton: 'text-white/40 hover:text-white/80 transition-colors',
        main: 'w-full flex flex-col items-center', // Ensure main content is centered
    },
};

const signInAppearance = {
    ...commonAppearance,
    variables: { ...commonAppearance.variables, colorPrimary: '#14B8A6' },
};

const signUpAppearance = {
    ...commonAppearance,
    variables: { ...commonAppearance.variables, colorPrimary: '#D946EF' }, // Magenta for Sign Up
    elements: {
        ...commonAppearance.elements,
        formFieldInput: 'bg-zinc-900/50 border border-white/10 text-white placeholder:text-white/30 focus:border-accent-magenta focus:ring-1 focus:ring-accent-magenta/30 rounded-lg h-10 px-4 transition-all font-sans text-sm',
        formButtonPrimary: 'bg-accent-magenta hover:bg-accent-magenta-glow text-bg-primary font-semibold h-10 rounded-lg transition-all text-sm shadow-lg shadow-accent-magenta/20',
        footerActionLink: 'text-accent-magenta hover:text-accent-magenta-glow font-medium transition-colors',
        identityPreviewEditButton: 'text-accent-magenta hover:text-accent-magenta-glow transition-colors',
        formFieldAction: 'text-accent-magenta hover:text-accent-magenta-glow text-xs transition-colors',
    },
};

interface AuthScreenProps {
    mode: "sign-in" | "sign-up";
}

export function AuthScreen({ mode }: AuthScreenProps) {
    return (
        <div className="relative min-h-screen flex flex-col font-sans">
            <Nav />

            {/* Section Divider */}
            <div className="pt-20">
                <SectionDivider accent={mode === "sign-in" ? "teal" : "magenta"} label={mode === "sign-in" ? "SIGN_IN" : "SIGN_UP"} />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 pb-12">

                {/* Glass Container */}
                <div className="w-full max-w-[440px] relative overflow-hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-bg-primary/40 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl" />

                    {/* Content */}
                    <div className="relative p-8 md:p-10 flex flex-col items-center">

                        {/* Header */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-12 h-12 mb-6 relative">
                                <Image
                                    src="/assets/icon.png"
                                    alt="Ixos"
                                    fill
                                    className="object-contain"
                                />
                            </div>

                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight text-center font-display">
                                {mode === "sign-in" ? "Welcome back" : "Create an account"}
                            </h1>
                            <p className="text-sm text-white/50 text-center max-w-[280px]">
                                {mode === "sign-in"
                                    ? "Enter your credentials to access your workspace"
                                    : "Get started with Ixos today"}
                            </p>
                        </div>

                        {/* Toggle */}
                        <div className="bg-white/5 p-1 rounded-lg flex mb-8 w-full">
                            <Link
                                href="/sign-in"
                                className={cn(
                                    "flex-1 py-1.5 rounded-md text-xs font-medium transition-all text-center",
                                    mode === "sign-in"
                                        ? "bg-white/10 text-white shadow-sm"
                                        : "text-white/40 hover:text-white"
                                )}
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/sign-up"
                                className={cn(
                                    "flex-1 py-1.5 rounded-md text-xs font-medium transition-all text-center",
                                    mode === "sign-up"
                                        ? "bg-white/10 text-white shadow-sm"
                                        : "text-white/40 hover:text-white"
                                )}
                            >
                                Sign Up
                            </Link>
                        </div>

                        {/* Clerk Component */}
                        <div className="min-h-[300px] w-full flex flex-col items-center justify-center overflow-hidden">
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
                </div>

                {/* Footer simple link */}
                <div className="mt-8 text-center">
                    <Link href="/terms" className="text-xs text-white/20 hover:text-white/40 transition-colors">
                        Terms of Service & Privacy Policy
                    </Link>
                </div>
            </div>
        </div>
    );
}

