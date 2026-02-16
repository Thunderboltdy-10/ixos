import { Suspense } from "react";
import { Nav } from "@/components/ui/Nav";
import { HeroPipeline } from "@/components/sections/HeroPipeline";
import { MeetingUseCase } from "@/components/sections/MeetingUseCase";
import { Benchmarks } from "@/components/sections/Benchmarks";
import { TodaySection } from "@/components/sections/TodaySection";
import { WorkstreamsSection } from "@/components/sections/WorkstreamsSection";
import { Pricing } from "@/components/sections/Pricing";
import { ProFeatures } from "@/components/sections/ProFeatures";
import { DownloadActions } from "@/components/sections/DownloadActions";
import { FAQ } from "@/components/sections/FAQ";
import { Trust } from "@/components/sections/Trust";
import { Footer } from "@/components/sections/Footer";
import { SectionDivider } from "@/components/ui/SectionDivider";

export default function Home() {
  return (
    <main className="flex flex-col w-full overflow-x-hidden">
      <Nav />

      {/* Hero & Pipeline Combined Section */}
      <div className="section-transition-teal-to-violet">
        <HeroPipeline />
      </div>

      {/* Meeting Use Case - Violet accent */}
      <section className="section-meeting accent-violet relative">
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-0 bg-gradient-to-b from-bg-graphite-0 to-transparent" />
        <MeetingUseCase />
      </section>

      {/* Benchmarks - Violet accent */}
      <section className="section-benchmarks accent-violet">
        <Benchmarks />
      </section>


      {/* Today - Teal accent (NEW) */}
      <section className="section-today accent-teal">
        <TodaySection />
      </section>

      {/* Workstreams - Amber accent (NEW) */}
      <div className="section-workstreams accent-teal relative z-10 -mt-24 pb-24 md:pb-32">    <WorkstreamsSection />
      </div>

      <SectionDivider accent="magenta" label="PRICING" />

      {/* Pricing - Magenta accent */}
      <section className="section-pricing accent-magenta">
        <Suspense fallback={null}>
          <Pricing />
        </Suspense>
      </section>

      <section className="accent-teal">
        <ProFeatures />
      </section>

      <section className="accent-teal">
        <DownloadActions />
      </section>

      {/* Trust / Privacy - Amber accent */}
      <section className="section-trust accent-amber">
        <Trust />
      </section>

      {/* FAQ */}
      <section className="section-faq accent-amber">
        <FAQ />
      </section>

      <Footer />
    </main>
  );
}

