export const SITE_CONFIG = {
    name: "Ixos",
    description: "Search by meaning, not just filenames. Local-first semantic file search.",
    version: "0.2.0",
    links: {
        github: "https://github.com/ixos-protocol/ixos",
        docs: "/docs",
        twitter: "https://twitter.com/ixos_protocol",
        discord: "https://discord.gg/ixos",
    },
};

export const PRICING_TIERS = [
    {
        name: "Free",
        price: "€0",
        description: "Flash mode for personal use",
        features: [
            "Flash mode (Ixos-Flash-v2)",
            "10 Auto refines per day",
            "Up to 10,000 indexed files",
            "Text, Markdown, JSON, Code",
            "No telemetry, 100% offline",
        ],
        cta: "Download Free",
        ctaHref: "/download",
        popular: false,
    },
    {
        name: "Pro",
        price: "€10",
        period: "/month",
        description: "Unlimited Auto + evidence depth",
        features: [
            "Everything in Free",
            "Unlimited Auto refines",
            "Evidence depth + explanations",
            "Advanced filters (date, type, folder)",
            "PDF, DOCX support",
            "Priority updates",
        ],
        cta: "Start Pro",
        ctaHref: "/pricing",
        popular: true,
    },
    {
        name: "Team",
        price: "Contact",
        description: "Enterprise compliance and support",
        features: [
            "Everything in Pro",
            "Cryptographic attestation",
            "EU AI Act compliance reports",
            "Audit logs",
            "SSO integration",
            "Dedicated support",
        ],
        cta: "Contact Sales",
        ctaHref: "mailto:team@ixos.app",
        popular: false,
    },
];

// Features for the grid section - verified claims only
export const FEATURES = [
    {
        id: "flash-mode",
        title: "Flash Mode",
        subtitle: "181ms P50 latency",
        description: "Ixos-Flash-v2 delivers instant results using Model2Vec embeddings optimized for CPU inference.",
        icon: "zap",
    },
    {
        id: "auto-mode",
        title: "Auto Refinement",
        subtitle: "0.88 MRR@10",
        description: "Automatically refines ambiguous queries using learned fusion weights.",
        icon: "sparkles",
    },
    {
        id: "offline",
        title: "100% Offline",
        subtitle: "Zero cloud",
        description: "Your files never leave your device. No cloud uploads, no external API calls.",
        icon: "wifi-off",
    },
    {
        id: "evidence",
        title: "Evidence Rendering",
        subtitle: "Score + passages",
        description: "See why each result matched with score breakdowns and relevant text snippets.",
        icon: "file-search",
    },
    {
        id: "zero-db",
        title: "Zero Database",
        subtitle: "225 bytes/file",
        description: "No PostgreSQL or vector DB to maintain. Embeddings cached in file metadata.",
        icon: "database",
    },
    {
        id: "encryption",
        title: "Optional Encryption",
        subtitle: "XChaCha20",
        description: "Optional encryption at rest for sensitive indices. Your data, your key.",
        icon: "lock",
    },
];

// Release info for download page
export const RELEASES = {
    latest: "0.2.0",
    date: "2026-01-15",
    platforms: {
        windows: {
            name: "Windows",
            filename: "ixos-0.2.0-x64.msi",
            size: "~45 MB",
            requirements: "Windows 10/11 (x64)",
            available: true,
        },
        macos: {
            name: "macOS",
            filename: "ixos-0.2.0-universal.dmg",
            size: "~50 MB",
            requirements: "macOS 12+ (Intel & Apple Silicon)",
            available: true,
        },
        linux: {
            name: "Linux",
            filename: "ixos-0.2.0-x64.AppImage",
            size: "~48 MB",
            requirements: "Ubuntu 20.04+, Fedora 35+, Arch",
            available: true,
            alternatives: {
                deb: "ixos-0.2.0-x64.deb",
                rpm: "ixos-0.2.0-x64.rpm",
            },
        },
    },
};

// FAQ items
export const FAQ_ITEMS = [
    {
        question: "How is this different from Windows Search or Spotlight?",
        answer: "Traditional OS search only matches filenames and basic content keywords. Ixos understands meaning - search for 'quarterly report from march' and find 'Q1_2026_financial_summary.xlsx' even if those exact words aren't in the filename.",
    },
    {
        question: "Does Ixos send my files to the cloud?",
        answer: "Never. Ixos runs 100% locally on your device. Embeddings are generated on your CPU using Ixos-Flash-v2. No internet connection required after installation.",
    },
    {
        question: "What's the difference between Flash and Auto mode?",
        answer: "Flash mode runs Ixos-Flash-v2 on every query for instant results. Auto mode starts with Flash, then refines ambiguous queries in the background for higher accuracy.",
    },
    {
        question: "How much disk space does the index use?",
        answer: "Ixos stores embeddings in file metadata (xattr on macOS/Linux, ADS on Windows). There is no separate database or index directory.",
    },
    {
        question: "What file types are supported?",
        answer: "Free: Text, Markdown, JSON, and source code files. Pro: Adds PDF and DOCX support. We're actively adding more formats.",
    },
    {
        question: "Can I use Ixos on multiple devices?",
        answer: "Yes. Free tier works on unlimited devices. Pro licenses include activation for up to 3 devices. Team licenses support 10+ devices per user.",
    },
];
