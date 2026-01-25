import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { buildCheckoutUrl, getVariantId } from '@/lib/checkout';
import { openExternalUrl } from '@/lib/tauri';

export function PricingPanel() {
    const { user, entitlement } = useAuthStore();
    const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
    const variantId = getVariantId();

    const handleUpgrade = async () => {
        if (!user?.id || !variantId) return;

        // Set intent flag so we check for upgrade on return
        useAuthStore.getState().setUpgradeIntent(true);

        const name = (user as any).fullName || (user as any).firstName ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim() : undefined;
        const checkoutUrl = buildCheckoutUrl(variantId, user.id, user.email, name);
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
            <div className="p-8 text-center pt-12 pb-8">
                <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-porcelain">
                    Simple, transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-magenta to-accent-violet">ownership</span>
                </h2>

                {/* Toggle Switch */}
                <div className="flex justify-center items-center gap-4">
                    <span className={cn("text-sm transition-colors cursor-pointer select-none", billing === "monthly" ? "text-porcelain" : "text-fg-muted")} onClick={() => setBilling("monthly")}>Monthly</span>
                    <button
                        onClick={() => setBilling(b => b === "monthly" ? "annual" : "monthly")}
                        className="relative w-14 h-7 bg-white/5 rounded-full border border-white/10 p-1 transition-colors hover:border-accent-magenta/50"
                    >
                        <div className={cn(
                            "w-4 h-4 rounded-full bg-accent-magenta shadow-glow-magenta transition-all duration-300",
                            billing === "annual" ? "translate-x-7" : "translate-x-0"
                        )} />
                    </button>
                    <span className={cn("text-sm transition-colors cursor-pointer select-none", billing === "annual" ? "text-porcelain" : "text-fg-muted")} onClick={() => setBilling("annual")}>Annual <span className="text-accent-magenta text-xs font-mono ml-1">-20%</span></span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch h-full md:h-auto">
                    {/* Free Tier */}
                    <PricingCard
                        title="COMMUNITY"
                        price="$0"
                        period="/ forever"
                        desc="Full semantic search. No index tax. No cloud."
                        features={[
                            "Complete semantic search",
                            "Zero index tax (JIT mode)",
                            "100% local processing",
                            "Standard file types (PDF, TXT, MD)",
                            "Community support"
                        ]}
                        actionLabel="CURRENT PLAN"
                        actionDisabled={true}
                        actionClass="bg-accent-teal/10 border-accent-teal/20 text-accent-teal"
                    />

                    {/* Pro Tier */}
                    <div className="relative group h-full">
                        <div className="absolute -inset-0.5 bg-gradient-to-b from-accent-magenta/40 to-transparent rounded-lg opacity-50 blur-lg group-hover:opacity-80 transition-opacity duration-700" />
                        <PricingCard
                            title="PRO"
                            price={billing === "monthly" ? "$7.99" : "$6.35"}
                            period="/ month"
                            desc="Watch & Notify. Saved searches. Priority support."
                            highlighted
                            features={[
                                "File watch & notifications",
                                "Developer file types (TS, PY, RS, GO)",
                                "Journalist Mode (max privacy)",
                                "Priority model updates",
                                "Direct support access"
                            ]}
                            onAction={isPro ? undefined : handleUpgrade}
                            actionLabel={isPro ? "ACTIVE PLAN" : "INITIALIZE LICENSE"}
                            actionDisabled={isPro}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function PricingCard({
    title,
    price,
    period,
    desc,
    features,
    highlighted,
    onAction,
    actionLabel,
    actionDisabled,
    actionClass,
}: {
    title: string,
    price: string,
    period: string,
    desc: string,
    features: string[],
    highlighted?: boolean,
    onAction?: () => void,
    actionLabel?: string,
    actionDisabled?: boolean,
    actionClass?: string,
}) {
    return (
        <div className={cn(
            "relative h-full flex flex-col p-8 rounded-sm border backdrop-blur-md overflow-hidden transition-all duration-300",
            highlighted
                ? "bg-graphite-1/90 border-accent-magenta/40 shadow-glow-magenta/20"
                : "bg-graphite-2/50 border-white/10 hover:border-white/20"
        )}>
            {/* Corner Accents */}
            {highlighted && (
                <>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-accent-magenta" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent-magenta/50" />
                </>
            )}

            <div className="mb-8">
                <div className={cn("text-xs font-mono tracking-wider mb-4 opacity-80", highlighted ? "text-accent-magenta" : "text-fg-muted")}>
                    {title}
                </div>
                <div className="flex items-baseline gap-1 h-12">
                    <span className="text-5xl font-mono font-medium text-porcelain tracking-tighter tabular-nums transition-all duration-300 transform">
                        {price}
                    </span>
                    <span className="text-sm text-fg-muted font-mono">{period}</span>
                </div>
                <p className="mt-6 text-sm text-fg-muted leading-relaxed border-t border-stroke-hairline pt-6">
                    {desc}
                </p>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
                {features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm group/li">
                        <div className={cn(
                            "mt-1.5 w-1 h-1 rounded-full transition-colors",
                            highlighted ? "bg-accent-magenta group-hover/li:shadow-glow-magenta" : "bg-fg-muted"
                        )} />
                        <span className="text-porcelain opacity-90">{feat}</span>
                    </li>
                ))}
            </ul>

            <button
                type="button"
                onClick={onAction}
                disabled={actionDisabled}
                className={cn(
                    "w-full font-mono text-xs uppercase tracking-widest h-12 rounded-md transition-all flex items-center justify-center font-bold",
                    actionClass,
                    highlighted && !actionDisabled && "bg-accent-magenta hover:bg-accent-magenta/90 text-white shadow-glow-magenta hover:scale-[1.02]",
                    actionDisabled && !highlighted && "border border-accent-teal/20 text-accent-teal opacity-50 cursor-default",
                    actionDisabled && highlighted && "bg-white/5 text-fg-muted border border-white/10 cursor-default"
                )}
            >
                {actionLabel}
            </button>
        </div>
    );
}
