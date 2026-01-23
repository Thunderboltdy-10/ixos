"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionDivider } from "@/components/ui/SectionDivider";

import { FadeInView } from "@/components/effects/FadeInView";

export function FAQ() {
    return (
        <div className="relative">
            <SectionDivider accent="amber" label="COMMON_QUERIES" />

            <div className="py-24 container mx-auto px-6 max-w-4xl">
                <FadeInView direction="up">
                    <h2 className="text-3xl font-semibold text-center mb-12">
                        Questions? <span className="text-accent-amber">Answers.</span>
                    </h2>
                </FadeInView>

                <FadeInView direction="up" delay={200}>
                    <div
                        className="rounded-sm border border-white/10 bg-bg-graphite-1/50 backdrop-blur overflow-hidden hover-glow-subtle"
                        data-trace-anchor="faq-accordion"
                        data-trace-color="amber"
                    >
                        <Accordion type="single" collapsible className="w-full">
                            {faqItems.map((item, i) => (
                                <AccordionItem key={i} value={`item-${i}`} className="border-b border-white/10 last:border-0 px-6 data-[state=open]:bg-white/5 transition-colors">
                                    <AccordionTrigger className="hover:no-underline py-6">
                                        <span className="text-left font-medium text-fg-porcelain hover:text-accent-amber transition-colors font-mono text-sm tracking-wide">
                                            {item.question}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="text-fg-muted leading-relaxed pb-6">
                                        {item.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </FadeInView>
            </div>
        </div>
    );
}

const faqItems = [
    {
        question: "Is my data safe?",
        answer: "Absolutely. Ixos runs 100% locally on your machine. No file content, metadata, or search queries ever leave your device.",
    },
    {
        question: "What file types are supported?",
        answer: "We support PDF, DOCX, MD, TXT, and code files (TS, JS, PY, RS, GO) out of the box. Pro users get priority indexing for large codebases.",
    },
    {
        question: "Does it work on Windows?",
        answer: "Yes, Ixos is optimized for Windows 10 and 11, utilizing native filesystem watchers for zero-latency updates.",
    },
    {
        question: "How much RAM does it use?",
        answer: "Ixos is built with Rust and highly optimized. It typically uses less than 150MB of RAM during idle and spikes only during active indexing.",
    },
];
