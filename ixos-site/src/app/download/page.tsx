"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/sections/Footer";
import { FadeInView } from "@/components/effects/FadeInView";
import { DownloadThankYou } from "@/components/ui/DownloadThankYou";
import { cn } from "@/lib/utils";
import { getDownloadUrl, type DownloadPlatform } from "@/lib/downloads";
import { PageGlow } from "@/components/effects/PageGlow";
import { Check, Copy, Terminal } from "lucide-react";
import { CLI_INSTALL_COMMANDS, type InstallOs } from "@/components/sections/DownloadActions";

type PlatformId = "windows" | "macos" | "linux";
type MacChip = "apple" | "intel";

interface PlatformInfo {
  id: PlatformId;
  name: string;
  icon: React.ReactNode;
  version: string;
  size: string;
  requirements: string[];
  hasMacChipSelector?: boolean;
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
    version: "v1.0.0",
    size: "~50 MB",
    requirements: [
      "macOS 12 Monterey or later",
      "Apple Silicon or Intel",
      "4 GB RAM minimum",
    ],
    hasMacChipSelector: true,
  },
  {
    id: "linux",
    name: "Linux",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.062c-.06-.2-.127-.333-.18-.467-.076-.135-.174-.268-.27-.4-.103-.134-.207-.268-.324-.334-.117-.135-.234-.2-.368-.268-.07-.034-.14-.064-.21-.131v-.004c.14.132.28.267.42.4.138.134.257.267.376.4.116.135.207.268.266.4.117.135.156.268.172.4.018.135.004.27-.058.403-.011.013-.02.025-.04.038v-.025c-.036-.068-.085-.133-.147-.198-.063-.064-.135-.135-.218-.2-.165-.133-.38-.198-.628-.267-.048-.006-.1-.02-.15-.03.009.02.022.04.032.058.094.2.122.469.058.669-.067.199-.199.398-.358.535-.159.133-.375.265-.552.332-.179.066-.348.133-.464.138-.117.004-.171-.03-.171-.03l.003-.004c-.122-.067-.218-.135-.315-.268-.097-.132-.178-.264-.232-.465-.056-.199-.063-.333-.008-.533.054-.2.16-.398.323-.599l-.003-.003a.2.2 0 00-.062.058c-.226.268-.479.6-.685.801-.199.2-.47.398-.726.465-.257.067-.514.069-.754-.069l-.003-.003c-.07-.028-.148-.07-.222-.132-.081-.058-.149-.135-.222-.2l-.003-.003a.852.852 0 01-.164-.268 1.167 1.167 0 01-.046-.4 1.9 1.9 0 01.091-.532c.065-.2.155-.4.257-.534a1.05 1.05 0 00-.154.068 2.26 2.26 0 00-.778.668 2.041 2.041 0 00-.347.735c-.058.2-.076.398-.017.597.057.2.148.398.347.531.013.006.024.016.037.022-.152.066-.366.135-.548.131v-.003a2.1 2.1 0 01-.685-.198 2.312 2.312 0 01-.57-.4 1.967 1.967 0 01-.396-.535 1.678 1.678 0 01-.163-.666 1.786 1.786 0 01.067-.733c.07-.2.164-.4.286-.534.122-.133.27-.264.444-.332.176-.067.378-.134.592-.067v-.003l.003-.003c-.151-.133-.232-.266-.323-.465-.089-.2-.127-.398-.14-.599-.016-.2.02-.4.107-.534.055-.065.132-.131.22-.197a1.135 1.135 0 00-.093-.533.657.657 0 00-.26-.333c-.134-.067-.27-.098-.417-.2a1.035 1.035 0 01-.348-.465c-.046-.135-.046-.334 0-.532.046-.2.14-.4.28-.535.14-.133.325-.2.533-.2.208 0 .44.067.685.2.245.135.478.334.694.466a1.108 1.108 0 01-.095-.066c-.105-.08-.195-.2-.19-.4.003-.15.058-.265.14-.4.081-.135.185-.27.313-.4.128-.13.26-.266.398-.4a3.53 3.53 0 00.382-.467c.176-.199.305-.398.41-.6.104-.2.168-.399.193-.665.003-.135.008-.27-.015-.4-.023-.135-.06-.27-.123-.4l-.016-.032-.037-.068a1.287 1.287 0 01-.14-.4 1.467 1.467 0 01.058-.533c.058-.2.13-.333.314-.4z" />
      </svg>
    ),
    version: "v1.0.0",
    size: "~55 MB",
    requirements: [
      "Ubuntu 20.04+ or equivalent",
      "4 GB RAM minimum",
      "AppImage format (portable)",
    ],
  },
];

