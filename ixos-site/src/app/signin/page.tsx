"use client";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { SignIn, SignUp } from "@clerk/nextjs";

const getAppearance = (color: string) => ({
  variables: { colorPrimary: color, colorBackground: 'transparent', colorText: '#ffffff' },
  elements: {
    card: 'bg-transparent shadow-none border-none p-0 w-full',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton: 'bg-white/5 border border-white/10 hover:bg-white/10 text-white',
    formFieldInput: 'bg-black/50 border border-white/10 text-white h-12',
    formButtonPrimary: `bg-${color} text-black font-semibold h-12 hover:opacity-90`,
    dividerLine: 'bg-white/10',
    dividerText: 'text-white/50 text-xs',
    formFieldLabel: 'text-white/70 text-xs',
    footerActionLink: `text-${color}`,
    identityPreviewText: 'text-white',
    identityPreviewEditButton: `text-${color}`,
  }
});

function AuthV1({ type }: { type: 'signin' | 'signup' }) {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans flex items-center justify-center p-8">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white/5 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-[50px] pointer-events-none" />
        <h2 className="text-3xl font-bold mb-2">{type === 'signin' ? 'Welcome back' : 'Create account'}</h2>
        <p className="text-white/50 mb-8">Access your workstreams securely.</p>
        <div className="min-h-[300px] w-full mt-6">
          {type === 'signin' ? (
            <SignIn routing="hash" appearance={getAppearance('#F59E0B')} />
          ) : (
            <SignUp routing="hash" appearance={getAppearance('#F59E0B')} />
          )}
        </div>
      </div>
    </div>
  );
}

function AuthV2({ type }: { type: 'signin' | 'signup' }) {
  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans flex items-center justify-center p-8">
      <div className="max-w-sm w-full">
        <h1 className="text-5xl font-semibold tracking-tighter mb-8 text-center">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-white/40">Ixos</span>
        </h1>
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
          <div className="min-h-[300px] w-full mt-6">
            {type === 'signin' ? (
              <SignIn routing="hash" appearance={getAppearance('#2DD4BF')} />
            ) : (
              <SignUp routing="hash" appearance={getAppearance('#2DD4BF')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthV3({ type }: { type: 'signin' | 'signup' }) {
  return (
    <div className="min-h-screen bg-[#0A0D0F] text-[#f3f5f7] font-mono flex items-center justify-center p-8">
      <div className="max-w-md w-full border border-amber-400/20 bg-black/50 p-10 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-400" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-400" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-400" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-400" />

        <div className="text-amber-400 text-xs uppercase tracking-[0.3em] mb-8">▸ SECURE_AUTH_LAYER</div>
        <h1 className="text-3xl font-bold mb-8 uppercase">{type === 'signin' ? 'Authenticate' : 'Register'}</h1>
        <div className="min-h-[300px] w-full">
          {type === 'signin' ? (
            <SignIn routing="hash" appearance={getAppearance('#FBBF24')} />
          ) : (
            <SignUp routing="hash" appearance={getAppearance('#FBBF24')} />
          )}
        </div>
      </div>
    </div>
  );
}

function AuthV4({ type }: { type: 'signin' | 'signup' }) {
  return (
    <div className="min-h-screen bg-[#04050A] text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-black/40 border border-white/10 rounded-3xl p-10 backdrop-blur-2xl shadow-[0_20px_80px_rgba(124,58,237,0.15)] text-center">
        <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="text-violet-400 w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold mb-8">{type === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
        <div className="min-h-[300px] w-full mt-6">
          {type === 'signin' ? (
            <SignIn routing="hash" appearance={getAppearance('#A78BFA')} />
          ) : (
            <SignUp routing="hash" appearance={getAppearance('#A78BFA')} />
          )}
        </div>
      </div>
    </div>
  );
}

function AuthV5({ type }: { type: 'signin' | 'signup' }) {
  return (
    <div className="min-h-screen bg-[#0C0E10] text-white font-mono flex items-center justify-center p-8">
      <div className="max-w-sm w-full p-8 border border-white/10 bg-white/[0.02]">
        <h2 className="text-xl font-bold mb-8">{type === 'signin' ? 'Login' : 'Register'}</h2>
        <div className="min-h-[300px] w-full mt-6">
          {type === 'signin' ? (
            <SignIn routing="hash" appearance={getAppearance('#ffffff')} />
          ) : (
            <SignUp routing="hash" appearance={getAppearance('#ffffff')} />
          )}
        </div>
      </div>
    </div>
  );
}

export { AuthV1, AuthV2, AuthV3, AuthV4, AuthV5 };

export default function AuthPage() {
  const [variant, setVariant] = useState<number>(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ixos_variant');
    if (stored) setVariant(Number(stored));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Derive type from path
  const type = typeof window !== 'undefined' && window.location.pathname.includes('signup') ? 'signup' : 'signin';

  switch (variant) {
    case 1: return <AuthV1 type={type} />;
    case 2: return <AuthV2 type={type} />;
    case 3: return <AuthV3 type={type} />;
    case 4: return <AuthV4 type={type} />;
    case 5: return <AuthV5 type={type} />;
    default: return <AuthV5 type={type} />;
  }
}
