import { useEffect, useMemo, useState, Component, type ReactNode, type ErrorInfo } from 'react';
import { SignIn, SignUp, useAuth, useUser } from '@clerk/clerk-react';
import type { Appearance } from '@clerk/types';
import { useAuthStore } from '@/stores/authStore';
import { getMachineId } from '@/lib/crypto';
import { getDeviceLabel } from '@/lib/device';
import { loadEntitlementToken, storeEntitlementToken } from '@/lib/authToken';
import { getProStatus } from '@/lib/tauri';
import type { ModelStatus } from '@/lib/types';
import { invoke } from '@tauri-apps/api/core';
import ixosIcon from '@/assets/ixos-icon.png';
import { SectionDivider } from "@/components/ui/SectionDivider";

interface AuthGateProps {
  children: React.ReactNode;
}

// Error boundary to catch and handle errors gracefully
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AuthErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Auth error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-graphite-0 px-6">
          <div className="max-w-md w-full bg-graphite-1 border border-stroke-hairline rounded-2xl p-6 shadow-lift text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-porcelain mb-2">Something went wrong</h2>
            <p className="text-sm text-fg-muted mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onReset();
              }}
              className="px-4 py-2 rounded-md bg-accent-teal text-graphite-0 text-xs uppercase tracking-[0.2em] font-semibold"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}



// ... (imports remain the same)

// Ixos dark theme for Clerk components - customized sign-in (teal) and sign-up (magenta)
const signInAppearance: Appearance = {
  variables: {
    colorPrimary: '#14B8A6',
    colorBackground: '#131315',
    colorInputBackground: '#11151F',
    colorInputText: '#F3F5F7',
    colorText: '#F3F5F7',
    colorTextSecondary: '#C4CFD6',
    colorDanger: '#EF4444',
    borderRadius: '0.25rem',
    fontFamily: '"Geist Mono", ui-monospace, monospace', // Enforce Mono
  },
  elements: {
    rootBox: 'w-full',
    card: 'bg-transparent shadow-none border-none p-0',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    // Stronger visibility for social buttons
    socialButtonsBlockButton: '!bg-[#11151F] !border !border-white/20 hover:!bg-[#1A2131] hover:!border-accent-teal/45 !text-[#F3F5F7] !opacity-100 transition-all h-11 flex items-center justify-center shadow-none font-mono text-xs tracking-wide',
    socialButtonsBlockButtonText: '!text-[#F3F5F7] !font-semibold ml-2 font-mono',
    socialButtonsProviderIcon: 'opacity-100',
    socialButtonsBlockButtonArrow: 'hidden',
    dividerLine: 'bg-[#344054]',
    dividerText: 'text-[#A6B2C0] text-xs uppercase tracking-wider font-mono',
    formFieldLabel: 'text-[#C4CFD6] text-xs font-semibold mb-1.5 uppercase tracking-wide font-mono',
    formFieldInput: 'bg-[#11151F] border border-white/15 text-[#F3F5F7] placeholder:text-[#8FA0B3] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/35 rounded-md h-11 px-4 transition-all font-mono text-sm',
    formButtonPrimary: 'bg-accent-teal hover:bg-accent-teal/90 text-[#031016] font-semibold h-11 rounded-md transition-all uppercase tracking-widest text-xs shadow-glow-teal-sm font-mono',
    footerActionLink: 'text-[#14B8A6] hover:text-[#0D9488] font-medium transition-colors font-mono',
    identityPreviewText: 'text-[#E5E5E7] font-mono',
    identityPreviewEditButton: 'text-[#14B8A6] hover:text-[#0D9488] transition-colors font-mono',
    formFieldAction: 'text-[#14B8A6] hover:text-[#0D9488] text-xs transition-colors font-mono',
    alertText: 'text-[#A1A1A6] font-mono',
    footer: 'hidden',
    formFieldInputShowPasswordButton: 'text-[#8FA0B3] hover:text-[#F3F5F7] transition-colors',
    // OTP / Verification code styling - centered with separate digit boxes
    otpCodeFieldInputs: 'flex justify-center gap-2',
    otpCodeFieldInput: 'w-12 h-14 text-center text-2xl font-mono font-bold bg-[#11151F] border-2 border-white/15 text-[#F3F5F7] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/35 rounded-lg transition-all caret-[#14B8A6]',
    otpCodeField: 'flex flex-col items-center gap-4',
    // Center the verification view
    formFieldRow: 'flex justify-center',
    form: 'flex flex-col items-center',
    verificationLinkStatusBox: 'text-center mx-auto font-mono',
  },
};

