import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/sections/Footer";

export default function TermsPage() {
    return (
        <>
            <Nav />
            <main className="pt-32 pb-24 container mx-auto px-6 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-semibold mb-8 text-white">Terms of Service</h1>

                <div className="prose prose-invert prose-lg max-w-none space-y-12">

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p className="text-text-secondary">
                            By downloading, installing, or using Ixos ("the Software"), you agree to be bound by these
                            Terms of Service. If you do not agree, do not use the Software.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. License</h2>
                        <p className="text-text-secondary">
                            Ixos grants you a limited, non-exclusive, non-transferable license to use the Software
                            for personal or commercial purposes on devices you own or control.
                            The Free tier provides core search functionality. The Pro tier unlocks additional features
                            as described on the pricing page.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Local-First Operation</h2>
                        <p className="text-text-secondary">
                            Ixos processes all files locally on your device. We do not access, collect, or store
                            your files or their contents. The only data transmitted to our servers is authentication
                            information and license verification. See our <a href="/privacy" className="text-accent-teal hover:underline">Privacy Policy</a> for details.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Pro Subscription</h2>
                        <p className="text-text-secondary">
                            Pro subscriptions are billed through our payment processor. You may cancel at any time.
                            Pro features are tied to a single device at a time. Device transfers can be requested
                            through the application.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Limitation of Liability</h2>
                        <p className="text-text-secondary">
                            Ixos is provided "as is" without warranty of any kind. We are not liable for any damages
                            arising from the use of the Software, including but not limited to data loss, system
                            interruption, or accuracy of search results.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Updates</h2>
                        <p className="text-text-secondary">
                            We may update the Software and these Terms from time to time. Continued use of the
                            Software after changes constitutes acceptance of the updated Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Contact</h2>
                        <p className="text-text-secondary">
                            For questions about these Terms, please contact us through the support page.
                        </p>
                    </section>

                </div>
            </main>
            <Footer />
        </>
    );
}
