import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useAuthStore } from '@/stores/authStore';
import { PlanBadge } from '@/components/account/PlanBadge';
import { openExternalUrl } from '@/lib/tauri';
import { buildCheckoutUrl, getVariantId } from '@/lib/checkout';

const variantId = getVariantId();

export function AccountSettings({ onUpgrade }: { onUpgrade?: () => void }) {
  const { user, entitlement, deviceLabel, devices, fetchDevices, fetchBillingPortal, refreshLease } = useAuthStore();
  const { getToken } = useAuth();

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
        await refreshLease(token, currentDeviceId);
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
    if (entitlement?.plan !== 'pro') {
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
        await refreshLease(token, useAuthStore.getState().deviceId!);
      }
    } catch (err) {
      console.error('Manual refresh failed:', err);
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
          className="text-xs text-fg-muted hover:text-accent-teal transition-colors underline"
          title="Force refresh subscription status"
        >
          Refresh Status
        </button>
      </div>

      <div className="bg-graphite-2/60 rounded-xl p-6 border border-stroke-hairline space-y-4">
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <div className="text-fg-muted">Email</div>
          <div className="text-porcelain font-mono">{user?.email ?? '—'}</div>

          <div className="text-fg-muted">Plan</div>
          <div>{entitlement ? <PlanBadge plan={entitlement.plan} /> : '—'}</div>

          <div className="text-fg-muted">Device</div>
          <div className="text-porcelain font-mono">{deviceLabel ?? '—'}</div>
        </div>
      </div>

      <div className="bg-graphite-2/55 rounded-xl p-6 border border-stroke-hairline">
        <h3 className="text-sm font-semibold text-porcelain mb-3">Registered Devices</h3>
        {devices.length === 0 ? (
          <p className="text-xs text-fg-secondary">No devices registered yet.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between">
                <div className="text-porcelain">{device.deviceLabel}</div>
                <div className="text-fg-secondary">
                  {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleManage}
          disabled={entitlement?.plan !== 'pro' && !variantId}
          className={
            entitlement?.plan === 'pro'
              ? "px-4 py-2 rounded-md bg-accent-teal/15 text-accent-teal text-xs uppercase tracking-[0.2em] font-semibold hover:bg-accent-teal/25 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              : "px-4 py-2 rounded-md bg-accent-magenta/20 text-accent-magenta text-xs uppercase tracking-[0.2em] font-semibold hover:bg-accent-magenta/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          }
        >
          {entitlement?.plan === 'pro' ? 'Manage Subscription' : 'Upgrade to Pro'}
        </button>
      </div>
    </div>
  );
}
