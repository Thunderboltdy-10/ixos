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
        question: "What's \"No Index Tax\"?",
        answer: "Traditional search tools like Windows Search build a persistent index that can grow to gigabytes, constantly eating disk space and requiring background updates. Ixos uses just-in-time semantic search that works without this overhead - we call this \"zero index tax\". Your files are processed on-demand and temporary data is cleaned up automatically.",
    },
    {
        question: "How is this different from Windows Search?",
        answer: "Windows Search builds and maintains a large persistent index (often several GB) that runs constantly in the background. Ixos searches on-demand with optional lightweight caching using your filesystem's metadata features. This means faster results, no disk bloat, and complete privacy since nothing leaves your machine.",
    },
    {
        question: "Does Ixos send my files to the cloud?",
        answer: "Never. All processing happens locally on your machine. The AI model runs entirely on your hardware - no internet connection required for search. Your files, queries, and results never leave your device.",
    },
    {
        question: "Is my data safe?",
        answer: "Absolutely. Ixos runs 100% locally. No file content, metadata, or search queries ever leave your device. In Journalist Mode, even temporary data is encrypted and wiped after each session.",
    },
    {
        question: "What file types are supported?",
        answer: "We support PDF, DOCX, MD, TXT, and code files (TS, JS, PY, RS, GO, C, CPP, and more) out of the box. The semantic search understands context and meaning, so you can find files even if you don't remember the exact filename.",
    },
    {
        question: "Does it work on Windows and macOS?",
        answer: "Yes, Ixos is optimized for both Windows 10+ and macOS 12+. We use native filesystem features (NTFS Alternate Data Streams on Windows, extended attributes on macOS) for zero-overhead metadata caching.",
    },
    {
        question: "How much RAM does it use?",
        answer: "Ixos is built with Rust and highly optimized. Peak RAM usage is around 194MB during active search. In idle state, it uses minimal resources and doesn't run background processes like traditional indexers.",
    },
    {
        question: "What is Journalist Mode?",
        answer: "Journalist Mode provides maximum privacy for sensitive searches. It uses encrypted temporary storage, disables all history and caching, and automatically wipes all traces after your search is complete. Perfect for investigative work or handling confidential documents.",
    },
];
