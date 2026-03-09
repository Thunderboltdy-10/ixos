"use client";

import { SignUp } from "@clerk/nextjs";

function AuthLayout({ variant, children, themeClass }: any) {
  return (
    <div className={`min-h-screen flex items-center justify-center py-24 px-6 relative overflow-hidden ${themeClass}`}>
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center text-current opacity-80 uppercase tracking-widest text-xs font-bold">
          {variant === "1" && "System Registration"}
          {variant === "2" && "Node Initialization"}
          {variant === "3" && "['>> CREATE_OPERATOR']"}
          {variant === "4" && "Access Portal"}
          {variant === "5" && "REGISTER"}
        </div>
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

  return (
    <AuthLayout variant={variant} themeClass={getThemeClass()}>
      <SignUp 
        routing="hash" 
        fallbackRedirectUrl={`/${variant}/account`} 
        signInUrl={`/${variant}/signin`}
        appearance={{
          elements: {
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
          },
        }}
      />
    </AuthLayout>
  );
}
