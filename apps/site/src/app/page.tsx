"use client";

import { HeroSection } from "@/components/homepage/HeroSection";
import { ProblemSolutionSection } from "@/components/homepage/ProblemSolutionSection";
import { HowItWorksSection } from "@/components/homepage/HowItWorksSection";
import { UseCasesSection } from "@/components/homepage/UseCasesSection";
import { LocalSearchSection } from "@/components/homepage/LocalSearchSection";
import { OpenSourcePreviewSection } from "@/components/homepage/OpenSourcePreviewSection";
import { FinalCTASection } from "@/components/homepage/FinalCTASection";

export default function HomePage() {
  return (
    <div
      className="relative min-h-screen text-[#f3f5f7] selection:bg-amber-400/30"
      style={{ overflowX: "clip" }}
    >
      <main className="relative z-10">
        <HeroSection />
        <ProblemSolutionSection />
        <HowItWorksSection />
        <UseCasesSection />
        <LocalSearchSection />
        <OpenSourcePreviewSection />
        <FinalCTASection />
      </main>
    </div>
  );
}
