import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useAuthStore } from '@/stores/authStore';
import { PlanBadge } from '@/components/account/PlanBadge';
import { openExternalUrl } from '@/lib/tauri';
import { buildCheckoutUrl, getVariantId } from '@/lib/checkout';

const variantId = getVariantId();

export function AccountSettings() {
  const { user, entitlement, deviceLabel, devices, fetchDevices, fetchBillingPortal } = useAuthStore();
  const { getToken } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function loadDevices() {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        await fetchDevices(token);
      } catch {
        // no-op
      }
    }
    loadDevices();
    return () => {
      cancelled = true;
    };
  }, [getToken, fetchDevices]);

  const handleManage = async () => {
    if (!user?.id) return;

    // Free users: open Lemon Squeezy checkout in browser
    if (entitlement?.plan !== 'pro') {
      if (!variantId) {
        console.warn('Missing VITE_LEMONSQUEEZY_PRO_VARIANT_ID');
        return;
      }
      const checkoutUrl = buildCheckoutUrl(variantId, user.id, user.email);
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold text-porcelain mb-2">Account</h2>
        <p className="text-fg-secondary leading-relaxed">
          Your Ixos account controls access to Pro features and device leases.
        </p>
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
              ? "px-4 py-2 rounded-md bg-accent-teal/15 text-accent-teal text-xs uppercase tracking-[0.2em] font-semibold hover:bg-accent-teal/25 disabled:opacity-60 disabled:cursor-not-allowed"
              : "px-4 py-2 rounded-md bg-accent-magenta/20 text-accent-magenta text-xs uppercase tracking-[0.2em] font-semibold hover:bg-accent-magenta/30 disabled:opacity-60 disabled:cursor-not-allowed"
          }
        >
          {entitlement?.plan === 'pro' ? 'Manage Subscription' : 'Upgrade to Pro'}
        </button>
      </div>
    </div>
  );
}
