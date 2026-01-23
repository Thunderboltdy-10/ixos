import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service | Ixos",
    description: "Ixos Terms of Service",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-surface-0 pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-3xl">
                <h1 className="text-4xl font-display font-bold text-white mb-8">
                    Terms of Service
                </h1>
                <p className="text-content-muted text-sm mb-8">
                    Last updated: January 18, 2026
                </p>

                <div className="prose prose-invert prose-lg max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                        <p className="text-content-secondary leading-relaxed">
                            By downloading, installing, or using Ixos ("the Software"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Software.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">2. License</h2>
                        <p className="text-content-secondary leading-relaxed mb-4">
                            <strong className="text-white">Free Tier:</strong> Ixos Free is provided under the MIT License. You may use, copy, modify, and distribute the software freely, subject to the license terms.
                        </p>
                        <p className="text-content-secondary leading-relaxed">
                            <strong className="text-white">Pro and Team Tiers:</strong> Paid tiers grant you a personal, non-transferable license to use the premium features. The license is valid for the subscription period and the number of devices specified in your plan.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">3. Use Restrictions</h2>
                        <p className="text-content-secondary leading-relaxed mb-4">
                            You agree not to:
                        </p>
                        <ul className="list-disc list-inside text-content-secondary space-y-2">
                            <li>Reverse engineer, decompile, or disassemble the Software (except as permitted by applicable law)</li>
                            <li>Remove or alter any proprietary notices</li>
                            <li>Use the Software for any unlawful purpose</li>
                            <li>Share your license key with others</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">4. Payment and Refunds</h2>
                        <p className="text-content-secondary leading-relaxed mb-4">
                            Payments are processed by Lemon Squeezy, our Merchant of Record. By purchasing a license, you agree to Lemon Squeezy's terms of service.
                        </p>
                        <p className="text-content-secondary leading-relaxed">
                            We offer a 30-day money-back guarantee. If you're not satisfied with your purchase, contact us within 30 days for a full refund.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">5. Disclaimer of Warranties</h2>
                        <p className="text-content-secondary leading-relaxed">
                            THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DO NOT WARRANT THAT THE SOFTWARE WILL BE ERROR-FREE OR UNINTERRUPTED.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">6. Limitation of Liability</h2>
                        <p className="text-content-secondary leading-relaxed">
                            IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SOFTWARE.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">7. Changes to Terms</h2>
                        <p className="text-content-secondary leading-relaxed">
                            We may update these terms from time to time. Continued use of the Software after changes constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">8. Contact</h2>
                        <p className="text-content-secondary leading-relaxed">
                            Questions about these terms? Contact us at{" "}
                            <a href="mailto:legal@ixos.app" className="text-brand-teal hover:text-brand-teal/80">
                                legal@ixos.app
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
