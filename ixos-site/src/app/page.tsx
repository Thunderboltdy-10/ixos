import { Suspense } from "react";
import { Nav } from "@/components/ui/Nav";
import { HeroJourney } from "@/components/sections/HeroJourney";
import { MeetingUseCase } from "@/components/sections/MeetingUseCase";
import { Benchmarks } from "@/components/sections/Benchmarks";
import { Pricing } from "@/components/sections/Pricing";
import { FAQ } from "@/components/sections/FAQ";
import { Trust } from "@/components/sections/Trust";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <main className="flex flex-col w-full overflow-x-hidden">
      <Nav />

      {/* Hero Section (incl. How It Works) */}
      <section className="section-hero">
        <HeroJourney />
      </section>

      {/* Meeting Use Case - Violet accent */}
      <section className="section-meeting accent-violet">
        <MeetingUseCase />
      </section>

      {/* Benchmarks - Violet accent */}
      <section className="section-benchmarks accent-violet">
        <Benchmarks />
      </section>

      {/* Pricing - Magenta accent */}
      <section className="section-pricing accent-magenta">
        <Suspense fallback={null}>
          <Pricing />
        </Suspense>
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
