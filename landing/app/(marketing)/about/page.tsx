import { Metadata } from "next";
import { Github, Twitter, Mail } from "lucide-react";

export const metadata: Metadata = {
    title: "About | Ixos",
    description: "Learn about Ixos and our mission to make file search private, fast, and meaningful.",
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-surface-0 pt-24 pb-16">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.1)_0%,rgba(10,10,15,0)_50%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10 max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-8">
                    About Ixos
                </h1>

                <div className="prose prose-invert prose-lg max-w-none">
                    <p className="text-content-secondary text-lg leading-relaxed mb-8">
                        Ixos is a local-first semantic file search tool. We believe you shouldn't have to choose between powerful search and privacy.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-12 mb-4">
                        Our Mission
                    </h2>
                    <p className="text-content-secondary leading-relaxed mb-6">
                        Modern operating systems have made file search an afterthought. Windows Search and Spotlight match keywords, not meaning. Cloud-powered alternatives upload your files to remote servers. We built Ixos to prove there's a better way.
                    </p>
                    <p className="text-content-secondary leading-relaxed mb-6">
                        Ixos runs 100% locally on your device. We use Ixos-Flash-v2, a Model2Vec embedding model optimized for CPU inference, to understand the meaning of your files. No cloud uploads, no external API calls, no compromises.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-12 mb-4">
                        The Technology
                    </h2>
                    <p className="text-content-secondary leading-relaxed mb-6">
                        Ixos combines lexical and semantic search in a hybrid cascade architecture:
                    </p>
                    <ul className="list-disc list-inside text-content-secondary space-y-2 mb-6">
                        <li>Ripgrep for blazing-fast keyword filtering</li>
                        <li>Model2Vec embeddings for semantic understanding</li>
                        <li>Learned fusion weights for optimal result ranking</li>
                        <li>Evidence rendering for explainable matches</li>
                    </ul>
                    <p className="text-content-secondary leading-relaxed mb-6">
                        Built with Rust for performance and Tauri for cross-platform desktop deployment. Open source and auditable.
                    </p>

                    <h2 className="text-2xl font-semibold text-white mt-12 mb-4">
                        Contact
                    </h2>
                    <div className="flex flex-col gap-4">
                        <a
                            href="mailto:hello@ixos.app"
                            className="flex items-center gap-3 text-content-secondary hover:text-brand-teal transition-colors"
                        >
                            <Mail className="w-5 h-5" />
                            hello@ixos.app
                        </a>
                        <a
                            href="https://github.com/ixos-protocol/ixos"
                            className="flex items-center gap-3 text-content-secondary hover:text-brand-teal transition-colors"
                        >
                            <Github className="w-5 h-5" />
                            github.com/ixos-protocol/ixos
                        </a>
                        <a
                            href="https://twitter.com/ixos_protocol"
                            className="flex items-center gap-3 text-content-secondary hover:text-brand-teal transition-colors"
                        >
                            <Twitter className="w-5 h-5" />
                            @ixos_protocol
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
