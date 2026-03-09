import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useAuthStore } from '@/stores/authStore';
import { PlanBadge } from '@/components/account/PlanBadge';
import { openExternalUrl, setEntitlementToken as setBackendEntitlementToken } from '@/lib/tauri';
import { buildCheckoutUrl, getVariantId } from '@/lib/checkout';
import { cn } from '@/lib/utils';
import { hasProAccess } from '@/lib/proAccess';
import { storeEntitlementToken } from '@/lib/authToken';

const variantId = getVariantId();

export function AccountSettings({ onUpgrade }: { onUpgrade?: () => void }) {
  const {
    user,
    entitlement,
    entitlementToken,
    proStatus,
    deviceLabel,
    deviceId,
    devices,
    fetchDevices,
    fetchBillingPortal,
    refreshLease,
    setEntitlementToken,
    logoutDevice,
    unregisterDevice,
    logoutAllDevices,
    clearLocalSession,
  } = useAuthStore();
  const isPro = hasProAccess(entitlement, entitlementToken, proStatus);
  const { getToken, signOut } = useAuth();
  const [actionDeviceId, setActionDeviceId] = useState<string | null>(null);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const currentDeviceId = deviceId ?? useAuthStore.getState().deviceId;

  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      if (a.deviceId === currentDeviceId) return -1;
      if (b.deviceId === currentDeviceId) return 1;
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });
  }, [devices, currentDeviceId]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: NodeJS.Timeout;

    // Initial load
    async function loadDevices() {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        await fetchDevices(token);
      } catch {
        // no-op
      }
    }

    // Polling for status updates (e.g. after purchase)
    async function pollStatus() {
      const token = await getToken();
      // Use the current device ID from store if available
      const currentDeviceId = useAuthStore.getState().deviceId;
      if (!token || !currentDeviceId || cancelled) return;

      try {
        const refreshed = await refreshLease(token, currentDeviceId);
        if (refreshed?.token) {
          setEntitlementToken(refreshed.token);
          await storeEntitlementToken(refreshed.token).catch(() => {});
          await setBackendEntitlementToken(refreshed.token).catch(() => {});
        }
      } catch {
        // suppress polling errors
      }
    }

    loadDevices();

    // Poll every 5 seconds to catch subscription changes immediately
    intervalId = setInterval(pollStatus, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [getToken, fetchDevices, refreshLease]);

  const handleManage = async () => {
    if (!user?.id) return;

    // Free users
    if (!isPro) {
      // If internal upgrade handler is provided (e.g. from AppShell), use it
      if (onUpgrade) {
        onUpgrade();
        return;
      }

      // Fallback: Open checkout directly
      if (!variantId) {
        console.warn('Missing VITE_LEMONSQUEEZY_PRO_VARIANT_ID');
        return;
      }

      // Get user name if available
      const name = (user as any).fullName || (user as any).firstName ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim() : undefined;

      const checkoutUrl = buildCheckoutUrl(variantId, user.id, user.email, name);
      try {
        await openExternalUrl(checkoutUrl);
      } catch (error) {
        console.warn('Failed to open checkout:', error);
        window.open(checkoutUrl, '_blank');
      }
      return;
    }

    // Pro users: open billing portal
    const token = await getToken();
    if (!token) return;
    try {
      const { portalUrl } = await fetchBillingPortal(token);
      if (portalUrl) {
        await openExternalUrl(portalUrl);
      }
    } catch (error) {
      console.warn('Failed to open billing portal:', error);
    }
  };

  const handleRefresh = async () => {
    const token = await getToken();
    if (!token || !devices.length) return;
    try {
      // Refresh with current device ID
      // const currentDevice = devices.find(d => d.deviceLabel === deviceLabel); // Approximation
      if (useAuthStore.getState().deviceId) {
        const refreshed = await refreshLease(token, useAuthStore.getState().deviceId!);
        if (refreshed?.token) {
          setEntitlementToken(refreshed.token);
          await storeEntitlementToken(refreshed.token).catch(() => {});
          await setBackendEntitlementToken(refreshed.token).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Manual refresh failed:', err);
    }
  };

  const handleLogoutDevice = async (targetDeviceId: string) => {
    const token = await getToken();
    if (!token) return;
    setActionDeviceId(targetDeviceId);
    try {
      await logoutDevice(token, targetDeviceId);
      if (targetDeviceId === currentDeviceId) {
        await clearLocalSession();
        await signOut().catch(() => {});
        return;
      }
      await fetchDevices(token);
    } catch (error) {
      console.warn('Failed to logout device:', error);
    } finally {
      setActionDeviceId(null);
    }
  };

  const handleForgetDevice = async (targetDeviceId: string) => {
    const token = await getToken();
    if (!token) return;
    setActionDeviceId(targetDeviceId);
    try {
      await unregisterDevice(token, targetDeviceId);
      if (targetDeviceId === currentDeviceId) {
        await clearLocalSession();
        await signOut().catch(() => {});
        return;
      }
      await fetchDevices(token);
    } catch (error) {
      console.warn('Failed to forget device:', error);
    } finally {
      setActionDeviceId(null);
    }
  };

  const handleLogoutAll = async () => {
    const token = await getToken();
    if (!token) return;
    setLogoutAllLoading(true);
    try {
      await logoutAllDevices(token);
      await clearLocalSession();
      await signOut().catch(() => {});
    } catch (error) {
      console.warn('Failed to logout all devices:', error);
    } finally {
      setLogoutAllLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-porcelain mb-2">Account</h2>
          <p className="text-fg-secondary leading-relaxed">
            Your Ixos account controls access to Pro features and device leases.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 rounded-md border border-white/10 text-xs text-fg-muted hover:text-accent-teal hover:border-accent-teal/40 transition-colors"
          title="Force refresh subscription status"
        >
          Refresh Status
        </button>
      </div>

      <div className="bg-graphite-2/60 rounded-xl p-6 border border-stroke-hairline space-y-4">
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <div className="text-fg-muted">Email</div>
          <div className="text-porcelain font-mono">{user?.email ?? 'N/A'}</div>

          <div className="text-fg-muted">Plan</div>
          <div>{entitlement ? <PlanBadge plan={entitlement.plan} /> : 'N/A'}</div>

          <div className="text-fg-muted">Device</div>
          <div className="text-porcelain font-mono">{deviceLabel ?? 'N/A'}</div>
        </div>
      </div>

      <div className="bg-graphite-2/55 rounded-xl p-6 border border-stroke-hairline">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-porcelain">Registered Devices</h3>
            <p className="text-xs text-fg-secondary mt-1">Manage active sessions and trusted devices.</p>
          </div>
        </div>
        {sortedDevices.length === 0 ? (
          <p className="text-sm text-fg-secondary">No devices registered yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedDevices.map((device) => {
              const isCurrent = device.deviceId === currentDeviceId;
              return (
                <div key={device.id} className="rounded-lg border border-white/5 bg-graphite-2/40 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-porcelain text-sm font-medium truncate">
                          {device.deviceLabel}
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal border border-accent-teal/30">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-fg-secondary mt-1">
                        Last seen: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Unknown'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLogoutDevice(device.deviceId)}
                        disabled={actionDeviceId === device.deviceId}
                        className={cn(
                          "min-w-[74px] px-3 h-8 text-[11px] rounded-lg border text-center",
                          "border-white/10 text-fg-muted hover:text-white hover:border-white/30 transition-colors",
                          actionDeviceId === device.deviceId && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        Log out
                      </button>
                      <button
                        type="button"
                        onClick={() => handleForgetDevice(device.deviceId)}
                        disabled={actionDeviceId === device.deviceId}
                        className={cn(
                          "min-w-[74px] px-3 h-8 text-[11px] rounded-lg border text-center",
                          "border-accent-magenta/30 text-accent-magenta hover:border-accent-magenta/60 transition-colors",
                          actionDeviceId === device.deviceId && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        Forget
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={handleLogoutAll}
            disabled={logoutAllLoading}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg text-xs font-semibold",
              "bg-error/10 text-error border border-error/30 hover:bg-error/20 transition-colors",
              logoutAllLoading && "opacity-60 cursor-not-allowed"
            )}
          >
            {logoutAllLoading ? 'Logging out...' : 'Log out all devices'}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleManage}
          disabled={!isPro && !variantId}
          className={
            isPro
              ? "px-4 py-2.5 rounded-md bg-accent-teal/15 text-accent-teal text-xs font-semibold hover:bg-accent-teal/25 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              : "px-4 py-2.5 rounded-md bg-accent-magenta/20 text-accent-magenta text-xs font-semibold hover:bg-accent-magenta/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          }
        >
          {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
        </button>
      </div>
    </div>
  );
}

