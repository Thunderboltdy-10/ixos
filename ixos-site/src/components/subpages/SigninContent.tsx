"use client";

import { SignIn } from "@clerk/nextjs";

function AuthLayout({ variant, children, themeClass }: any) {
  return (
    <div className={`min-h-[80vh] flex items-center justify-center py-24 px-6 relative overflow-hidden ${themeClass}`}>
      {variant === "1" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F6B94C]/5 blur-[100px] pointer-events-none rounded-full" />
      )}
      {variant === "2" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#38BDF8]/5 blur-[100px] pointer-events-none rounded-full" />
      )}
      {variant === "3" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/5 blur-[120px] pointer-events-none rounded-full" />
      )}
      {variant === "4" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2563EB]/5 blur-[150px] pointer-events-none rounded-full" />
      )}
      {variant === "5" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] bg-cyan-500/10 blur-[180px] pointer-events-none rounded-full" />
      )}
      <div className="relative z-10 w-full max-w-md">
        {variant === "1" ? (
          <div className="mb-8 text-center text-[#F6B94C] uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2 drop-shadow-[0_0_8px_rgba(246,185,76,0.8)]">
            <span className="w-2 h-2 bg-[#F6B94C] animate-pulse shadow-[0_0_8px_rgba(246,185,76,1)]" /> NODE_AUTHENTICATION
          </div>
        ) : (
          <div className="mb-8 text-center text-current opacity-80 uppercase tracking-widest text-xs font-bold">
            {variant === "2" && "Signal Authorization"}
            {variant === "3" && "['>> ACCESS_DECRYPT']"}
            {variant === "4" && "Identity Portal"}
            {variant === "5" && "AUTHORIZE"}
          </div>
        )}
        <div className="flex justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SigninContent({ variant = "5" }: { variant?: string }) {
  const getThemeClass = () => {
    switch (variant) {
      case "1": return "bg-[#0A0F1D] text-[#F6B94C] font-mono";
      case "2": return "bg-[#080C14] text-[#38BDF8] font-sans";
      case "3": return "bg-[#0A0D0F] text-amber-400 font-mono";
      case "4": return "bg-white text-gray-900 font-sans";
      case "5": return "bg-[#0C0E10] text-cyan-400 font-mono";
      default: return "bg-[#0C0E10] text-cyan-400 font-mono";
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "1":
        return {
          card: "bg-[#0F172A] border border-[#F6B94C]/30 rounded-none shadow-[0_0_40px_rgba(246,185,76,0.1)]",
          headerTitle: "text-[#F6B94C] font-bold tracking-widest uppercase drop-shadow-[0_0_5px_rgba(246,185,76,0.5)]",
          headerSubtitle: "text-[#94A3B8] font-mono",
          formButtonPrimary: "bg-[#F6B94C] text-[#0F172A] hover:bg-[#FCD34D] font-bold tracking-widest uppercase rounded-none transition-all shadow-[0_0_15px_rgba(246,185,76,0.3)]",
          socialButtonsBlockButton: "border border-[#334155] bg-[#1E293B] text-[#94A3B8] hover:bg-[#F6B94C]/10 hover:text-[#F6B94C] hover:border-[#F6B94C]/50 rounded-none transition-all",
          formFieldLabel: "text-[#94A3B8] tracking-widest uppercase text-[10px]",
          formFieldInput: "bg-[#0F172A] border border-[#334155] text-[#E2E8F0] focus:border-[#F6B94C] focus:ring-0 rounded-none transition-colors",
          footerActionLink: "text-[#F6B94C] hover:text-[#FCD34D] hover:underline",
          dividerLine: "bg-[#334155]",
          dividerText: "text-[#64748B] font-mono text-[10px]",
          identityPreviewText: "text-[#E2E8F0]",
          identityPreviewEditButtonIcon: "text-[#F6B94C]",
        };
      case "2":
        return {
          card: "bg-[#0F172A]/80 border border-[#334155]/60 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden",
          headerTitle: "text-white font-extrabold tracking-tight",
          headerSubtitle: "text-[#94A3B8]",
          formButtonPrimary: "bg-[#38BDF8] text-[#080C14] hover:bg-[#7DD3FC] font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(56,189,248,0.2)]",
          socialButtonsBlockButton: "border border-[#334155]/60 bg-[#080C14] text-[#CBD5E1] hover:bg-[#38BDF8]/10 hover:border-[#38BDF8]/40 rounded-2xl transition-all",
          formFieldLabel: "text-[#94A3B8] font-semibold text-xs",
          formFieldInput: "bg-[#080C14] border border-[#334155]/60 text-[#F1F5F9] focus:border-[#38BDF8] focus:ring-0 rounded-2xl transition-all",
          footerActionLink: "text-[#38BDF8] hover:text-[#7DD3FC] font-semibold transition-colors",
          dividerLine: "bg-[#334155]/60",
          dividerText: "text-[#64748B] text-xs",
          identityPreviewText: "text-[#F1F5F9]",
          identityPreviewEditButtonIcon: "text-[#38BDF8]",
        };
      case "3":
        return {
          card: "bg-[#0D1117] border border-amber-400/20 rounded-none relative shadow-[0_0_50px_rgba(245,158,11,0.05)]",
          headerTitle: "text-white font-mono font-bold tracking-[0.2em] uppercase",
          headerSubtitle: "text-white/40 font-mono text-[10px] uppercase tracking-widest",
          formButtonPrimary: "bg-amber-400 text-[#0A0D0F] hover:bg-amber-300 font-mono font-bold tracking-[0.3em] rounded-none transition-all uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)]",
          socialButtonsBlockButton: "border border-amber-400/10 bg-[#0D1117] text-white/60 hover:bg-amber-400/5 hover:border-amber-400/50 hover:text-amber-400 font-mono rounded-none transition-all uppercase tracking-widest text-[10px]",
          formFieldLabel: "text-amber-400/50 font-mono text-[10px] uppercase tracking-[0.2em]",
          formFieldInput: "bg-[#0A0D0F] border border-amber-400/20 text-white focus:border-amber-400 focus:ring-0 rounded-none transition-colors font-mono shadow-inner",
          footerActionLink: "text-amber-400 hover:text-amber-300 font-mono hover:underline",
          dividerLine: "bg-amber-400/10",
          dividerText: "text-amber-400/20 font-mono text-[9px]",
          identityPreviewText: "text-white font-mono",
          identityPreviewEditButtonIcon: "text-amber-400",
        };
      case "4":
        return {
          card: "bg-white border border-gray-200 rounded-[2.5rem] shadow-2xl shadow-gray-200/50",
          headerTitle: "text-gray-900 font-black text-3xl tracking-tight",
          headerSubtitle: "text-gray-500 font-medium",
          formButtonPrimary: "bg-gray-900 text-white hover:bg-gray-800 font-bold rounded-2xl transition-all shadow-xl shadow-gray-900/10",
          socialButtonsBlockButton: "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-2xl transition-all font-bold text-sm",
          formFieldLabel: "text-gray-700 font-bold text-xs uppercase tracking-widest",
          formFieldInput: "bg-gray-50 border border-gray-200 text-gray-900 focus:border-blue-600 focus:ring-0 rounded-2xl transition-all",
          footerActionLink: "text-blue-600 hover:text-blue-700 font-bold transition-colors hover:underline",
          dividerLine: "bg-gray-200",
          dividerText: "text-gray-400 font-bold text-[10px]",
          identityPreviewText: "text-gray-900 font-bold",
          identityPreviewEditButtonIcon: "text-blue-600",
        };
      case "5":
        return {
          card: "bg-[#0E1114] border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(34,211,238,0.1)] backdrop-blur-3xl overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-cyan-500/[0.03] before:to-transparent before:pointer-events-none",
          headerTitle: "text-cyan-400 font-mono font-black text-3xl tracking-tighter uppercase drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]",
          headerSubtitle: "text-cyan-500/40 font-mono text-[10px] tracking-[0.3em] uppercase",
          formButtonPrimary: "bg-cyan-500 text-black hover:bg-cyan-400 font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-[0_0_30px_rgba(34,211,238,0.4)]",
          socialButtonsBlockButton: "border border-cyan-500/20 bg-[#0C0E10] text-cyan-500/60 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 font-mono rounded-2xl transition-all uppercase tracking-widest text-[10px]",
          formFieldLabel: "text-cyan-500/50 font-mono text-[10px] uppercase tracking-[0.3em]",
          formFieldInput: "bg-black/50 border border-cyan-500/20 text-white focus:border-cyan-400 focus:ring-0 rounded-2xl transition-all font-mono shadow-inner",
          footerActionLink: "text-cyan-400 hover:text-cyan-300 font-mono hover:underline",
          dividerLine: "bg-cyan-500/10",
          dividerText: "text-cyan-500/20 font-mono text-[9px]",
          identityPreviewText: "text-white font-mono",
          identityPreviewEditButtonIcon: "text-cyan-400",
        };
      default:
        return {};
    }
  };

  return (
    <AuthLayout variant={variant} themeClass={getThemeClass()}>
      <SignIn 
        routing="hash" 
        fallbackRedirectUrl={`/${variant}/account`} 
        signUpUrl={`/${variant}/signup`}
        appearance={{
          elements: getVariantStyles(),
        }}
      />
    </AuthLayout>
  );
}
