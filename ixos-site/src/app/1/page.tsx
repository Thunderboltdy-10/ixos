// Variant 1: Refined Focus
import { Nav } from "@/components/ui/Nav";
import { HeroV1 } from "./components/HeroV1";
import { PipelineV1 } from "./components/PipelineV1";
import { BenchmarksV1 } from "./components/BenchmarksV1";
import { UseCaseV1 } from "./components/UseCaseV1";
import { TodayV1 } from "./components/TodayV1";
import { WorkstreamsV1 } from "./components/WorkstreamsV1";
import { PricingV1 } from "./components/PricingV1";
import { DownloadV1 } from "./components/DownloadV1";
import { TrustV1 } from "./components/TrustV1";
import { FAQV1 } from "./components/FAQV1";
import { FooterV1 } from "./components/FooterV1";

export default function Variant1Page() {
    return (
        <main className="min-h-screen bg-bg-graphite-0 text-fg-porcelain font-mono selection:bg-accent-teal/30 selection:text-white">
            <Nav variant="v1" />
            <HeroV1 />
            <PipelineV1 />
            <BenchmarksV1 />
            <UseCaseV1 />
            <TodayV1 />
            <WorkstreamsV1 />
            <PricingV1 />
            <DownloadV1 />
            <TrustV1 />
            <FAQV1 />
            <FooterV1 />
        </main>
    );
}
