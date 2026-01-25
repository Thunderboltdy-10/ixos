import { useState } from 'react';
import { Check, Shield, Zap, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { buildCheckoutUrl, getVariantId } from '@/lib/checkout';
import { openExternalUrl } from '@/lib/tauri';
import { motion } from 'framer-motion';

export function PricingPanel() {
    const { user, entitlement } = useAuthStore();
    const variantId = getVariantId();

    const handleUpgrade = async () => {
        if (!user?.id || !variantId) return;

        // Set intent flag so we check for upgrade on return
        useAuthStore.getState().setUpgradeIntent(true);

        const checkoutUrl = buildCheckoutUrl(variantId, user.id, user.email);
        try {
            await openExternalUrl(checkoutUrl);
        } catch (error) {
            console.error('Failed to open checkout:', error);
            window.open(checkoutUrl, '_blank');
        }
    };

    const isPro = entitlement?.plan === 'pro';

    return (
        <div className="flex flex-col h-full bg-graphite-1/98 backdrop-blur-xl border border-stroke-hairline rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-8 text-center pt-12">
                <h2 className="text-3xl font-display font-semibold text-porcelain mb-3">Upgrade to Pro</h2>
                <p className="text-sm text-fg-secondary max-w-md mx-auto leading-relaxed">
                    Unlock the full power of Ixos with semantic search, deep file analysis, and priority support.
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center p-8 gap-6 max-w-4xl mx-auto w-full">
                {/* Free Plan */}
                <div className="flex-1 rounded-xl bg-graphite-2/50 border border-white/[0.04] p-6 flex flex-col h-[420px] relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-porcelain mb-1">Community</h3>
                        <p className="text-3xl font-mono text-fg-muted font-bold">$0</p>
                        <p className="text-xs text-fg-dim mt-1">Forever free for personal use</p>
                    </div>

                    <ul className="space-y-4 flex-1">
                        <FeatureItem text="Basic lexical search" />
                        <FeatureItem text="Local text file indexing" />
                        <FeatureItem text="Manual sync" />
                        <FeatureItem text="Community support" textClassName="text-fg-dim" />
                    </ul>

                    <div className="mt-6 pt-6 border-t border-white/[0.04] text-center">
                        {isPro ? (
                            <span className="text-xs text-fg-muted uppercase tracking-widest font-semibold opacity-50">Included</span>
                        ) : (
                            <span className="text-xs text-accent-teal uppercase tracking-widest font-semibold">Current Plan</span>
                        )}
                    </div>
                </div>

                {/* Pro Plan */}
                <div className="flex-1 rounded-xl bg-gradient-to-b from-accent-magenta/5 to-transparent border border-accent-magenta/30 p-6 flex flex-col h-[460px] relative shadow-glow-magenta-sm transform scale-105 z-10">
                    <div className="absolute top-0 right-0 p-3">
                        <div className="bg-accent-magenta text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Recommended</div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-porcelain mb-1 flex items-center gap-2">
                            Professional
                            <Zap className="w-4 h-4 text-accent-magenta fill-accent-magenta" />
                        </h3>
                        <p className="text-3xl font-mono text-white font-bold">$7.99<span className="text-sm text-fg-muted font-normal ml-1">/mo</span></p>
                        <p className="text-xs text-accent-magenta/80 mt-1">Billed monthly</p>
                    </div>

                    <ul className="space-y-4 flex-1">
                        <FeatureItem text="Semantic Search (AI)" active />
                        <FeatureItem text="PDF, DOCX, & Code Analysis" active />
                        <FeatureItem text="Real-time file watching" active />
                        <FeatureItem text="Priority Updates & Support" active />
                        <FeatureItem text="Early access to features" active />
                    </ul>

                    <div className="mt-6 pt-6 border-t border-accent-magenta/20">
                        {isPro ? (
                            <button disabled className="w-full py-2.5 rounded-lg bg-white/5 text-fg-muted text-xs font-semibold uppercase tracking-wider cursor-default border border-white/5">
                                Active Plan
                            </button>
                        ) : (
                            <button
                                onClick={handleUpgrade}
                                className="w-full py-2.5 rounded-lg bg-accent-magenta text-white text-xs font-semibold uppercase tracking-wider hover:bg-accent-magenta/90 hover:shadow-glow-magenta transition-all flex items-center justify-center gap-2"
                            >
                                Upgrade Now <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                            </button>
                        )}
                        <p className="text-[10px] text-center text-fg-dim mt-3">Secure payment via Lemon Squeezy</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ text, active, textClassName }: { text: string; active?: boolean; textClassName?: string }) {
    return (
        <li className="flex items-start gap-3">
            <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                active ? "bg-accent-magenta/20 text-accent-magenta" : "bg-white/5 text-fg-dim"
            )}>
                <Check className="w-3 h-3" />
            </div>
            <span className={cn("text-sm leading-tight", active ? "text-porcelain" : "text-fg-secondary", textClassName)}>
                {text}
            </span>
        </li>
    );
}