const signUpAppearance: Appearance = {
  ...signInAppearance,
  variables: {
    ...signInAppearance.variables,
    colorPrimary: '#F472B6',
  },
  elements: {
    ...signInAppearance.elements,
    formFieldInput: 'bg-[#11151F] border border-white/15 text-[#F3F5F7] placeholder:text-[#8FA0B3] focus:border-accent-magenta focus:ring-2 focus:ring-accent-magenta/35 rounded-md h-11 px-4 transition-all font-mono text-sm',
    formButtonPrimary: 'bg-accent-magenta hover:bg-accent-magenta/90 text-[#031016] font-semibold h-11 rounded-md transition-all uppercase tracking-widest text-xs shadow-glow-magenta-sm font-mono',
    footerActionLink: 'text-accent-magenta hover:text-accent-magenta/80 font-medium transition-colors font-mono',
    identityPreviewEditButton: 'text-accent-magenta hover:text-accent-magenta/80 transition-colors font-mono',
    formFieldAction: 'text-accent-magenta hover:text-accent-magenta/80 text-xs transition-colors font-mono',
    otpCodeFieldInput: 'w-12 h-14 text-center text-2xl font-mono font-bold bg-[#11151F] border-2 border-white/15 text-[#F3F5F7] focus:border-accent-magenta focus:ring-2 focus:ring-accent-magenta/35 rounded-lg transition-all',
  },
};

