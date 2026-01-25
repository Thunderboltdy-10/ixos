"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { FadeInView } from "@/components/effects/FadeInView";

interface AccountDashboardProps {
  clerkUser: {
    id: string;
    email: string;
    name: string | null;
    imageUrl: string | null;
  };
  subscription: {
    status: string;
    plan: string;
    currentPeriodEnd: string | null;
  } | null;
  devices: {
    id: string;
    deviceId: string;
    deviceLabel: string;
    lastSeenAt: string | null;
    isActive: boolean;
  }[];
  isPro: boolean;
  portalUrl: string | null;
}

export function AccountDashboard({
  clerkUser,
  subscription,
  devices,
  isPro,
  portalUrl,
}: AccountDashboardProps) {
  const router = useRouter();
  const { signOut, openUserProfile } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Sign out failed:", error);
      setIsSigningOut(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-accent-teal bg-accent-teal/10 border-accent-teal/30";
      case "trialing":
        return "text-accent-amber bg-accent-amber/10 border-accent-amber/30";
      case "past_due":
        return "text-accent-amber bg-accent-amber/10 border-accent-amber/30";
      case "cancelled":
        return "text-fg-muted bg-white/5 border-white/10";
      default:
        return "text-fg-muted bg-white/5 border-white/10";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <FadeInView direction="up">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
          <div className="relative">
            {clerkUser.imageUrl ? (
              <img
                src={clerkUser.imageUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full border-2 border-stroke-hairline"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-graphite-2 border-2 border-stroke-hairline flex items-center justify-center text-2xl text-fg-muted">
                {clerkUser.email.slice(0, 1).toUpperCase()}
              </div>
            )}
            {isPro && (
              <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-accent-magenta text-[10px] font-mono text-bg-graphite-0 font-bold">
                PRO
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-porcelain mb-1">
              {clerkUser.name || "Ixos User"}
            </h1>
            <p className="text-fg-muted">{clerkUser.email}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openUserProfile()}
              className="border-white/10"
            >
              Edit Profile
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="border-white/10"
            >
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </div>
      </FadeInView>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Card */}
        <FadeInView direction="up" delay={100}>
          <div className="p-6 rounded-lg bg-bg-graphite-1/50 border border-white/5">
            <h2 className="text-lg font-semibold text-porcelain mb-4">Subscription</h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-fg-muted">Plan</span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-mono border",
                    isPro
                      ? "text-accent-magenta bg-accent-magenta/10 border-accent-magenta/30"
                      : "text-fg-muted bg-white/5 border-white/10"
                  )}
                >
                  {isPro ? "PROFESSIONAL" : "COMMUNITY"}
                </span>
              </div>

              {subscription && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-fg-muted">Status</span>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-mono border uppercase",
                        getStatusColor(subscription.status)
                      )}
                    >
                      {subscription.status}
                    </span>
                  </div>

                  {subscription.currentPeriodEnd && (
                    <div className="flex justify-between items-center">
                      <span className="text-fg-muted">Renews</span>
                      <span className="text-porcelain font-mono text-sm">
                        {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 border-t border-stroke-hairline">
                {isPro ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full border-white/10"
                    onClick={() => {
                      if (portalUrl) {
                        window.open(portalUrl, "_blank");
                        return;
                      }
                      router.push("/pricing");
                    }}
                  >
                    Manage Subscription
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-accent-magenta hover:bg-accent-magenta/90"
                    onClick={() => router.push("/pricing")}
                  >
                    Upgrade to Pro
                  </Button>
                )}
                {isPro && subscription?.currentPeriodEnd && (
                  <p className="mt-3 text-xs text-fg-dim">
                    Cancel any time in the billing portal. Access stays active until{" "}
                    {formatDate(subscription.currentPeriodEnd)}.
                  </p>
                )}
              </div>
            </div>
          </div>
        </FadeInView>

        {/* Devices Card */}
        <FadeInView direction="up" delay={200}>
          <div className="p-6 rounded-lg bg-bg-graphite-1/50 border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-porcelain">Devices</h2>
              <span className="text-xs font-mono text-fg-dim">
                {devices.length} registered
              </span>
            </div>

            {devices.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-fg-muted text-sm">No devices registered yet.</p>
                <p className="text-fg-dim text-xs mt-2">
                  Download Ixos and sign in to register your first device.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className={cn(
                      "p-3 rounded-md border",
                      device.isActive
                        ? "bg-accent-teal/5 border-accent-teal/20"
                        : "bg-white/[0.02] border-white/5"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-porcelain font-medium">
                            {device.deviceLabel}
                          </p>
                          {device.isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent-teal/20 text-accent-teal">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-fg-dim font-mono mt-1">
                          {device.deviceId.slice(0, 8)}...
                        </p>
                      </div>
                      <span className="text-xs text-fg-ghost">
                        {formatRelativeTime(device.lastSeenAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isPro && devices.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stroke-hairline">
                <p className="text-xs text-fg-dim">
                  Pro license is active on one device at a time. Transfer via the desktop
                  app.
                </p>
              </div>
            )}
          </div>
        </FadeInView>
      </div>

      {/* Privacy Notice */}
      <FadeInView direction="up" delay={300}>
        <div className="mt-8 p-4 rounded-lg bg-accent-amber/5 border border-accent-amber/20">
          <p className="text-sm text-fg-muted">
            <span className="text-accent-amber font-semibold">Your data is yours:</span>{" "}
            All search indexing and queries happen locally on your device. We only store
            your account info and subscription status.
          </p>
        </div>
      </FadeInView>
    </div>
  );
}
