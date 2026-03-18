"use client";

import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";

const STEPS = [
  {
    num: "01",
    title: "Index",
    desc: "Point Ixos at any folder. It scans your files in milliseconds — documents, spreadsheets, code, PDFs, and more.",
    color: "#F6B94C",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M4 8h20v14a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="#F6B94C" strokeWidth="1.5" strokeOpacity="0.6" />
        <path d="M4 8V6a2 2 0 012-2h6l2 4H4z" stroke="#F6B94C" strokeWidth="1.5" strokeOpacity="0.6" />
        <path d="M10 15h8M10 18h5" stroke="#F6B94C" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Map",
    desc: "A local semantic model maps meaning across your documents. Embeddings are cached and cryptographically signed on your device.",
    color: "#14B8A6",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="3" stroke="#14B8A6" strokeWidth="1.5" strokeOpacity="0.6" />
        <circle cx="6" cy="8" r="2" stroke="#14B8A6" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="22" cy="8" r="2" stroke="#14B8A6" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="6" cy="20" r="2" stroke="#14B8A6" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="22" cy="20" r="2" stroke="#14B8A6" strokeWidth="1" strokeOpacity="0.4" />
        <path d="M8 9l4 3.5M20 9l-4 3.5M8 19l4-3.5M20 19l-4-3.5" stroke="#14B8A6" strokeWidth="0.8" strokeOpacity="0.3" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Find",
    desc: "Search naturally. Get ranked results with evidence — file, line, snippet, and a full score breakdown you can verify.",
    color: "#7C5CFF",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="12" cy="12" r="7" stroke="#7C5CFF" strokeWidth="1.5" strokeOpacity="0.6" />
        <path d="M17.5 17.5L23 23" stroke="#7C5CFF" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
        <path d="M9 12h6M12 9v6" stroke="#7C5CFF" strokeWidth="1" strokeOpacity="0.35" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative z-10 py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeInView direction="up">
          <div className="text-center mb-16">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/60 mb-4">
              ▸ How It Works
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold font-display text-white"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              Three steps to instant search.
            </h2>
          </div>
        </FadeInView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <FadeInView key={step.num} direction="up" delay={i * 140}>
              <div
                className="relative p-8 border h-full group"
                style={{
                  borderColor: `${step.color}22`,
                  background: `${step.color}04`,
                  transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${step.color}44`;
                  e.currentTarget.style.boxShadow = `0 0 40px ${step.color}12`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${step.color}22`;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <CornerBrackets size={12} color={`${step.color}30`} />

                {/* Step number + icon row */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="text-4xl font-bold font-display opacity-15"
                    style={{ color: step.color }}
                  >
                    {step.num}
                  </div>
                  <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                    {step.icon}
                  </div>
                </div>

                <h3
                  className="text-2xl font-semibold font-display mb-3"
                  style={{ color: step.color }}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </FadeInView>
          ))}
        </div>

        {/* Connecting line (desktop only) */}
        <div className="hidden md:block relative h-0 -mt-[calc(50%+24px)]">
          <div className="absolute top-1/2 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-[#F6B94C22] via-[#14B8A622] to-[#7C5CFF22]" />
        </div>
      </div>
    </section>
  );
}
