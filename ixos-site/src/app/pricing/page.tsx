import { Suspense } from "react";
import { Nav } from "@/components/ui/Nav";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { PricingProFlow } from "@/components/sections/PricingProFlow";
import { DownloadActions } from "@/components/sections/DownloadActions";
import { Footer } from "@/components/sections/Footer";
import { PageGlow } from "@/components/effects/PageGlow";

export default function PricingPage() {
    return (
        <>
            <PageGlow color="pink" />
            <div className="relative z-10">
                <Nav />
                <div className="pt-20">
                    <SectionDivider accent="magenta" label="PRICING" />
                </div>
                <main className="pt-8 pb-12">
                    <div className="container mx-auto px-6 text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-semibold mb-4 text-white">Plans & Pricing</h1>
                        <p className="text-text-secondary text-lg">Simple, transparent, and built for developers.</p>
                    </div>
                    <Suspense fallback={null}>
                        <PricingProFlow
                            pricingSectionClassName="section-pricing accent-magenta"
                            proSectionClassName="accent-teal"
                        />
                        <section className="accent-teal">
                            <DownloadActions />
                        </section>
                    </Suspense>
                </main>
                <Footer />
            </div>
        </>
    );
}
