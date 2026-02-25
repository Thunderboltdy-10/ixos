"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

export function AccordionFAQ() {
    const [open, setOpen] = useState<number | null>(0);

    const faqs = [
        {
            q: "What does 'JIT Search' actually mean?",
            a: "Just-In-Time evaluation. Instead of a background daemon indexing your files constantly and saving a massive database file on your hard drive, Ixos performs the parsing, embedding, and ranking at the exact moment you execute a query. Fast enough that it feels instantaneous. The resulting memory buffer is immediately wiped."
        },
        {
            q: "Is any data sent to the cloud?",
            a: "None. Zero kilobytes. Your file content, metadata, query text, and search habits remain entirely on your local silicon. There's no telemetry engine hidden in the background."
        },
        {
            q: "Which file formats are supported?",
            a: "Ixos handles all standard developer formats natively: Markdown, JSON, CSV, and source code (.rs, .ts, .py, .go, etc). We also parse complex document formats like PDF, DOCX, and PPTX locally."
        },
        {
            q: "How does Ixos compare to Windows Search?",
            a: "Windows Search relies on a ubiquitous background indexer that often maxes out disk I/O when you don't expect it. Ixos runs on demand using dense vector representations, giving you semantic understanding instead of just exact-match keyword hits."
        }
    ];

    return (
        <section id="faq" className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">
            <div className="col-span-1 lg:col-span-4 p-8 md:p-16 border-b lg:border-b-0 lg:border-r border-white/20 bg-white text-[#0E1117] flex flex-col justify-center">
                <h2 className="text-5xl md:text-7xl font-bold font-display uppercase tracking-tighter mb-8 leading-[0.9]">
                    Common<br />Inquiries
                </h2>
                <p className="font-mono text-sm leading-relaxed max-w-sm opacity-80">
                    Technical specifications and privacy guarantees regarding the Ixos local search engine.
                </p>
            </div>

            <div className="col-span-1 lg:col-span-8 flex flex-col justify-center border-b lg:border-b-0 border-white/20 px-8 py-16 md:p-16 lg:p-32 max-w-5xl mx-auto w-full">
                <div className="border-t border-white/20">
                    {faqs.map((faq, i) => (
                        <div key={i} className="border-b border-white/20">
                            <button
                                onClick={() => setOpen(open === i ? null : i)}
                                className="w-full py-8 flex justify-between items-center text-left group gap-8"
                            >
                                <span className="font-display text-2xl md:text-4xl font-bold text-white uppercase tracking-tighter group-hover:text-[#F6B94C] transition-colors">
                                    {i < 9 ? `0${i + 1}` : i + 1}. {faq.q}
                                </span>
                                <span className="flex-shrink-0 w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#F6B94C] group-hover:text-[#F6B94C] transition-colors text-white/50">
                                    {open === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </span>
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${open === i ? "max-h-96 opacity-100 mb-8" : "max-h-0 opacity-0"}`}
                            >
                                <div className="pl-0 md:pl-16 max-w-2xl font-mono text-sm text-white/60 leading-relaxed border-l-2 border-[#F6B94C] pl-6 ml-2 md:ml-0">
                                    {faq.a}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
