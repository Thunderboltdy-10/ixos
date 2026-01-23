/**
 * Verified benchmarks from IXOS_MODEL_LAB_REPORT.md
 *
 * IMPORTANT: Only use these numbers in marketing materials.
 * Do not make up or estimate any other performance claims.
 *
 * Last updated: 2026-01-18
 * Source: /IXOS_MODEL_LAB_REPORT.md
 */

export const VERIFIED_BENCHMARKS = {
    // Source documentation
    source: 'IXOS_MODEL_LAB_REPORT.md',
    lastUpdated: '2026-01-18',

    // Test corpus specifications
    testCorpus: {
        files: 1000,
        totalSize: '2.46 MB',
        avgFileSize: '2,581 bytes',
    },

    // Time to First Result (TTFR)
    latency: {
        ttfrP50: '181ms',
        ttfrP95: '190-192ms',
        ttfrP99: '190-192ms',
        totalSearchP50: '184-578ms', // depends on cache mode
        totalSearchP95: '420-1918ms', // cache vs JIT
    },

    // Cache performance
    cacheMode: {
        p95Total: '420ms',
        hitRate: '80%',
        embeddingTime: '0ms', // cached
    },

    jitMode: {
        p95Total: '1918ms',
        hitRate: '22.5%',
        candidatesEmbedded: 57, // average
    },

    // Model accuracy
    accuracy: {
        flashMRR10: '0.766',
        flashRecall10: '0.875',
        flashLatencyPer1k: '417.49ms',
        autoMRR10: '0.883', // with fusion
        realCorpusMRR10: '0.766',
    },

    // Comparative claims
    comparisons: {
        vsTransformer: '500x faster',
        int8Quantization: {
            sizeReduction: '4x smaller',
            throughputGain: '2x throughput',
        },
    },

    // Stage breakdown (P95)
    stageBreakdown: {
        directoryWalk: '75-80ms',
        pathScoring: '0ms',
        ripgrepScan: '177-190ms',
        candidateSelection: '14ms',
        embedding: '0-1406ms', // depends on mode
        ranking: '7-321ms',
    },

    // Reranker performance
    reranker: {
        model: 'cross-encoder/ms-marco-TinyBERT-L-2-v2',
        mrr10: '0.8562',
        latencyPer1k: '339.58ms',
        cap: 150,
    },
} as const;

// Feature list with verified claims only
export const VERIFIED_FEATURES = [
    {
        id: 'flash-mode',
        title: 'Flash Mode',
        metric: '181ms P50',
        description: 'Ixos-Flash-v2 delivers instant results using Model2Vec embeddings optimized for CPU.',
        verified: true,
    },
    {
        id: 'auto-mode',
        title: 'Auto Mode',
        metric: '0.88 MRR@10',
        description: 'Automatically refines ambiguous queries using learned fusion weights (0.33 semantic / 0.67 lexical).',
        verified: true,
    },
    {
        id: 'offline-first',
        title: '100% Offline',
        metric: 'Zero cloud',
        description: 'Your files never leave your device. No cloud uploads, no external API calls.',
        verified: true,
    },
    {
        id: 'evidence-rendering',
        title: 'Evidence Rendering',
        metric: 'Score + passages',
        description: 'See why each result matched with score breakdowns and relevant text snippets.',
        verified: true,
    },
    {
        id: 'zero-storage',
        title: 'Zero Database',
        metric: '225 bytes/file',
        description: 'No PostgreSQL or vector DB to maintain. Embeddings cached in file metadata (xattr/ADS).',
        verified: true,
    },
    {
        id: 'encryption',
        title: 'Optional Encryption',
        metric: 'XChaCha20',
        description: 'Optional encryption at rest for sensitive indices. Your data, your key.',
        verified: true,
    },
] as const;

// Mode descriptions for the Modes section
export const SEARCH_MODES = [
    {
        name: 'Flash',
        tagline: 'Default for daily use',
        tier: 'Free',
        description: 'Ixos-Flash-v2 runs on every query. Uses Model2Vec with 512-dim float16 embeddings, optimized for CPU inference.',
        stats: [
            { label: 'P50 Latency', value: '181ms' },
            { label: 'MRR@10', value: '0.766' },
            { label: 'Recall@10', value: '0.875' },
        ],
    },
    {
        name: 'Auto',
        tagline: 'Smart refinement',
        tier: 'Free (10/day), Pro unlimited',
        description: 'Flash + learned fusion weights. Triggers when query is ambiguous (gap < 0.05, short query, low lexical max). Blends semantic (0.33) and lexical (0.67) signals.',
        stats: [
            { label: 'MRR@10', value: '0.883' },
            { label: 'Refinement', value: 'Top-120' },
            { label: 'Fusion', value: '0.33/0.67' },
        ],
    },
    {
        name: 'Pro',
        tagline: 'Maximum accuracy',
        tier: 'Pro',
        description: 'Full fusion policy with evidence depth, advanced filters, and optional TinyBERT reranker for top-K results.',
        stats: [
            { label: 'Reranker', value: 'TinyBERT-L-2' },
            { label: 'Rerank MRR', value: '0.856' },
            { label: 'Evidence', value: 'Full depth' },
        ],
    },
] as const;
