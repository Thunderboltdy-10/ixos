import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy | Ixos",
    description: "Ixos Privacy Policy - Learn how we protect your data.",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-surface-0 pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-3xl">
                <h1 className="text-4xl font-display font-bold text-white mb-8">
                    Privacy Policy
                </h1>
                <p className="text-content-muted text-sm mb-8">
                    Last updated: January 18, 2026
                </p>

                <div className="prose prose-invert prose-lg max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">Overview</h2>
                        <p className="text-content-secondary leading-relaxed">
                            Ixos is a local-first application. Your files, searches, and embeddings stay on your device. We don't collect, transmit, or store any of your file data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">The Ixos Application</h2>
                        <p className="text-content-secondary leading-relaxed mb-4">
                            <strong className="text-white">What we don't collect:</strong>
                        </p>
                        <ul className="list-disc list-inside text-content-secondary space-y-2 mb-4">
                            <li>File contents or metadata</li>
                            <li>Search queries</li>
                            <li>Usage patterns or analytics</li>
                            <li>Device identifiers</li>
                            <li>Location data</li>
                        </ul>
                        <p className="text-content-secondary leading-relaxed">
                            The Ixos application operates entirely offline. No network connections are made during normal operation except for optional update checks.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">This Website</h2>
                        <p className="text-content-secondary leading-relaxed mb-4">
                            <strong className="text-white">Analytics:</strong> We use Plausible Analytics, a privacy-first analytics service. Plausible does not use cookies, does not track users across sites, and is GDPR compliant by design.
                        </p>
                        <p className="text-content-secondary leading-relaxed mb-4">
                            <strong className="text-white">Waitlist:</strong> If you join our waitlist, we store your email address to notify you about updates. You can request deletion at any time.
                        </p>
                        <p className="text-content-secondary leading-relaxed">
                            <strong className="text-white">Purchases:</strong> Payments are processed by Lemon Squeezy, our Merchant of Record. Lemon Squeezy handles all payment data and is PCI DSS compliant. We receive your email to deliver license keys.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">Data Storage</h2>
                        <p className="text-content-secondary leading-relaxed">
                            Any data we do collect (waitlist emails, purchase records) is stored in a PostgreSQL database hosted on secure infrastructure with encryption at rest.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
                        <p className="text-content-secondary leading-relaxed mb-4">
                            Under GDPR and CCPA, you have the right to:
                        </p>
                        <ul className="list-disc list-inside text-content-secondary space-y-2">
                            <li>Access any personal data we hold about you</li>
                            <li>Request deletion of your data</li>
                            <li>Export your data in a portable format</li>
                            <li>Opt out of any marketing communications</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">Contact</h2>
                        <p className="text-content-secondary leading-relaxed">
                            For privacy-related inquiries, contact us at{" "}
                            <a href="mailto:privacy@ixos.app" className="text-brand-teal hover:text-brand-teal/80">
                                privacy@ixos.app
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
