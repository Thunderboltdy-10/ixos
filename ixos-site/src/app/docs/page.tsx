import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/Button";
import { getDownloadUrl } from "@/lib/downloads";

export default function DocsPage() {
    return (
        <>
            <Nav />
            <div className="pt-20">
                <SectionDivider accent="teal" label="DOCUMENTATION" />
            </div>
            <main className="pt-8 pb-24 container mx-auto px-6 max-w-6xl flex gap-12">

                {/* Sidebar */}
                <aside className="hidden lg:block w-64 shrink-0 space-y-8 sticky top-32 h-fit">
                    <div className="space-y-4">
                        <h3 className="font-bold text-white">Getting Started</h3>
                        <ul className="space-y-2 text-sm text-text-muted">
                            <li><span className="text-accent-teal cursor-pointer">Installation</span></li>
                            <li><span className="hover:text-white cursor-pointer transition-colors">System Requirements</span></li>
                            <li><span className="hover:text-white cursor-pointer transition-colors">First Search</span></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-bold text-white">Shortcuts</h3>
                        <ul className="space-y-2 text-sm text-text-muted">
                            <li><span className="hover:text-white cursor-pointer transition-colors">Keyboard References</span></li>
                            <li><span className="hover:text-white cursor-pointer transition-colors">Command Bar</span></li>
                        </ul>
                    </div>
                </aside>

                {/* Content */}
                <div className="flex-1 max-w-3xl space-y-12">
                    <div className="space-y-6">
                        <h1 className="text-4xl font-semibold text-white">Installation</h1>
                        <p className="text-lg text-text-secondary">
                            Get up and running with Ixos in seconds.
                        </p>

                        <div className="bg-bg-secondary border border-white/5 rounded-xl p-8 space-y-6">
                            <h3 className="text-xl font-bold text-white">Windows</h3>
                            <p className="text-text-secondary text-sm">Download the installer and run it. Ixos will automatically detect your best configuration.</p>
                            <Button asChild>
                                <Link href={getDownloadUrl("windows") ?? "/download"}>Download .exe</Link>
                            </Button>
                        </div>

                        <div className="bg-bg-secondary border border-white/5 rounded-xl p-8 space-y-6">
                            <h3 className="text-xl font-bold text-white">macOS</h3>
                            <p className="text-text-secondary text-sm">Drag Ixos.app to your Applications folder.</p>
                            <Button variant="secondary" asChild>
                                <Link href="/download">Download .dmg</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white">System Requirements</h2>
                        <ul className="list-disc pl-5 space-y-2 text-text-secondary">
                            <li>Windows 10/11 or macOS 12+ (Monterey)</li>
                            <li>8GB RAM minimum (16GB recommended for larger drives)</li>
                            <li>500MB disk space</li>
                            <li>Modern multi-core CPU (AVX2 support)</li>
                        </ul>
                    </div>
                </div>

            </main>
            <Footer />
        </>
    );
}
