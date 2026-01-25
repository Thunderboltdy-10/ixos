import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

const clerkAppearance = {
  variables: {
    colorPrimary: "#F472B6",
    colorBackground: "#0A0A0B",
    colorInputBackground: "#131315",
    colorInputText: "#E5E5E7",
    colorText: "#A1A1A6",
    colorTextSecondary: "#6B6B70",
    colorDanger: "#EF4444",
    borderRadius: "0.5rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-none p-0",
    headerTitle: "text-[#E5E5E7] font-semibold",
    headerSubtitle: "text-[#A1A1A6]",
    socialButtonsBlockButton:
      "bg-[#131315] border-[#1F1F23] hover:bg-[#1A1A1E] text-[#A1A1A6]",
    socialButtonsBlockButtonText: "text-[#A1A1A6]",
    dividerLine: "bg-[#1F1F23]",
    dividerText: "text-[#6B6B70]",
    formFieldLabel: "text-[#A1A1A6] text-xs uppercase tracking-wider",
    formFieldInput:
      "bg-[#131315] border-[#1F1F23] text-[#E5E5E7] placeholder:text-[#6B6B70] focus:border-[#F472B6] focus:ring-[#F472B6]/20",
    formButtonPrimary:
      "bg-[#F472B6] hover:bg-[#F472B6]/90 text-[#0A0A0B] font-semibold",
    footerActionLink: "text-[#F472B6] hover:text-[#F472B6]/80",
    identityPreviewText: "text-[#E5E5E7]",
    identityPreviewEditButton: "text-[#F472B6]",
    formFieldAction: "text-[#F472B6]",
    alertText: "text-[#A1A1A6]",
  },
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Simple header */}
      <header className="p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="relative w-6 h-6">
            <Image
              src="/assets/icon.png"
              alt="Ixos"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-semibold text-lg text-porcelain">Ixos</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-porcelain mb-2">
              Create your account
            </h1>
            <p className="text-fg-muted">
              Get started with local-first semantic search
            </p>
          </div>

          <div className="bg-bg-graphite-1/70 border border-white/5 rounded-2xl p-8 backdrop-blur-sm">
            <SignUp
              appearance={clerkAppearance}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
            />
          </div>

          <p className="mt-6 text-center text-sm text-fg-dim">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-accent-teal hover:text-accent-teal/80 font-medium"
            >
              Sign in
            </Link>
          </p>

          <div className="mt-8 p-4 rounded-lg bg-accent-magenta/10 border border-accent-magenta/30">
            <p className="text-xs text-fg-muted text-center">
              <span className="text-accent-magenta font-semibold">Privacy first:</span>{" "}
              Your files never leave your device. We only store your account info.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