function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  return (
    <div className="min-h-screen bg-graphite-0 flex flex-col items-center justify-center px-6">

      {/* Section Divider */}
      <div className="w-full max-w-2xl mb-4">
        <SectionDivider label="ACCOUNT_ACCESS" accent="amber" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1A1A1E] to-[#0A0A0B] border border-white/10 p-[1px] shadow-2xl relative group">
            <div className="absolute inset-0 bg-accent-amber/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl duration-500 blur-xl" />
            <div className="w-full h-full rounded-[11px] bg-[#0A0A0B] flex items-center justify-center relative overflow-hidden">
              <img src={ixosIcon} alt="Ixos" className="w-8 h-8 object-contain opacity-90" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-porcelain mb-3 font-mono tracking-tight">
            {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-fg-muted font-mono">
            {mode === 'sign-in'
              ? 'Sign in to access Ixos'
              : 'Get started with local-first semantic search'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="bg-graphite-1 rounded-md p-1 flex mb-8 border border-white/5">
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className={`flex-1 py-3 rounded-sm text-xs uppercase tracking-[0.15em] font-bold transition-all font-mono flex items-center justify-center ${mode === 'sign-in'
              ? 'bg-[#1A1A1E] text-accent-teal shadow-sm border border-white/5'
              : 'text-fg-muted hover:text-porcelain hover:bg-white/5'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('sign-up')}
            className={`flex-1 py-3 rounded-sm text-xs uppercase tracking-[0.15em] font-bold transition-all font-mono flex items-center justify-center ${mode === 'sign-up'
              ? 'bg-[#1A1A1E] text-accent-magenta shadow-sm border border-white/5'
              : 'text-fg-muted hover:text-porcelain hover:bg-white/5'
              }`}
          >
            Sign Up
          </button>
        </div>

        {/* Auth Form Container - Subtle/No Border */}
        <div className="bg-[#0A0A0B] border border-white/5 rounded-sm p-8 shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-sm" />
          <div className="relative z-10">
            {mode === 'sign-in' ? (
              <SignIn routing="virtual" appearance={signInAppearance} />
            ) : (
              <SignUp routing="virtual" appearance={signUpAppearance} />
            )}
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-fg-dim">
            Your files stay on your device. We never see your data.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-graphite-0">
      <div className="flex flex-col items-center gap-6">
        {/* Logo with pulse */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-amber to-accent-amber/60 p-[2px] shadow-glow-amber animate-pulse">
          <div className="w-full h-full rounded-[14px] bg-graphite-1 flex items-center justify-center">
            <img src={ixosIcon} alt="Ixos" className="w-9 h-9" />
          </div>
        </div>

        {/* Shimmer Text Animation */}
        <div className="relative overflow-hidden">
          <div
            className="text-xs uppercase tracking-[0.2em] font-bold bg-clip-text text-transparent animate-shimmer-slow bg-[length:200%_100%]"
            style={{
              WebkitBackgroundClip: 'text',
              backgroundImage: `linear-gradient(90deg, rgba(243,245,247,0.8) 0%, rgba(243,245,247,0.8) 20%, #F6B94C 45%, #F6B94C 55%, rgba(243,245,247,0.8) 80%, rgba(243,245,247,0.8) 100%)`
            }}
          >
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}

function TransferScreen({
  onRequest,
  onSignOut,
  onConfirm,
}: {
  onRequest: () => Promise<void>;
  onSignOut: () => void;
  onConfirm: (code: string) => Promise<void>;
}) {
  const { deviceLabel } = useAuthStore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [code, setCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (requested && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((c) => c - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [requested, cooldown]);

  const handleRequest = async () => {
    if (cooldown > 0) return;
    setIsRequesting(true);
    setError(null);
    try {
      await onRequest();
      setRequested(true);
      setCooldown(60); // 1 minute cooldown
    } catch (error) {
      console.error('Transfer request failed:', error);
      setError(typeof error === 'string' ? error : 'Transfer request failed');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleConfirm = async () => {
    // Normalize code: Remove non-alphanumeric characters, then format as XXXX-XXXX if length is 8
    const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    let finalCode = cleanCode;
    // Auto-format to XXXX-XXXX if we have exactly 8 characters
    if (cleanCode.length === 8) {
      finalCode = `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;
    }

    if (!finalCode) return;

    setIsConfirming(true);
    setConfirmError(null);
    try {
      await onConfirm(finalCode);
      setConfirmed(true);
    } catch (error) {
      console.error('Transfer confirmation failed:', error);
      setConfirmError(typeof error === 'string' ? error : 'Invalid or expired code');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-graphite-0 px-6">
      <div className="max-w-md w-full bg-graphite-1 border border-stroke-hairline rounded-2xl p-6 shadow-lift">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-magenta/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-accent-magenta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-porcelain mb-3 text-center">Device transfer required</h2>
        <p className="text-sm text-fg-muted mb-6 text-center">
          Your Pro license is active on another device. Request a transfer to use Pro on
          this device ({deviceLabel ?? 'current device'}).
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {confirmError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
            <p className="text-xs text-red-400">{confirmError}</p>
          </div>
        )}

        {confirmed && (
          <div className="mb-4 p-3 bg-accent-teal/10 border border-accent-teal/20 rounded-lg text-center">
            <p className="text-xs text-accent-teal">Transfer approved. Pro is active on this device.</p>
          </div>
        )}

        {requested ? (
          <div className="space-y-4">
            <div className="p-4 bg-accent-teal/10 border border-accent-teal/20 rounded-lg text-center">
              <p className="text-sm text-accent-teal font-medium">Code sent to your email</p>
              <p className="text-xs text-fg-muted mt-1">
                Enter the one-time code below to activate instantly.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRequest}
              disabled={cooldown > 0 || isRequesting}
              className="w-full py-2 rounded-lg bg-transparent border border-gray-600 text-gray-400 text-xs font-semibold disabled:opacity-50 hover:border-gray-500 hover:text-gray-300 transition-colors"
            >
              {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend Email'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRequest}
            disabled={isRequesting}
            className="w-full py-3 rounded-lg bg-accent-magenta text-graphite-0 text-xs uppercase tracking-[0.2em] font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            {isRequesting ? 'Sending...' : 'Email me a code'}
          </button>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-fg-muted">Approval code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              className="w-full px-3 py-2 rounded-lg bg-graphite-2 border border-white/10 text-porcelain text-sm tracking-[0.2em] font-mono focus:outline-none focus:border-accent-magenta/60"
            />
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!code.trim() || isConfirming}
              className="w-full py-2 rounded-lg bg-graphite-2 border border-white/10 text-xs uppercase tracking-[0.2em] font-semibold hover:border-accent-magenta/40 hover:text-white disabled:opacity-50"
            >
              {isConfirming ? 'Verifying...' : 'Activate now'}
            </button>
          </div>

          <button
            onClick={onSignOut}
            className="w-full py-2 text-sm text-accent-magenta hover:text-accent-magenta/80"
            type="button"
          >
            Sign out / Use different account
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthGateInner({ children }: AuthGateProps) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  const {
    setUser,
    setDevice,
    registerDevice,
    claimLease,
    refreshLease,
    fetchEntitlement,
    confirmTransfer,
    requestTransfer,
    setEntitlementToken,
    entitlementToken,
    setProStatus,
    transferRequired,
    transferToken,
  } = useAuthStore();

  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [showModelWarning, setShowModelWarning] = useState(false);

  useEffect(() => {
    async function check() {
      if (!bootstrapped) return;
      try {
        const title = await invoke<string | undefined>('get_current_window_label').catch(() => 'main');
        if (title !== 'overlay') { // Only check in main window, rough check
          const status = await invoke<ModelStatus>('get_model_status');
          if (!status.anyAvailable) {
            setShowModelWarning(true);
          }
        }
      } catch (err) {
        // command might not exist or fail
      }
    }
    check();
  }, [bootstrapped]);

  const userEmail = useMemo(() => {
    if (!user) return null;
    return (
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      user.username ||
      user.id ||
      null
    );
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!isLoaded || !isSignedIn || !user?.id) return;

      try {
        const deviceId = await getMachineId();
        const deviceLabel = await getDeviceLabel();
        const devicePublicKey = await invoke<string>('get_device_public_key').catch(() => null);
        setDevice(deviceId, deviceLabel);
        setUser({ id: user.id, email: userEmail ?? user.id });

        console.log('[Auth] Bootstrap started for user:', user.id);
        console.log('[Auth] Device ID:', deviceId);

        // Load cached token first
        try {
          const cachedToken = await loadEntitlementToken();
          if (cachedToken) {
            console.log('[Auth] Loaded cached entitlement token');
            setEntitlementToken(cachedToken);
            try {
              await invoke('set_entitlement_token', { token: cachedToken });
              console.log('[Auth] Cached token set in Rust backend');
            } catch (err) {
              console.warn('[Auth] Failed to set cached token in backend:', err);
            }
          } else {
            console.log('[Auth] No cached entitlement token found');
          }
        } catch (err) {
          console.warn('[Auth] Error loading cached token:', err);
        }

        const clerkToken = await getToken();
        if (!clerkToken) {
          console.log('[Auth] No Clerk token available');
          if (!cancelled) setBootstrapped(true);
          return;
        }
        console.log('[Auth] Got Clerk token');

        // Register device - this is critical for lease/entitlement to work
        try {
          console.log('[Auth] Registering device...');
          await registerDevice(clerkToken, deviceId, deviceLabel, devicePublicKey);
          console.log('[Auth] Device registered successfully');
        } catch (err) {
          console.error('[Auth] Device registration failed:', err);
          // Continue anyway - entitlement endpoint might still work
        }

        // Try to claim lease first
        let gotToken = false;
        try {
          console.log('[Auth] Attempting to claim lease...');
          const claimResult = await claimLease(clerkToken, deviceId, devicePublicKey);
          console.log('[Auth] Lease claim response:', claimResult);
          if (claimResult?.token) {
            console.log('[Auth] Lease claimed successfully');
            setEntitlementToken(claimResult.token);
            await storeEntitlementToken(claimResult.token).catch((e) => console.warn('[Auth] Failed to store token:', e));
            try {
              await invoke('set_entitlement_token', { token: claimResult.token });
              console.log('[Auth] Fresh token set in Rust backend');
              gotToken = true;
            } catch (err) {
              console.warn('[Auth] Failed to set fresh token in backend:', err);
            }
          } else {
            console.log('[Auth] Lease claim returned no token');
            // Check if transfer is required (409 conflict)
            // If so, don't fetch entitlement - let the TransferScreen handle it
            const { transferRequired: needsTransfer } = useAuthStore.getState();
            if (needsTransfer) {
              console.log('[Auth] Transfer required, skipping entitlement fetch');
            }
          }
        } catch (err) {
          console.warn('[Auth] Lease claim failed:', err);
        }

        // If lease claim didn't get a token, try entitlement endpoint as fallback
        if (!gotToken) {
          const { transferRequired: needsTransfer } = useAuthStore.getState();
          if (!needsTransfer) {
            console.log('[Auth] Trying entitlement fetch as fallback...');
            try {
              const entitlementResult = await fetchEntitlement(clerkToken, deviceId);
              console.log('[Auth] Entitlement response:', entitlementResult);
              if (entitlementResult?.token) {
                console.log('[Auth] Got token from entitlement endpoint');
                setEntitlementToken(entitlementResult.token);
                await storeEntitlementToken(entitlementResult.token).catch((e) => console.warn('[Auth] Failed to store token:', e));
                try {
                  await invoke('set_entitlement_token', { token: entitlementResult.token });
                  console.log('[Auth] Entitlement token set in Rust backend');
                } catch (e) {
                  console.warn('[Auth] Failed to set entitlement token in backend:', e);
                }
              } else {
                console.warn('[Auth] Entitlement endpoint returned no token');
              }
            } catch (err) {
              console.error('[Auth] Entitlement fetch failed:', err);
            }
          }
        }
      } catch (error) {
        console.error('Auth bootstrap error:', error);
        setBootError(error instanceof Error ? error.message : 'Bootstrap failed');
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    }

    if (isSignedIn) {
      setBootError(null);
      bootstrap();
    } else {
      setBootstrapped(false);
      setBootError(null);
      setEntitlementToken(null);
      invoke('clear_entitlement_token').catch(() => { });
    }

    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isSignedIn,
    user?.id,
    userEmail,
    getToken,
    setDevice,
    setUser,
    registerDevice,
    claimLease,
    refreshLease,
    fetchEntitlement,
    setEntitlementToken,
  ]);

  useEffect(() => {
    if (!isSignedIn || !bootstrapped) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      const deviceId = useAuthStore.getState().deviceId;
      const transferNeeded = useAuthStore.getState().transferRequired;
      if (transferNeeded) return;
      if (!deviceId) return;
      const token = await getToken();
      if (!token) return;
      try {
        const devicePublicKey = await invoke<string>('get_device_public_key').catch(() => null);
        const refreshResult = await refreshLease(token, deviceId, devicePublicKey);
        if (refreshResult?.token) {
          setEntitlementToken(refreshResult.token);
          await storeEntitlementToken(refreshResult.token).catch(() => { });
          try {
            await invoke('set_entitlement_token', { token: refreshResult.token });
          } catch {
            // Ignore
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg === 'SESSION_EXPIRED') {
          console.log('Session expired - user needs to re-authenticate');
          // The error is already set in authStore by refreshLease
          // Clerk will handle token refresh automatically on next action
        } else {
          console.warn('Entitlement refresh failed (non-fatal):', error);
        }
      }
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isSignedIn, bootstrapped, getToken, refreshLease, setEntitlementToken]);

  // Listen for window focus to check if verification completed (e.g. email link clicked)
  useEffect(() => {
    const handleFocus = async () => {
      console.log('[Auth] Window focused - checking session...');
      if (user) {
        try {
          await user.reload();
          console.log('[Auth] User session reloaded');
        } catch (e) {
          console.warn('[Auth] Failed to reload user session:', e);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const refreshStatus = async () => {
      try {
        const status = await getProStatus();
        if (!cancelled) {
          setProStatus(status);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to refresh Pro status:', err);
        }
      }
    };

    refreshStatus();
    const interval = setInterval(refreshStatus, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [entitlementToken, setProStatus]);

  if (!isLoaded) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!isSignedIn) {
    return <AuthScreen />;
  }

  if (!bootstrapped) {
    return <LoadingScreen message="Initializing..." />;
  }

  // Show error state but still allow app to load
  if (bootError) {
    console.warn('Auth bootstrap had errors but continuing:', bootError);
  }

  if (transferRequired) {
    return (
      <TransferScreen
        onRequest={async () => {
          const token = await getToken();
          if (!token) return;
          const { deviceId } = useAuthStore.getState();
          if (!deviceId) return;
          await requestTransfer(token, deviceId, transferToken ?? undefined);
        }}
        onConfirm={async (code) => {
          const token = await getToken();
          if (!token) return;
          const { deviceId } = useAuthStore.getState();
          if (!deviceId) return;
          const result = await confirmTransfer(token, deviceId, code);
          if (result?.token) {
            setEntitlementToken(result.token);
            await storeEntitlementToken(result.token).catch(() => { });
            try {
              await invoke('set_entitlement_token', { token: result.token });
            } catch {
              // Ignore
            }
          }
        }}
        onSignOut={() => {
          signOut().catch(() => { });
          setEntitlementToken(null);
          useAuthStore.setState({
            transferRequired: false,
            transferToken: null,
            activeDeviceId: null,
          });
          invoke('clear_entitlement_token').catch(() => { });
        }}
      />
    );
  }

  // Check for models after successful bootstrap


  return (
    <>
      {children}
      {showModelWarning && <ModelWarningPopup onDismiss={() => setShowModelWarning(false)} />}
    </>
  );
}

function ModelWarningPopup({ onDismiss }: { onDismiss: () => void }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      // Default to recommended model
      await invoke('download_model', { modelType: 'ixos-flash-v2', hfToken: localStorage.getItem('ix_hf_token') || null });
      // Notify success/refresh (page reload or just dismiss effectively)
      onDismiss();
      // Optional: force reload state? The app checks status periodically or we can rely on reload
      window.location.reload();
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadError(typeof err === 'string' ? err : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-graphite-1 border border-stroke-hairline rounded-2xl p-6 max-w-md mx-4 shadow-lift">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent-amber/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-porcelain">No Embedding Models Found</h2>
        </div>

        <p className="text-fg-muted mb-4">
          Semantic search requires embedding models. Without them, search will use basic text matching only.
        </p>

        {downloadError && (
          <div className="mb-4 p-2 bg-error/10 border border-error/20 rounded text-xs text-error">
            {downloadError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 px-4 py-2 bg-accent-teal hover:bg-accent-teal/90 text-graphite-0 rounded-md transition-colors uppercase tracking-[0.14em] text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>Downloading...</>
            ) : (
              <>Download Model</>
            )}
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-graphite-2 hover:bg-graphite-3 text-porcelain rounded-md transition-colors uppercase tracking-[0.14em] text-xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ children }: AuthGateProps) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <AuthErrorBoundary onReset={() => setResetKey(k => k + 1)} key={resetKey}>
      <AuthGateInner>{children}</AuthGateInner>
    </AuthErrorBoundary>
  );
}
