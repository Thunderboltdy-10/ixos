"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/sections/Footer";
import { FadeInView } from "@/components/effects/FadeInView";
import { cn } from "@/lib/utils";
import { getDownloadUrl } from "@/lib/downloads";
import { PageGlow } from "@/components/effects/PageGlow";

type Platform = "windows" | "macos";

interface PlatformInfo {
  id: Platform;
  name: string;
  icon: React.ReactNode;
  version: string;
  size: string;
  available: boolean;
  requirements: string[];
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: "windows",
    name: "Windows",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
    version: "v1.0.0",
    size: "~45 MB",
    available: true,
    requirements: [
      "Windows 10 or later (x64)",
      "4 GB RAM minimum",
      "100 MB disk space",
      "No admin rights required",
    ],
  },
  {
    id: "macos",
    name: "macOS",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    version: "Coming Soon",
    size: "-",
    available: false,
    requirements: [
      "macOS 12 Monterey or later",
      "Apple Silicon or Intel",
      "4 GB RAM minimum",
    ],
  },
];

export default function DownloadPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("windows");
  const downloadUrl = getDownloadUrl("windows") ?? "/download";

  const handleDownload = () => {
    window.location.href = downloadUrl;
  };

  return (
    <>
      <PageGlow color="amber" />
      <main className="relative z-10 flex flex-col min-h-screen w-full overflow-x-hidden bg-transparent">
        <Nav />

        {/* Hero Section */}
        <section className="pt-32 pb-8">
          <SectionDivider accent="amber" label="DOWNLOAD_MODULE" />

          <div className="container mx-auto px-6 py-16">
            <div className="text-center max-w-3xl mx-auto">
              <FadeInView direction="up">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold mb-6 tracking-tight">
                  Download <span className="heading-gradient-amber">Ixos</span>
                </h1>
              </FadeInView>

              <FadeInView direction="up" delay={100}>
                <p className="text-lg text-fg-muted mb-8 max-w-xl mx-auto">
                  Get started with local-first semantic search. Your files stay on your device,
                  always private, always fast.
                </p>
              </FadeInView>
            </div>
          </div>
        </section>

        {/* Platform Cards */}
        <section className="pb-16">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {PLATFORMS.map((platform, index) => (
                <FadeInView key={platform.id} direction="up" delay={200 + index * 100}>
                  <div
                    onClick={() => platform.available && setSelectedPlatform(platform.id)}
                    className={cn(
                      "relative p-8 rounded-lg border transition-all duration-300 cursor-pointer",
                      platform.available
                        ? selectedPlatform === platform.id
                          ? "bg-bg-graphite-1 border-accent-amber/50 shadow-glow-amber/10"
                          : "bg-bg-graphite-1/50 border-white/10 hover:border-white/20"
                        : "bg-bg-graphite-2/30 border-white/5 cursor-not-allowed opacity-60"
                    )}
                  >
                    {/* Platform Icon & Name */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className={cn(
                        "p-3 rounded-lg",
                        platform.available
                          ? selectedPlatform === platform.id
                            ? "bg-accent-amber/10 text-accent-amber"
                            : "bg-white/5 text-fg-muted"
                          : "bg-white/5 text-fg-dim"
                      )}>
                        {platform.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-porcelain">{platform.name}</h3>
                        <p className="text-xs font-mono text-fg-muted">{platform.version}</p>
                      </div>
                    </div>

                    {/* Download Info */}
                    {platform.available ? (
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-fg-muted">Size</span>
                          <span className="text-porcelain font-mono">{platform.size}</span>
                        </div>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload();
                          }}
                          className={cn(
                            "w-full font-mono text-xs uppercase tracking-widest h-12",
                            selectedPlatform === platform.id
                              ? "bg-accent-amber hover:bg-accent-amber/90 text-bg-graphite-0 font-bold"
                              : "bg-white/5 hover:bg-white/10 text-fg-muted"
                          )}
                        >
                          DOWNLOAD_{platform.name.toUpperCase()}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-fg-dim font-mono">COMING_SOON</p>
                        <p className="text-xs text-fg-ghost mt-2">
                          Join the waitlist to be notified
                        </p>
                      </div>
                    )}

                    {/* Selected indicator */}
                    {platform.available && selectedPlatform === platform.id && (
                      <>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent-amber" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent-amber/50" />
                      </>
                    )}
                  </div>
                </FadeInView>
              ))}
            </div>
          </div>
        </section>

        {/* System Requirements */}
        <section className="py-16 border-t border-stroke-hairline">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <FadeInView direction="up">
                <h2 className="text-2xl font-semibold text-porcelain mb-8 text-center">
                  System Requirements
                </h2>
              </FadeInView>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {PLATFORMS.map((platform, index) => (
                  <FadeInView key={platform.id} direction="up" delay={100 + index * 100}>
                    <div className="p-6 rounded-lg bg-bg-graphite-1/50 border border-white/5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="text-fg-muted">{platform.icon}</div>
                        <h3 className="font-medium text-porcelain">{platform.name}</h3>
                      </div>
                      <ul className="space-y-2">
                        {platform.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-fg-muted">
                            <div className="w-1 h-1 rounded-full bg-accent-amber mt-2 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </FadeInView>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Installation Guide */}
        <section className="py-16 border-t border-stroke-hairline">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto">
              <FadeInView direction="up">
                <h2 className="text-2xl font-semibold text-porcelain mb-8 text-center">
                  Installation Guide
                </h2>
              </FadeInView>

              <FadeInView direction="up" delay={100}>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-bg-graphite-1/50 border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-6 h-6 rounded-full bg-accent-amber/20 text-accent-amber text-xs font-mono flex items-center justify-center">1</span>
                      <h3 className="font-medium text-porcelain">Download the installer</h3>
                    </div>
                    <p className="text-sm text-fg-muted ml-9">
                      Click the download button above to get the latest version for your platform.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-bg-graphite-1/50 border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-6 h-6 rounded-full bg-accent-amber/20 text-accent-amber text-xs font-mono flex items-center justify-center">2</span>
                      <h3 className="font-medium text-porcelain">Run the installer</h3>
                    </div>
                    <p className="text-sm text-fg-muted ml-9">
                      Double-click the downloaded file. No admin rights required for per-user installation.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-bg-graphite-1/50 border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-6 h-6 rounded-full bg-accent-amber/20 text-accent-amber text-xs font-mono flex items-center justify-center">3</span>
                      <h3 className="font-medium text-porcelain">Sign in & start searching</h3>
                    </div>
                    <p className="text-sm text-fg-muted ml-9">
                      Create an account or sign in to unlock all features. Your search data stays local.
                    </p>
                  </div>
                </div>
              </FadeInView>

              <FadeInView direction="up" delay={200}>
                <div className="mt-8 p-4 rounded-lg bg-accent-amber/5 border border-accent-amber/20">
                  <p className="text-sm text-fg-muted">
                    <span className="text-accent-amber font-semibold">Privacy guarantee:</span>{" "}
                    All indexing and search happens locally on your device. We never see your files or search queries.
                  </p>
                </div>
              </FadeInView>
            </div>
          </div>
        </section>

        {/* Help CTA */}
        <section className="py-16 border-t border-stroke-hairline">
          <div className="container mx-auto px-6">
            <div className="text-center">
              <FadeInView direction="up">
                <p className="text-fg-muted mb-4">Need help getting started?</p>
                <Link
                  href="/docs"
                  className="text-accent-teal hover:text-accent-teal/80 font-medium transition-colors"
                >
                  Read the documentation &rarr;
                </Link>
              </FadeInView>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
