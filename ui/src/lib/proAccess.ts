import type { ProStatus } from '@/lib/types';
import type { EntitlementInfo } from '@/stores/authStore';

function decodeTokenPlan(entitlementToken: string): string | null {
  const parts = entitlementToken.split('.');
  if (parts.length < 2) return null;

  try {
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (payload.length % 4)) % 4;
    payload = payload.padEnd(payload.length + padLength, '=');

    const decoded = atob(payload);
    const parsed = JSON.parse(decoded) as { plan?: unknown };
    return typeof parsed.plan === 'string' ? parsed.plan.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function hasProAccess(
  entitlement: EntitlementInfo | null | undefined,
  entitlementToken: string | null | undefined,
  proStatus: ProStatus | null | undefined
): boolean {
  const statusAllowsPro = proStatus?.status === 'active' || proStatus?.status === 'grace';

  if (entitlement?.plan === 'pro') {
    // Security-first UI gating: require both active lease and active/grace local status.
    // Backend enforcement remains authoritative.
    if (entitlement.lease?.status !== 'active') return false;
    return statusAllowsPro;
  }

  if (!entitlementToken || !statusAllowsPro) {
    return false;
  }

  const tokenPlan = decodeTokenPlan(entitlementToken);
  if (tokenPlan !== 'pro') {
    return false;
  }

  return true;
}
