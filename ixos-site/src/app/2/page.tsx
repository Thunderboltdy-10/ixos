// Variant 2: Glass Narrative
import { Nav } from "@/components/ui/Nav";
import { HeroV2 } from "./components/HeroV2";
import { PipelineV2 } from "./components/PipelineV2";
import { BenchmarksV2 } from "./components/BenchmarksV2";
import { UseCaseV2 } from "./components/UseCaseV2";
import { TodayV2 } from "./components/TodayV2";
import { WorkstreamsV2 } from "./components/WorkstreamsV2";
import { PricingV2 } from "./components/PricingV2";
import { DownloadV2 } from "./components/DownloadV2";
import { TrustV2 } from "./components/TrustV2";
import { FAQV2 } from "./components/FAQV2";
import { FooterV2 } from "./components/FooterV2";

export default function Variant2Page() {
    return (
        <main className="min-h-screen bg-[#0A0D14] text-fg-porcelain font-mono selection:bg-accent-violet/30 selection:text-white">
            <Nav variant="v2" />
            <HeroV2 />
            <PipelineV2 />
            <BenchmarksV2 />
            <UseCaseV2 />
            <TodayV2 />
            <WorkstreamsV2 />
            <PricingV2 />
            <DownloadV2 />
            <TrustV2 />
            <FAQV2 />
            <FooterV2 />
        </main>
    );
}
