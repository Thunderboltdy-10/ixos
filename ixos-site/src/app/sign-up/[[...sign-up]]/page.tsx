'use client'

import { SignUp } from "@clerk/nextjs";

const amberAppearance = {
  variables: {
    colorPrimary: '#F6B94C',
    colorBackground: 'transparent',
    colorInputBackground: '#111417',
    colorInputText: '#F3F5F7',
    colorText: '#F3F5F7',
    colorTextSecondary: '#9BA8B5',
    colorDanger: '#EF4444',
    borderRadius: '0px',
    fontFamily: 'var(--font-ixo-mono), monospace',
    fontSize: '0.875rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    card: 'bg-transparent shadow-none border-none p-0 w-full',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton: '!bg-[#111417] !border !border-white/15 hover:!border-amber-400/35 !text-[#F3F5F7] !opacity-100 transition-all !h-11 flex items-center justify-center !rounded-none !text-sm',
    socialButtonsBlockButtonText: '!text-[#F3F5F7] !font-medium ml-2',
    socialButtonsProviderIcon: 'opacity-100',
    socialButtonsBlockButtonArrow: 'hidden',
    dividerLine: 'bg-white/10',
    dividerText: 'text-white/40 text-xs uppercase tracking-wider font-mono',
    formFieldLabel: 'text-white/50 text-[9px] font-mono mb-1.5 uppercase tracking-[0.22em]',
    formFieldInput: '!bg-[#111417] !border !border-white/15 !text-[#F3F5F7] placeholder:!text-white/25 focus:!border-amber-400/60 !rounded-none !h-11 !px-4 transition-all !font-mono !text-sm',
    formButtonPrimary: '!bg-amber-400 hover:!bg-amber-300 !text-[#0A0D0F] !font-mono !font-bold !h-11 !rounded-none transition-all !text-sm !tracking-[0.12em] !uppercase',
    footerActionLink: '!text-amber-400 hover:!text-amber-300 font-mono transition-colors',
    identityPreviewText: 'text-white font-mono',
    identityPreviewEditButton: '!text-amber-400 hover:!text-amber-300 transition-colors',
    formFieldAction: '!text-amber-400 hover:!text-amber-300 text-xs transition-colors font-mono',
    alertText: 'text-white/60 font-mono',
    footer: 'hidden',
    formFieldInputShowPasswordButton: 'text-white/40 hover:text-white/70 transition-colors',
    otpCodeFieldInputs: 'flex justify-center gap-2',
    otpCodeFieldInput: 'w-12 h-14 text-center text-2xl font-bold bg-[#111417] border-2 border-white/16 text-[#F3F5F7] focus:border-amber-400/60 rounded-none transition-all',
    form: 'flex flex-col gap-4',
    main: 'w-full flex flex-col items-center',
  },
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-16" style={{ paddingTop: 110 }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: '50vw', height: '40vh', background: 'radial-gradient(ellipse, rgba(246,185,76,0.03) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-[400px]">
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: 'rgba(246,185,76,0.3)' }} />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: 'rgba(246,185,76,0.3)' }} />
        <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: 'rgba(246,185,76,0.3)' }} />
        <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: 'rgba(246,185,76,0.3)' }} />

        <div style={{ border: '1px solid rgba(246,185,76,0.1)', background: 'rgba(10,13,15,0.85)', padding: '36px 32px' }}>
          <div className="mb-8">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-400/50 mb-3">▸ Create Account</div>
            <h1 className="font-mono text-3xl font-bold" style={{ letterSpacing: '-0.02em', color: '#F6B94C' }}>Join Ixos.</h1>
            <p className="font-mono text-xs text-white/30 mt-2.5 leading-relaxed">Start with local-first semantic search. Free forever.</p>
          </div>

          <SignUp
            appearance={amberAppearance}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/account"
          />

          <div className="mt-8 pt-6 border-t border-white/6">
            <p className="font-mono text-[9px] text-white/20 text-center tracking-[0.08em]">
              By signing up you agree to our{' '}
              <a href="/terms" className="text-amber-400/40 hover:text-amber-400/70 transition-colors">Terms of Service</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
