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
  token?: string;
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

  registerDevice: (authToken: string, deviceId: string, deviceLabel: string, devicePublicKey?: string | null) => Promise<void>;
  fetchEntitlement: (authToken: string, deviceId: string) => Promise<EntitlementInfo | null>;
  claimLease: (authToken: string, deviceId: string, devicePublicKey?: string | null) => Promise<{ token?: string | null }>;
  refreshLease: (authToken: string, deviceId: string, devicePublicKey?: string | null) => Promise<{ token?: string | null }>;
  requestTransfer: (authToken: string, deviceId: string, transferToken?: string) => Promise<void>;
  confirmTransfer: (authToken: string, deviceId: string, code: string) => Promise<{ token?: string | null }>;
  logoutDevice: (authToken: string, deviceId: string) => Promise<void>;
  forgetDevice: (authToken: string, deviceId: string) => Promise<void>;
  logoutAllDevices: (authToken: string) => Promise<void>;
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

  registerDevice: async (authToken, deviceId, deviceLabel, devicePublicKey) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest('/api/desktop/register-device', authToken, {
      method: 'POST',
      body: JSON.stringify({ deviceId, deviceLabel, devicePublicKey }),
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
    const data = await res.json();
    set({
      entitlement: data as EntitlementInfo,
      entitlementToken: data?.token ?? null,
      isLoading: false,
    });
    return data as EntitlementInfo & { token?: string };
  },

  claimLease: async (authToken, deviceId, devicePublicKey) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest('/api/desktop/lease/claim', authToken, {
      method: 'POST',
      body: JSON.stringify({ deviceId, devicePublicKey }),
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

   refreshLease: async (authToken, deviceId, devicePublicKey) => {
     set({ isLoading: true, error: null });
     const res = await apiRequest('/api/desktop/lease/refresh', authToken, {
       method: 'POST',
       body: JSON.stringify({ deviceId, devicePublicKey }),
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
       if (res.status === 401) {
         console.warn('Lease refresh unauthorized (401) - authentication token may be expired');
         set({ isLoading: false, error: 'Session expired. Please sign in again.' });
         throw new Error('SESSION_EXPIRED');
       }
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

  confirmTransfer: async (authToken, deviceId, code) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest('/api/desktop/lease/transfer/confirm', authToken, {
      method: 'POST',
      body: JSON.stringify({ deviceId, code }),
    });
    if (!res.ok) {
      const text = await res.text();
      set({ isLoading: false, error: text || 'Transfer confirmation failed' });
      throw new Error(text || 'Transfer confirmation failed');
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

  logoutDevice: async (authToken, deviceId) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest(`/api/desktop/devices/${encodeURIComponent(deviceId)}/logout`, authToken, {
      method: 'POST',
    });
    if (!res.ok) {
      const text = await res.text();
      set({ isLoading: false, error: text || 'Device logout failed' });
      throw new Error(text || 'Device logout failed');
    }
    set({ isLoading: false });
  },

  forgetDevice: async (authToken, deviceId) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest(`/api/desktop/devices/${encodeURIComponent(deviceId)}/forget`, authToken, {
      method: 'POST',
    });
    if (!res.ok) {
      const text = await res.text();
      set({ isLoading: false, error: text || 'Forget device failed' });
      throw new Error(text || 'Forget device failed');
    }
    set({ isLoading: false });
  },

  logoutAllDevices: async (authToken) => {
    set({ isLoading: true, error: null });
    const res = await apiRequest('/api/desktop/devices/logout-all', authToken, {
      method: 'POST',
    });
    if (!res.ok) {
      const text = await res.text();
      set({ isLoading: false, error: text || 'Logout all devices failed' });
      throw new Error(text || 'Logout all devices failed');
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
