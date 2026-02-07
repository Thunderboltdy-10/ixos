import Link from "next/link";
import type { ReactNode } from "react";
import { Nav } from "@/components/ui/Nav";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Footer } from "@/components/sections/Footer";
import { PageGlow } from "@/components/effects/PageGlow";
import { DocsSideNav } from "@/components/docs/DocsSideNav";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageGlow color="teal" />
      <div className="relative z-10">
        <Nav />
        <div className="pt-20">
          <SectionDivider accent="teal" label="DOCUMENTATION" />
        </div>

        <main className="container mx-auto max-w-7xl px-6 pb-20 pt-8">
          <div className="grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
            <DocsSideNav />
            <article className="docs-page min-w-0 rounded-lg border border-white/10 bg-bg-graphite-2/55 px-6 py-8 backdrop-blur-sm md:px-10 md:py-10">
              <div className="mb-7 flex items-center justify-between gap-4 border-b border-white/8 pb-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-accent-teal">
                    {"// IXOS DOCS"}
                  </p>
                  <p className="mt-1 text-sm text-fg-muted/72">
                    Product, engineering, and model operations reference.
                  </p>
                </div>
                <Link
                  href="/download"
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-fg-muted/85 transition-colors hover:border-white/20 hover:text-fg-porcelain"
                >
                  Download
                </Link>
              </div>
              {children}
            </article>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
