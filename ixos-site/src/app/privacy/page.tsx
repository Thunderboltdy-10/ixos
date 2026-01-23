import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/sections/Footer";

export default function PrivacyPage() {
    return (
        <>
            <Nav />
            <main className="pt-32 pb-24 container mx-auto px-6 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-semibold mb-8 text-white">Privacy at Ixos</h1>

                <div className="prose prose-invert prose-lg max-w-none space-y-12">

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Your Files, Your Computer</h2>
                        <p className="text-text-secondary">
                            Ixos operates on a strict <strong className="text-accent-teal">local-first principle</strong>.
                            The application runs entirely on your device. Your files never leave your computer.
                            We operate NO cloud servers for file processing, NO syncing services, and NO data collection pipelines.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Zero Telemetry by Default</h2>
                        <p className="text-text-secondary">
                            We believe software should serve you, not track you. Ixos collects zero usage data,
                            analytics, or telemetry by default.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">On-Device AI</h2>
                        <p className="text-text-secondary">
                            All semantic analysis and embedding computation happens locally using optimized micro-models
                            that run on your CPU or NPU. No text or file content is ever sent to OpenAI, Anthropic,
                            or any third-party API.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">No Persistent Indexing</h2>
                        <p className="text-text-secondary">
                            Unlike traditional search tools that build massive hidden index databases, Ixos is designed to be lightweight.
                            We use <code className="bg-bg-elevated px-1 py-0.5 rounded text-sm">xattr</code> and Alternate Data Streams (ADS)
                            for tiny, ephemeral metadata. When you close the app, your memory footprint is virtually zero.
                        </p>
                    </section>

                </div>
            </main>
            <Footer />
        </>
    );
}
