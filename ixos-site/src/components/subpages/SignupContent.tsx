"use client";

import { SignUp } from "@clerk/nextjs";

function AuthLayout({ variant, children, themeClass }: any) {
  return (
    <div className={`min-h-[80vh] flex items-center justify-center py-24 px-6 relative overflow-hidden ${themeClass}`}>
      {variant === "1" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F6B94C]/10 blur-[100px] pointer-events-none rounded-full" />
      )}
      {variant === "3" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/5 blur-[120px] pointer-events-none rounded-full" />
      )}
      {variant === "4" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2DD4BF]/5 blur-[150px] pointer-events-none rounded-full" />
      )}
      {variant === "5" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] bg-cyan-500/10 blur-[180px] pointer-events-none rounded-full" />
      )}
      <div className="relative z-10 w-full max-w-md">
        {variant === "1" ? (
          <div className="mb-8 text-center text-[#F6B94C] uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2 drop-shadow-[0_0_8px_rgba(246,185,76,0.8)]">
            <span className="w-2 h-2 bg-[#F6B94C] animate-pulse shadow-[0_0_8px_rgba(246,185,76,1)]" /> SYSTEM_REGISTRATION
          </div>
        ) : (
          <div className="mb-8 text-center text-current opacity-80 uppercase tracking-widest text-xs font-bold">
            {variant === "2" && "Node Initialization"}
            {variant === "3" && "['>> CREATE_OPERATOR']"}
            {variant === "4" && "Access Portal"}
            {variant === "5" && "REGISTER"}
          </div>
        )}
        <div className="flex justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SignupContent({ variant = "5" }: { variant?: string }) {
  const getThemeClass = () => {
    switch (variant) {
      case "1": return "text-[#F6B94C] font-mono";
      case "2": return "text-[#38BDF8] font-sans";
      case "3": return "text-[#14B8A6] font-mono";
      case "4": return "text-[#2DD4BF] font-sans";
      case "5": return "text-[#2DD4BF] font-mono";
      default: return "text-[#2DD4BF] font-mono";
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "1":
        return {
          card: "bg-[#0F172A]/90 border border-[#F6B94C]/40 backdrop-blur-xl rounded-none shadow-[0_0_30px_rgba(246,185,76,0.15)] relative before:absolute before:inset-0 before:border before:border-[#F6B94C]/10 before:pointer-events-none",
          headerTitle: "text-[#F6B94C] font-bold tracking-widest uppercase drop-shadow-[0_0_5px_rgba(246,185,76,0.5)]",
          headerSubtitle: "text-[#94A3B8]",
          formButtonPrimary: "bg-[#F6B94C] text-[#0F172A] hover:bg-[#FCD34D] font-bold tracking-widest uppercase rounded-none transition-all shadow-[0_0_15px_rgba(246,185,76,0.3)] hover:shadow-[0_0_20px_rgba(246,185,76,0.5)]",
          socialButtonsBlockButton: "border border-[#334155] bg-[#1E293B] text-[#94A3B8] hover:bg-[#F6B94C]/10 hover:text-[#F6B94C] hover:border-[#F6B94C]/50 rounded-none transition-all",
          formFieldLabel: "text-[#94A3B8] tracking-wider uppercase text-[10px]",
          formFieldInput: "bg-[#0F172A] border border-[#334155] text-[#E2E8F0] focus:border-[#F6B94C] focus:ring-1 focus:ring-[#F6B94C] rounded-none transition-colors",
          footerActionLink: "text-[#F6B94C] hover:text-[#FCD34D] hover:underline",
          dividerLine: "bg-[#334155]",
          dividerText: "text-[#64748B]",
          identityPreviewText: "text-[#E2E8F0]",
          identityPreviewEditButtonIcon: "text-[#F6B94C]",
        };
      case "2":
        return {
          card: "bg-[#080C14]/90 border border-[#38BDF8]/30 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(56,189,248,0.1)] relative overflow-hidden",
          headerTitle: "text-[#E2E8F0] font-extrabold tracking-tight",
          headerSubtitle: "text-[#94A3B8]",
          formButtonPrimary: "bg-[#38BDF8] text-[#080C14] hover:bg-[#7DD3FC] font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(56,189,248,0.2)]",
          socialButtonsBlockButton: "border border-[#334155]/60 bg-[#0F172A] text-[#CBD5E1] hover:bg-[#38BDF8]/10 hover:border-[#38BDF8]/40 rounded-xl transition-all",
          formFieldLabel: "text-[#94A3B8] font-medium text-xs",
          formFieldInput: "bg-[#0F172A] border border-[#334155]/60 text-[#F1F5F9] focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] rounded-xl transition-all",
          footerActionLink: "text-[#38BDF8] hover:text-[#7DD3FC] font-medium transition-colors",
          dividerLine: "bg-[#334155]/60",
          dividerText: "text-[#64748B]",
          identityPreviewText: "text-[#F1F5F9]",
          identityPreviewEditButtonIcon: "text-[#38BDF8]",
        };
      case "3":
        return {
          card: "bg-[#0A0D0F]/95 border border-amber-400/20 backdrop-blur-xl rounded-none relative shadow-[0_0_40px_rgba(246,185,76,0.05)]",
          headerTitle: "text-white font-mono font-bold tracking-widest",
          headerSubtitle: "text-white/50 font-mono",
          formButtonPrimary: "bg-amber-400 text-[#0A0D0F] hover:bg-amber-300 font-mono font-bold tracking-[0.2em] rounded-none transition-all uppercase shadow-[0_0_15px_rgba(246,185,76,0.2)]",
          socialButtonsBlockButton: "border border-amber-400/10 bg-[#0A0D0F] text-white/70 hover:bg-amber-400/5 hover:border-amber-400/50 hover:text-amber-400 font-mono rounded-none transition-all",
          formFieldLabel: "text-amber-400/70 font-mono text-[10px] uppercase tracking-widest",
          formFieldInput: "bg-[#0A0D0F] border border-amber-400/20 text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-none transition-colors font-mono",
          footerActionLink: "text-amber-400 hover:text-amber-300 font-mono hover:underline",
          dividerLine: "bg-amber-400/10",
          dividerText: "text-amber-400/40 font-mono",
          identityPreviewText: "text-white font-mono",
          identityPreviewEditButtonIcon: "text-amber-400",
        };
      case "4":
        return {
          card: "bg-black/60 !bg-black/80 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative",
          headerTitle: "text-white font-light text-3xl tracking-tight",
          headerSubtitle: "text-white/50 font-light",
          formButtonPrimary: "bg-[#2DD4BF] text-[#080A0C] hover:bg-[#5EEAD4] font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(45,212,191,0.2)]",
          socialButtonsBlockButton: "border border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl transition-all",
          formFieldLabel: "text-white/70 font-medium text-xs",
          formFieldInput: "bg-black/20 border border-white/10 text-[#F1F5F9] focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF] rounded-xl transition-all shadow-inner",
          footerActionLink: "text-[#2DD4BF] hover:text-[#5EEAD4] font-medium transition-colors hover:underline",
          dividerLine: "bg-white/10",
          dividerText: "text-white/40",
          identityPreviewText: "text-[#F1F5F9]",
          identityPreviewEditButtonIcon: "text-[#2DD4BF]",
        };
      case "5":
        return {
          card: "bg-[#0C0E10]/95 !bg-[#0C0E10]/95 border border-cyan-500/30 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(34,211,238,0.15)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-cyan-500/[0.03] before:to-transparent before:pointer-events-none",
          headerTitle: "text-cyan-400 font-mono font-bold text-3xl tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]",
          headerSubtitle: "text-cyan-500/60 font-mono text-xs tracking-widest",
          formButtonPrimary: "bg-cyan-500 text-black hover:bg-cyan-400 font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]",
          socialButtonsBlockButton: "border border-cyan-500/20 bg-[#0C0E10] text-cyan-500/80 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 font-mono rounded-xl transition-all",
          formFieldLabel: "text-cyan-500/70 font-mono text-[10px] uppercase tracking-widest",
          formFieldInput: "bg-black/50 border border-cyan-500/20 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl transition-all font-mono shadow-inner",
          footerActionLink: "text-cyan-400 hover:text-cyan-300 font-mono hover:underline",
          dividerLine: "bg-cyan-500/20",
          dividerText: "text-cyan-500/40 font-mono",
          identityPreviewText: "text-white font-mono",
          identityPreviewEditButtonIcon: "text-cyan-400",
        };
      default:
        return {
          card: "bg-black/40 border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl",
          headerTitle: "text-white font-bold",
          headerSubtitle: "text-white/50",
          formButtonPrimary: "bg-current text-black hover:bg-white/80 transition-colors",
          socialButtonsBlockButton: "border border-white/10 bg-white/5 text-white hover:bg-white/10",
          formFieldLabel: "text-white/70",
          formFieldInput: "bg-black/50 border border-white/20 text-white",
          footerActionLink: "text-current hover:text-white",
          dividerLine: "bg-white/10",
          dividerText: "text-white/40",
          identityPreviewText: "text-white",
          identityPreviewEditButtonIcon: "text-current",
        };
    }
  };

  return (
    <AuthLayout variant={variant} themeClass={getThemeClass()}>
      <SignUp 
        routing="hash" 
        fallbackRedirectUrl={`/${variant}/account`} 
        signInUrl={`/${variant}/signin`}
        appearance={{
          elements: getVariantStyles(),
        }}
      />
    </AuthLayout>
  );
}
