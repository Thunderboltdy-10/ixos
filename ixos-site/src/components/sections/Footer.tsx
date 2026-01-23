import Link from "next/link";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="py-12 border-t border-stroke-hairline">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    <div className="col-span-2 lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="relative w-6 h-6 opacity-80">
                                <Image src="/assets/icon.png" alt="Ixos" fill className="object-contain" />
                            </div>
                            <span className="font-bold text-lg">Ixos</span>
                        </div>
                        <p className="text-fg-muted text-sm max-w-xs">
                            The semantic search tool for developers and power users who care about privacy.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-medium text-sm text-white mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-fg-muted">
                            <li><Link href="#download" className="hover:text-accent-amber transition-colors">Download</Link></li>
                            <li><Link href="/pricing" className="hover:text-accent-amber transition-colors">Pricing</Link></li>
                            <li><Link href="#changelog" className="hover:text-accent-amber transition-colors">Changelog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-medium text-sm text-white mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-fg-muted">
                            <li><Link href="/docs" className="hover:text-accent-amber transition-colors">Documentation</Link></li>
                            <li><Link href="#blog" className="hover:text-accent-amber transition-colors">Blog</Link></li>
                            <li><Link href="#github" className="hover:text-accent-amber transition-colors">GitHub</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-medium text-sm text-white mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-fg-muted">
                            <li><Link href="/privacy" className="hover:text-accent-amber transition-colors">Privacy</Link></li>
                            <li><Link href="#terms" className="hover:text-accent-amber transition-colors">Terms</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-stroke-hairline flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-fg-muted">
                        © {new Date().getFullYear()} Ixos Labs. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        {/* Social icons could go here */}
                    </div>
                </div>
            </div>
        </footer>
    );
}