export default function DownloadPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("windows");
  const [macChip, setMacChip] = useState<MacChip>("apple");
  const [showThankYou, setShowThankYou] = useState(false);
  const [downloadingPlatform, setDownloadingPlatform] = useState("");
  const [installOs, setInstallOs] = useState<InstallOs>("windows");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CLI_INSTALL_COMMANDS[installOs].command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const getDownloadKey = (platformId: PlatformId): DownloadPlatform => {
    switch (platformId) {
      case "windows":
        return "windows-x64";
      case "macos":
        return macChip === "apple" ? "macos-arm64" : "macos-x64";
      case "linux":
        return "linux-x64";
    }
  };

  const getPlatformDisplayName = (platformId: PlatformId): string => {
    switch (platformId) {
      case "windows":
        return "Windows (x64)";
      case "macos":
        return macChip === "apple" ? "macOS (Apple Silicon)" : "macOS (Intel)";
      case "linux":
        return "Linux (AppImage)";
    }
  };

  const handleDownload = (platformId: PlatformId) => {
    const downloadKey = getDownloadKey(platformId);
    const url = getDownloadUrl(downloadKey);

    // Show thank you message
    setDownloadingPlatform(getPlatformDisplayName(platformId));
    setShowThankYou(true);

    // Trigger download
    window.location.href = url;
  };

  return (
    <>
      <PageGlow color="amber" />
      <DownloadThankYou
        isVisible={showThankYou}
        onClose={() => setShowThankYou(false)}
        platformName={downloadingPlatform}
      />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PLATFORMS.map((platform, index) => (
                <FadeInView key={platform.id} direction="up" delay={200 + index * 100}>
                  <div
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={cn(
                      "relative p-8 rounded-lg border transition-all duration-300 cursor-pointer",
                      selectedPlatform === platform.id
                        ? "bg-bg-graphite-1 border-accent-amber/50 shadow-glow-amber/10"
                        : "bg-bg-graphite-1/50 border-white/10 hover:border-white/20"
                    )}
                  >
                    {/* Platform Icon & Name */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className={cn(
                        "p-3 rounded-lg",
                        selectedPlatform === platform.id
                          ? "bg-accent-amber/10 text-accent-amber"
                          : "bg-white/5 text-fg-muted"
                      )}>
                        {platform.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-porcelain">{platform.name}</h3>
                        <p className="text-xs font-mono text-fg-muted">{platform.version}</p>
                      </div>
                    </div>

                    {/* macOS Chip Selector */}
                    {platform.hasMacChipSelector && selectedPlatform === "macos" && (
                      <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-xs font-mono text-fg-muted mb-2">SELECT_CHIP</p>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMacChip("apple");
                            }}
                            className={cn(
                              "flex-1 py-2 px-3 rounded text-xs font-mono transition-all",
                              macChip === "apple"
                                ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/50"
                                : "bg-white/5 text-fg-muted border border-white/10 hover:border-white/20"
                            )}
                          >
                            Apple Silicon
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMacChip("intel");
                            }}
                            className={cn(
                              "flex-1 py-2 px-3 rounded text-xs font-mono transition-all",
                              macChip === "intel"
                                ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/50"
                                : "bg-white/5 text-fg-muted border border-white/10 hover:border-white/20"
                            )}
                          >
                            Intel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Download Info */}
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-fg-muted">Size</span>
                        <span className="text-porcelain font-mono">{platform.size}</span>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(platform.id);
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

                    {/* Selected indicator */}
                    {selectedPlatform === platform.id && (
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
            <div className="max-w-5xl mx-auto">
              <FadeInView direction="up">
                <h2 className="text-2xl font-semibold text-porcelain mb-8 text-center">
                  System Requirements
                </h2>
              </FadeInView>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                      <h3 className="font-medium text-porcelain">Sign in &amp; start searching</h3>
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
