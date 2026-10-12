"use client";

import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";

const USE_CASES = [
  {
    persona: "Researchers",
    headline: "Find that paper you read last month",
    desc: "Search across your entire library of PDFs, notes, and data files by meaning — not just title or keyword.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
    accent: "#14B8A6",
  },
  {
    persona: "Operators",
    headline: "Surface the runbook before the page fires",
    desc: "Instantly locate runbooks, configs, and incident docs across sprawling ops repos when seconds matter.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    accent: "#F6B94C",
  },
  {
    persona: "Students",
    headline: "Search across all your course notes at once",
    desc: "One search bar for lecture notes, textbook highlights, assignments, and research — every semester, every class.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
      </svg>
    ),
    accent: "#7C5CFF",
  },
  {
    persona: "Creatives",
    headline: "Locate that design file from three projects ago",
    desc: "Find mockups, briefs, and assets by describing what you remember — not the filename you forgot.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="13.5" cy="6.5" r="2.5" />
        <path d="M3 20c0 0 5-8 9-8s9 8 9 8" />
        <circle cx="7" cy="12" r="1.5" />
      </svg>
    ),
    accent: "#F472B6",
  },
  {
    persona: "Developers",
    headline: "Semantic code search across your entire codebase",
    desc: "Find implementations by intent, not just symbol names. Hybrid lexical + semantic ranking surfaces what grep misses.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    accent: "#14B8A6",
  },
  {
    persona: "Legal",
    headline: "Instantly find clauses across thousands of contracts",
    desc: "Search through contracts, filings, and reports by concept — find every indemnification clause in seconds.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    accent: "#F6B94C",
  },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="relative z-10 py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeInView direction="up">
          <div className="text-center mb-16">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/60 mb-4">
              ▸ Use Cases
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold font-display text-white"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              Built for how you actually work.
            </h2>
            <p className="mt-4 text-white/45 text-sm max-w-xl mx-auto leading-relaxed">
              Ixos doesn&apos;t care if you&apos;re searching code, contracts,
              or course notes. It finds what matters.
            </p>
          </div>
        </FadeInView>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {USE_CASES.map((uc, i) => (
            <FadeInView key={uc.persona} direction="up" delay={i * 80}>
              <div
                className="relative p-7 border h-full group cursor-default"
                style={{
                  borderColor: `${uc.accent}18`,
                  background: `${uc.accent}03`,
                  transition:
                    "border-color 0.3s, background 0.3s, box-shadow 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${uc.accent}40`;
                  e.currentTarget.style.background = `${uc.accent}08`;
                  e.currentTarget.style.boxShadow = `inset 0 1px 0 ${uc.accent}15, 0 0 30px ${uc.accent}08`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${uc.accent}18`;
                  e.currentTarget.style.background = `${uc.accent}03`;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <CornerBrackets size={10} color={`${uc.accent}20`} />

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="opacity-50 group-hover:opacity-90 transition-opacity"
                    style={{ color: uc.accent }}
                  >
                    {uc.icon}
                  </div>
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.15em] font-semibold"
                    style={{ color: `${uc.accent}` }}
                  >
                    {uc.persona}
                  </span>
                </div>

                <h3 className="text-lg font-semibold font-display text-white/90 mb-2 leading-snug">
                  {uc.headline}
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  {uc.desc}
                </p>
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}
