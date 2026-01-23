"use client";

import { motion } from "framer-motion";
import { MagneticButton } from "@/components/magnetic-button";
import { slideUp } from "@/lib/animations";
import { Download, ArrowRight } from "lucide-react";

export function CtaSection() {
    return (
        <section className="py-32 relative overflow-hidden flex items-center justify-center">
            {/* Background Portal Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-blue/30 via-surface-0 to-surface-0 z-0 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-teal/10 rounded-full blur-[100px] animate-pulse-slow" />

            <div className="container mx-auto px-4 relative z-10 text-center">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                    className="max-w-3xl mx-auto"
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Ready to take back control?
                    </h2>
                    <p className="text-xl text-content-secondary mb-10 max-w-2xl mx-auto">
                        Join thousands of developers and privacy advocates who have switched to local-first search.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-6 items-center">
                        <MagneticButton size="lg" className="w-full sm:w-auto h-16 px-8 text-lg rounded-full shadow-[0_0_30px_rgba(13,148,136,0.3)] bg-gradient-brand hover:scale-105 transition-transform">
                            <Download className="w-5 h-5 mr-2" />
                            Download Ixos v0.2.0
                        </MagneticButton>
                        <MagneticButton variant="outline" size="lg" className="w-full sm:w-auto h-16 px-8 text-lg rounded-full border-white/10 hover:bg-white/5 backdrop-blur-md">
                            Read Documentation
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </MagneticButton>
                    </div>

                    <div className="mt-8 flex justify-center gap-8 text-sm text-content-muted">
                        <span className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            No Credit Card
                        </span>
                        <span className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Open Source
                        </span>
                        <span className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            No Telemetry
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
