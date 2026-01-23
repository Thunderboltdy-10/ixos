import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// This is a placeholder for MDX-based documentation
// In production, you would use next-mdx-remote to render actual MDX files

const DOCS_CONTENT: Record<string, { title: string; content: string }> = {
    "getting-started": {
        title: "Getting Started",
        content: `
## Installation

Download Ixos from the [download page](/download) and install it for your platform.

## Your First Search

1. Launch Ixos
2. Select a folder to index (or use the default Documents folder)
3. Type a natural language query like "meeting notes from last week"
4. Press Enter to search

## Understanding Results

Results are ranked by semantic similarity. Each result shows:
- **Score**: How well the file matches your query (0-1)
- **Snippet**: The most relevant passage from the file
- **Evidence**: Why this result matched (Pro mode)
        `,
    },
    modes: {
        title: "Search Modes",
        content: `
## Flash Mode

The default mode. Uses Ixos-Flash-v2 for instant results.

- **Latency**: 181ms P50
- **Accuracy**: 0.766 MRR@10
- **Tier**: Free

## Auto Mode

Starts with Flash, then refines ambiguous queries.

- **Trigger**: When top results are close in score (gap < 0.05)
- **Fusion**: 0.33 semantic, 0.67 lexical weights
- **Accuracy**: 0.883 MRR@10
- **Tier**: Free (10/day), Pro (unlimited)

## Pro Mode

Maximum accuracy with evidence depth.

- **Reranker**: TinyBERT-L-2-v2
- **Evidence**: Full passage extraction
- **Tier**: Pro
        `,
    },
    privacy: {
        title: "Privacy & Security",
        content: `
## Local-First Architecture

Ixos runs entirely on your device:
- No cloud uploads
- No external API calls
- No telemetry

## Embedding Storage

Embeddings are stored in file metadata:
- **macOS/Linux**: Extended attributes (xattr)
- **Windows**: NTFS Alternate Data Streams (ADS)

Size: 225 bytes per file.

## Encryption

Optional XChaCha20-Poly1305 encryption for cached embeddings.

## Journalist Mode

For maximum privacy:
- Embeddings kept in memory only
- Auto-clear on exit
- Emergency wipe: Ctrl+Shift+Delete
        `,
    },
    cli: {
        title: "CLI Reference",
        content: `
## Basic Usage

\`\`\`bash
ixos search "your query" --dir /path/to/folder
\`\`\`

## Options

| Flag | Description |
|------|-------------|
| \`--dir\` | Directory to search |
| \`--cache-mode jit\` | Memory-only mode |
| \`--cache-mode cache\` | Persistent cache |
| \`--secure-timing\` | Enable timing protection |
| \`--show-scores\` | Display score breakdown |
| \`--json\` | JSON output |
| \`--progressive\` | Stream results |
| \`--journalist-mode\` | Maximum privacy |
| \`--context N\` | Show N lines of context |
        `,
    },
    configuration: {
        title: "Configuration",
        content: `
## Config File

Ixos looks for config at:
- **macOS**: \`~/.config/ixos/config.toml\`
- **Linux**: \`~/.config/ixos/config.toml\`
- **Windows**: \`%APPDATA%\\ixos\\config.toml\`

## Example Config

\`\`\`toml
[search]
default_mode = "auto"
max_results = 20

[cache]
mode = "persistent"
encryption = false

[ui]
theme = "dark"
show_scores = true
\`\`\`
        `,
    },
    faq: {
        title: "FAQ",
        content: `
## How is this different from Windows Search?

Windows Search only matches keywords. Ixos understands meaning.

## Does my data go to the cloud?

Never. Everything runs locally.

## What file types are supported?

Text, Markdown, JSON, source code. Pro adds PDF and DOCX.

## How much disk space does it use?

225 bytes per file for cached embeddings.
        `,
    },
};

export function generateStaticParams() {
    return Object.keys(DOCS_CONTENT).map((slug) => ({
        slug: [slug],
    }));
}

export function generateMetadata({ params }: { params: { slug: string[] } }): Metadata {
    const slug = params.slug?.[0] || "getting-started";
    const doc = DOCS_CONTENT[slug];
    return {
        title: `${doc?.title || "Documentation"} | Ixos Docs`,
    };
}

export default function DocPage({ params }: { params: { slug: string[] } }) {
    const slug = params.slug?.[0] || "getting-started";
    const doc = DOCS_CONTENT[slug];

    if (!doc) {
        return (
            <div className="min-h-screen bg-surface-0 pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-3xl">
                    <h1 className="text-4xl font-bold text-white mb-4">Page Not Found</h1>
                    <p className="text-content-secondary mb-8">
                        This documentation page doesn't exist yet.
                    </p>
                    <Link href="/docs" className="text-brand-teal hover:underline">
                        ← Back to Documentation
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-0 pt-24 pb-16">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.1)_0%,rgba(10,10,15,0)_50%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10 max-w-3xl">
                <Link
                    href="/docs"
                    className="inline-flex items-center gap-2 text-content-muted hover:text-brand-teal mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Documentation
                </Link>

                <h1 className="text-4xl font-display font-bold text-white mb-8">
                    {doc.title}
                </h1>

                <div
                    className="prose prose-invert prose-lg max-w-none
                        prose-headings:font-display prose-headings:text-white
                        prose-p:text-content-secondary prose-p:leading-relaxed
                        prose-a:text-brand-teal prose-a:no-underline hover:prose-a:underline
                        prose-code:bg-surface-1 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                        prose-pre:bg-surface-1 prose-pre:border prose-pre:border-white/5
                        prose-table:text-sm
                        prose-th:text-white prose-th:font-semibold
                        prose-td:text-content-secondary
                    "
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(doc.content) }}
                />
            </div>
        </div>
    );
}

// Simple markdown to HTML converter (for demo purposes)
// In production, use next-mdx-remote or similar
function markdownToHtml(markdown: string): string {
    return markdown
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-white mt-8 mb-4">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-white mt-6 mb-3">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="overflow-x-auto"><code>$2</code></pre>')
        .replace(/^\| (.*) \|$/gm, (match) => {
            const cells = match.split('|').filter(Boolean).map(c => c.trim());
            return `<tr>${cells.map(c => `<td class="px-4 py-2 border border-white/10">${c}</td>`).join('')}</tr>`;
        })
        .replace(/^\- (.*$)/gim, '<li class="text-content-secondary">$1</li>')
        .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-2 my-4">$&</ul>')
        .replace(/\n\n/g, '</p><p class="my-4">')
        .replace(/^(?!<[h|u|p|l|t|c])/gm, '<p class="my-4">')
        .replace(/<p class="my-4"><\/p>/g, '');
}
