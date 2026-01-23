import verified from "./verified-benchmarks.json";

export const VERIFIED_BENCHMARKS = verified as const;

// Feature list with verified claims only
export const VERIFIED_FEATURES = [
    {
        id: "ttfr",
        title: "Fast First Result",
        metric: VERIFIED_BENCHMARKS.latency.ttfrP50,
        description: "Time to first result on the real corpus baseline.",
        verified: true,
    },
    {
        id: "cache-mode",
        title: "Warm Cache Speed",
        metric: VERIFIED_BENCHMARKS.cacheMode.p95Total,
        description: "P95 total latency once embeddings are cached.",
        verified: true,
    },
    {
        id: "jit-mode",
        title: "JIT Baseline",
        metric: VERIFIED_BENCHMARKS.jitMode.p95Total,
        description: "P95 total latency with zero persistent index.",
        verified: true,
    },
    {
        id: "cache-hit",
        title: "Cache Hit Rate",
        metric: VERIFIED_BENCHMARKS.cacheMode.hitRate,
        description: "Observed embedding cache hit rate in cache mode.",
        verified: true,
    },
] as const;

// Mode descriptions for the Modes section
export const SEARCH_MODES = [
    {
        name: "Flash",
        tagline: "Default for daily use",
        tier: "Free",
        description:
            "Ixos-Flash-v2 runs on every query. Model2Vec embeddings optimized for CPU inference.",
        stats: [
            { label: "TTFR P50", value: VERIFIED_BENCHMARKS.latency.ttfrP50 },
            { label: "P95 Total (JIT)", value: VERIFIED_BENCHMARKS.latency.totalP95Jit },
            { label: "P95 Total (Cache)", value: VERIFIED_BENCHMARKS.latency.totalP95Cache },
        ],
    },
    {
        name: "Auto",
        tagline: "Smart refinement",
        tier: "Free (limits), Pro unlimited",
        description:
            "Auto mode starts with Flash results and refines when needed. Same baseline timings; refinement adds extra work.",
        stats: [
            { label: "Baseline TTFR", value: VERIFIED_BENCHMARKS.latency.ttfrP50 },
            { label: "Baseline P95", value: VERIFIED_BENCHMARKS.latency.totalP95Jit },
            { label: "Refine", value: "Depends on query" },
        ],
    },
    {
        name: "Pro",
        tagline: "Maximum accuracy",
        tier: "Pro",
        description:
            "Pro mode applies deeper refinement steps and evidence extraction for power users.",
        stats: [
            { label: "Baseline TTFR", value: VERIFIED_BENCHMARKS.latency.ttfrP50 },
            { label: "Baseline P95", value: VERIFIED_BENCHMARKS.latency.totalP95Jit },
            { label: "Depth", value: "Evidence + rerank" },
        ],
    },
] as const;
