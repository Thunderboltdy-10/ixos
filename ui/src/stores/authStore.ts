import { create } from 'zustand';
import { getApiBase } from '@/lib/api';

export type PlanTier = 'free' | 'pro';

export interface LeaseInfo {
  status: 'active' | 'none';
  expiresAt?: string | null;
  activeDeviceId?: string | null;
}

export interface EntitlementInfo {
  plan: PlanTier;
  features: string[];
  lease: LeaseInfo;
  ui: {
    showUpgrade: boolean;
  };
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface DeviceInfo {
  id: string;
  deviceId: string;
  deviceLabel: string;
  lastSeenAt?: string | null;
  updatedAt?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  deviceId: string | null;
  deviceLabel: string | null;
  entitlement: EntitlementInfo | null;
  entitlementToken: string | null;
  devices: DeviceInfo[];
  transferRequired: boolean;
  transferToken: string | null;
  activeDeviceId: string | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: AuthUser | null) => void;
  setDevice: (deviceId: string, deviceLabel: string) => void;
  setEntitlement: (entitlement: EntitlementInfo | null) => void;
  setEntitlementToken: (token: string | null) => void;
  setDevices: (devices: DeviceInfo[]) => void;

  registerDevice: (authToken: string, deviceId: string, deviceLabel: string) => Promise<void>;
  fetchEntitlement: (authToken: string, deviceId: string) => Promise<EntitlementInfo | null>;
  claimLease: (authToken: string, deviceId: string) => Promise<{ token?: string | null }>;
  refreshLease: (authToken: string, deviceId: string) => Promise<{ token?: string | null }>;
  requestTransfer: (authToken: string, deviceId: string, transferToken?: string) => Promise<void>;
  fetchDevices: (authToken: string) => Promise<DeviceInfo[]>;
  fetchBillingPortal: (authToken: string) => Promise<{ portalUrl: string | null }>;

  // Intent-based sync
  upgradeIntent: boolean;
  setUpgradeIntent: (intent: boolean) => void;
}

const API_BASE = getApiBase();

async function apiRequest(path: string, authToken: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  deviceId: null,
  deviceLabel: null,
  entitlement: null,
  entitlementToken: null,
  devices: [],
  transferRequired: false,
  transferToken: null,
  activeDeviceId: null,
  isLoading: false,
  error: null,

  upgradeIntent: false,
  setUpgradeIntent: (intent) => set({ upgradeIntent: intent }),

  setUser: (user) => set({ user }),
  setDevice: (deviceId, deviceLabel) => set({ deviceId, deviceLabel }),
  setEntitlement: (entitlement) => set({ entitlement }),
  setEntitlementToken: (token) => set({ entitlementToken: token }),
  setDevices: (devices) => set({ devices }),

  registerDevice: async (authToken, deviceId, deviceLabel) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest('/api/desktop/register-device', authToken, {
      method: 'POST',
      body: JSON.stringify({ deviceId, deviceLabel }),
    });
    if (!res.ok) {
      const text = await res.text();
      set({ isLoading: false, error: text || 'Device registration failed' });
      throw new Error(text || 'Device registration failed');
    }
    set({ isLoading: false });
  },

  fetchEntitlement: async (authToken, deviceId) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest(`/api/desktop/entitlement?deviceId=${encodeURIComponent(deviceId)}`, authToken, {
      method: 'GET',
    });
    if (!res.ok) {
      const text = await res.text();
      set({ isLoading: false, error: text || 'Entitlement fetch failed' });
      throw new Error(text || 'Entitlement fetch failed');
    }
    const data = (await res.json()) as EntitlementInfo;
    set({ entitlement: data, isLoading: false });
    return data;
  },

  claimLease: async (authToken, deviceId) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest('/api/desktop/lease/claim', authToken, {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
    if (res.status === 409) {
      const data = await res.json().catch(() => null);
      set({
        isLoading: false,
        transferRequired: true,
        transferToken: data?.transferToken ?? null,
        activeDeviceId: data?.activeDeviceId ?? null,
      });
      return {};
    }
    if (!res.ok) {
      const text = await res.text();
      set({ isLoading: false, error: text || 'Lease claim failed' });
      throw new Error(text || 'Lease claim failed');
    }
    const data = await res.json();
    if (data?.plan && data?.lease) {
      set({
        entitlement: { ...data, ui: { showUpgrade: data.plan !== 'pro' } },
        isLoading: false,
        transferRequired: false,
        transferToken: null,
        activeDeviceId: null,
      });
    } else {
      set({ isLoading: false });
    }
    return { token: data?.token ?? null };
  },

  refreshLease: async (authToken, deviceId) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest('/api/desktop/lease/refresh', authToken, {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
    if (res.status === 409) {
      const data = await res.json().catch(() => null);
      set({
        isLoading: false,
        transferRequired: true,
        transferToken: data?.transferToken ?? null,
        activeDeviceId: data?.activeDeviceId ?? null,
      });
      return {};
    }
    if (!res.ok) {
      const text = await res.text();
      set({ isLoading: false, error: text || 'Lease refresh failed' });
      throw new Error(text || 'Lease refresh failed');
    }
    const data = await res.json();
    if (data?.plan && data?.lease) {
      set({
        entitlement: { ...data, ui: { showUpgrade: data.plan !== 'pro' } },
        isLoading: false,
        transferRequired: false,
        transferToken: null,
        activeDeviceId: null,
      });
    } else {
      set({ isLoading: false });
    }
    return { token: data?.token ?? null };
  },

  requestTransfer: async (authToken, deviceId, transferToken) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest('/api/desktop/lease/transfer/request', authToken, {
      method: 'POST',
      body: JSON.stringify({ deviceId, transferToken }),
    });
    if (!res.ok) {
      const text = await res.text();
      set({ isLoading: false, error: text || 'Transfer request failed' });
      throw new Error(text || 'Transfer request failed');
    }
    set({ isLoading: false });
  },

  fetchDevices: async (authToken) => {
    const res = await apiRequest('/api/desktop/devices', authToken, {
      method: 'GET',
    });
    if (!res.ok) {
      const text = await res.text();
      set({ error: text || 'Failed to load devices' });
      throw new Error(text || 'Failed to load devices');
    }
    const data = await res.json();
    const devices = (data?.devices || []) as DeviceInfo[];
    set({ devices });
    return devices;
  },

  fetchBillingPortal: async (authToken) => {
    const res = await apiRequest('/api/desktop/billing', authToken, {
      method: 'GET',
    });
    if (!res.ok) {
      const text = await res.text();
      set({ error: text || 'Failed to load billing portal' });
      throw new Error(text || 'Failed to load billing portal');
    }
    const data = await res.json();
    return { portalUrl: data?.portalUrl ?? null };
  },
}));
