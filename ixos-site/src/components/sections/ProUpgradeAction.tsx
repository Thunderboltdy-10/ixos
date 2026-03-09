"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

type SubscriptionState = {
  isActive: boolean;
  portalUrl: string | null;
};

function ProUpgradeActionInner({ className, variantPrefix }: { className?: string, variantPrefix: string }) {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user } = useUser();

  const clerkUserId = searchParams.get("clerk_user_id") || undefined;
  const email = searchParams.get("email") || undefined;
  const variantId =
    searchParams.get("variant_id") ||
    process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_VARIANT_ID ||
    undefined;
  const successUrlParam = searchParams.get("success_url") || undefined;
  const cancelUrlParam = searchParams.get("cancel_url") || undefined;
  const currentUrl = typeof window !== "undefined" ? window.location.href.split("#")[0] : null;
  const hasDesktopContext = Boolean(clerkUserId || email);

  const buildReturnUrl = (state: "success" | "cancelled") => {
    if (!currentUrl) return null;
    try {
      const url = new URL(currentUrl);
      url.searchParams.set("checkout", state);
      return url.toString();
    } catch {
      return null;
    }
  };

  const successUrl = successUrlParam || buildReturnUrl("success");
  const cancelUrl = cancelUrlParam || buildReturnUrl("cancelled");

  useEffect(() => {
    let cancelled = false;

    async function loadSubscription() {
      if (!isLoaded || !isSignedIn || hasDesktopContext) {
        setSubscription(null);
        return;
      }

      try {
        const res = await fetch("/api/account/subscription", { method: "GET" });
        if (!res.ok) {
          setSubscription(null);
          return;
        }
        const data = (await res.json()) as SubscriptionState;
        if (!cancelled) setSubscription(data);
      } catch {
        if (!cancelled) setSubscription(null);
      }
    }

    loadSubscription();

    const refresh = () => {
      if (document.visibilityState === "visible" && isSignedIn && !hasDesktopContext) {
        loadSubscription();
      }
    };

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [hasDesktopContext, isLoaded, isSignedIn]);

  const checkoutUrl = useMemo(() => {
    const template = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL_TEMPLATE;
    if (!template || !variantId) return null;

    const effectiveClerkUserId = clerkUserId || userId || undefined;
    const effectiveEmail =
      email ||
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      undefined;

    const base = template.replace("{variantId}", variantId);
    const params = new URLSearchParams();

    if (effectiveClerkUserId) params.append("checkout[custom][clerk_user_id]", effectiveClerkUserId);
    if (successUrl) params.append("checkout[success_url]", successUrl);
    if (cancelUrl) params.append("checkout[cancel_url]", cancelUrl);
    if (effectiveEmail) params.append("checkout[email]", effectiveEmail);
    if (user?.fullName) params.append("checkout[name]", user.fullName);

    const paramString = params.toString();
    return paramString ? `${base}${base.includes("?") ? "&" : "?"}${paramString}` : base;
  }, [cancelUrl, clerkUserId, email, successUrl, user, userId, variantId]);

  const buttonClass = cn(
    "w-full font-mono text-xs uppercase tracking-widest h-12 rounded-md inline-flex items-center justify-center",
    "bg-accent-magenta hover:bg-accent-magenta-glow text-bg-graphite-0 font-bold shadow-glow-magenta hover:scale-[1.02] transition-all",
    className
  );

  if (isSignedIn) {
    const label = subscription?.isActive
      ? (subscription.portalUrl ? "MANAGE_SUBSCRIPTION" : "VIEW_ACCOUNT")
      : "INITIALIZE_LICENSE";

    return (
      <button
        type="button"
        onClick={() => {
          if (subscription?.isActive) {
            window.location.href = subscription.portalUrl || "/account";
            return;
          }
          if (checkoutUrl) {
            window.open(checkoutUrl, "_blank");
          }
        }}
        className={buttonClass}
      >
        {label}
      </button>
    );
  }

  if (hasDesktopContext && checkoutUrl) {
    return (
      <button
        type="button"
        onClick={() => window.open(checkoutUrl, "_blank")}
        className={buttonClass}
      >
        INITIALIZE_LICENSE
      </button>
    );
  }

  return (
    <Link href={`${variantPrefix || ''}/signin?redirect_url=${variantPrefix || ''}/pricing`} className={buttonClass}>
      SIGN_IN_TO_UPGRADE
    </Link>
  );
}

export function ProUpgradeAction({ className, variantPrefix = "" }: { className?: string, variantPrefix?: string }) {
  return (
    <Suspense fallback={<button className={cn("w-full font-mono text-xs uppercase tracking-widest h-12 rounded-md inline-flex items-center justify-center bg-gray-500 animate-pulse text-white", className)}>Loading...</button>}>
      <ProUpgradeActionInner className={className} variantPrefix={variantPrefix} />
    </Suspense>
  );
}
