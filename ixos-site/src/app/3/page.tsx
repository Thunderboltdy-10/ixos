// Variant 3: Data Dashboard
import { Nav } from "@/components/ui/Nav";
import { HeroV3 } from "./components/HeroV3";
import { PipelineV3 } from "./components/PipelineV3";
import { BenchmarksV3 } from "./components/BenchmarksV3";
import { UseCaseV3 } from "./components/UseCaseV3";
import { TodayV3 } from "./components/TodayV3";
import { WorkstreamsV3 } from "./components/WorkstreamsV3";
import { PricingV3 } from "./components/PricingV3";
import { DownloadV3 } from "./components/DownloadV3";
import { TrustV3 } from "./components/TrustV3";
import { FAQV3 } from "./components/FAQV3";
import { FooterV3 } from "./components/FooterV3";

export default function Variant3Page() {
    return (
        <main className="min-h-screen bg-[#0A0D14] text-fg-porcelain font-mono selection:bg-accent-amber/30 selection:text-white overflow-x-hidden w-full">
            <Nav variant="v3" />
            <HeroV3 />
            <PipelineV3 />
            <BenchmarksV3 />
            <UseCaseV3 />
            <TodayV3 />
            <WorkstreamsV3 />
            <PricingV3 />
            <DownloadV3 />
            <TrustV3 />
            <FAQV3 />
            <FooterV3 />
        </main>
    );
}
