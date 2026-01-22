import { Nav } from "@/components/ui/Nav";
import { Pricing } from "@/components/sections/Pricing";
import { Footer } from "@/components/sections/Footer";

export default function PricingPage() {
    return (
        <>
            <Nav />
            <main className="pt-32 pb-12">
                <div className="container mx-auto px-6 text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Plans & Pricing</h1>
                    <p className="text-text-secondary text-lg">Simple, transparent, and built for developers.</p>
                </div>
                <Pricing />
            </main>
            <Footer />
        </>
    );
}
