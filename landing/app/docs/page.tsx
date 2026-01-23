import { Metadata } from "next";
import Link from "next/link";
import { Book, Zap, Shield, Terminal, Settings, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
    title: "Documentation | Ixos",
    description: "Learn how to use Ixos for semantic file search.",
};

const DOC_SECTIONS = [
    {
        title: "Getting Started",
        description: "Install Ixos and make your first search",
        icon: Book,
        href: "/docs/getting-started",
    },
    {
        title: "Search Modes",
        description: "Understand Flash, Auto, and Pro modes",
        icon: Zap,
        href: "/docs/modes",
    },
    {
        title: "Privacy & Security",
        description: "How Ixos protects your data",
        icon: Shield,
        href: "/docs/privacy",
    },
    {
        title: "CLI Reference",
        description: "Command-line interface documentation",
        icon: Terminal,
        href: "/docs/cli",
    },
    {
        title: "Configuration",
        description: "Customize Ixos behavior",
        icon: Settings,
        href: "/docs/configuration",
    },
    {
        title: "FAQ",
        description: "Frequently asked questions",
        icon: HelpCircle,
        href: "/docs/faq",
    },
];

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-surface-0 pt-24 pb-16">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.1)_0%,rgba(10,10,15,0)_50%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                    Documentation
                </h1>
                <p className="text-content-secondary text-lg mb-12">
                    Everything you need to know about using Ixos.
                </p>

                {/* Quick Start */}
                <div className="bg-surface-1 rounded-2xl border border-brand-teal/30 p-8 mb-12">
                    <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
                    <div className="space-y-4 text-content-secondary">
                        <p>1. Download and install Ixos from the <Link href="/download" className="text-brand-teal hover:underline">download page</Link>.</p>
                        <p>2. Launch Ixos and select a folder to index.</p>
                        <p>3. Start typing your query in natural language.</p>
                        <div className="bg-surface-0 rounded-lg p-4 font-mono text-sm mt-4">
                            <p className="text-content-muted"># Example searches</p>
                            <p className="text-white">quarterly report from march</p>
                            <p className="text-white">meeting notes about budget</p>
                            <p className="text-white">code that handles authentication</p>
                        </div>
                    </div>
                </div>

                {/* Doc Sections Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {DOC_SECTIONS.map((section) => (
                        <Link
                            key={section.title}
                            href={section.href}
                            className="bg-surface-1 rounded-2xl border border-white/5 p-6 hover:border-brand-teal/30 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mb-4 group-hover:bg-brand-teal/10 transition-colors">
                                <section.icon className="w-6 h-6 text-brand-teal" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-brand-teal transition-colors">
                                {section.title}
                            </h3>
                            <p className="text-content-secondary text-sm">
                                {section.description}
                            </p>
                        </Link>
                    ))}
                </div>

                {/* GitHub Link */}
                <div className="mt-12 text-center">
                    <p className="text-content-muted mb-4">
                        Can't find what you're looking for?
                    </p>
                    <a
                        href="https://github.com/ixos-protocol/ixos/wiki"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-teal hover:text-brand-teal/80 font-medium"
                    >
                        View full documentation on GitHub →
                    </a>
                </div>
            </div>
        </div>
    );
}
