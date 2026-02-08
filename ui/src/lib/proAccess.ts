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
  if (entitlement?.plan === 'pro') {
    // Server lease is authoritative for UI gating. Keep access while local status
    // is initializing to avoid transient startup downgrades for valid Pro users.
    if (entitlement.lease?.status === 'active') {
      return proStatus?.status !== 'timeSuspect';
    }
    if (!proStatus) return true;
    return proStatus.status === 'active' || proStatus.status === 'grace';
  }

  if (!entitlementToken || !proStatus) {
    return false;
  }

  const tokenPlan = decodeTokenPlan(entitlementToken);
  if (tokenPlan !== 'pro') {
    return false;
  }

  return proStatus.status === 'active' || proStatus.status === 'grace';
}
