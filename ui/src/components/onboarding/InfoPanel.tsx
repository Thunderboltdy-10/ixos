import { BookOpen, Zap, Shield, Cpu, Database, FileSearch, Layers, Gauge, Keyboard } from 'lucide-react';

const sections = [
  {
    title: 'Quick Start',
    icon: BookOpen,
    items: [
      'Pick a folder, then ask a question or type keywords.',
      'Use Flash/Auto/Pro to balance speed vs accuracy.',
      'Use JIT/Cache/Journalist to control privacy and storage.',
      'Open results, inspect evidence, and star searches you revisit.',
    ],
  },
  {
    title: 'Search Abilities',
    icon: FileSearch,
    items: [
      'Hybrid cascade: fast lexical + semantic rerank + evidence.',
      'Question-aware search (rewrites natural language into search intent).',
      'Semantic reranking with path and directory priors.',
      'Evidence extraction: best passage + context snippet + path tags.',
      'Streaming results with progressive stages and late insights.',
    ],
  },
  {
    title: 'Supported Files',
    icon: Layers,
    items: [
      'Text/code: txt, md, json, yaml, toml, rs, py, js, ts, and more.',
      'Documents: PDF, DOCX, XLSX (parsed lazily for evidence and semantic).',
      'Large files are capped for speed; use narrower queries for deep hits.',
    ],
  },
  {
    title: 'Quality Modes',
    icon: Zap,
    items: [
      'Flash: fastest Model2Vec search for instant feedback.',
      'Auto: Flash + Pro refinement on ambiguous queries.',
      'Pro: always runs the highest quality rerank.',
    ],
  },
  {
    title: 'Privacy & Security',
    icon: Shield,
    items: [
      'JIT mode keeps embeddings only in memory.',
      'Cache mode stores embeddings in ADS/xattr for faster repeat searches.',
      'Journalist mode forces maximum privacy and auto-clears.',
      'Integrity checks + secure timing protect sensitive workflows.',
    ],
  },
  {
    title: 'Performance & Pipeline',
    icon: Gauge,
    items: [
      'Hard caps: max candidates, bytes per file, and text length.',
      'Batch embedding for throughput and lower latency.',
      'Directory centroids + topology boosts resolve ambiguity.',
      'FSTD topology rerank auto-enables when adapter is available.',
    ],
  },
  {
    title: 'FSTD (Topology Boost)',
    icon: Cpu,
    items: [
      'Auto-enabled if an adapter exists at models/fstd/adapter.json.',
      'Best for well-structured folders (Finance vs Ops, Projects vs Personal).',
      'No UI toggle yet; use logs (RUST_LOG=debug) to verify activation.',
    ],
  },
  {
    title: 'UI & Workflow Features',
    icon: Database,
    items: [
      'Starred searches, history recall, and stats panel.',
      'Late insights badge for results found after first pass.',
      'Global shortcut (Ctrl+Space) to open Ixos quickly.',
      'Settings for search, privacy, compliance, and keyboard.',
    ],
  },
  {
    title: 'Keyboard & Commands',
    icon: Keyboard,
    items: [
      'Enter to search, Esc to cancel, arrows to navigate results.',
      'CLI: ixos search, ixos index, ixos config, ixos compliance.',
      'Use --progressive and --show-scores for deeper analysis.',
    ],
  },
];

export function InfoPanel() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h3 className="text-xl font-semibold text-porcelain">Everything Ixos Can Do</h3>
        <p className="text-fg-muted">
          This guide is your full map of features, modes, and advanced capabilities.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-graphite-1 border border-stroke-hairline rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-graphite-2 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-accent-teal" />
                </div>
                <h4 className="text-base font-semibold text-porcelain">{section.title}</h4>
              </div>
              <ul className="space-y-2 text-sm text-fg-muted">
                {section.items.map((item) => (
                  <li key={item} className="leading-relaxed">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="bg-graphite-2 border border-stroke-hairline rounded-xl p-6">
        <h4 className="text-base font-semibold text-porcelain mb-3">Testing & Benchmarking</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-fg-muted">
          <div>
            <p className="font-semibold text-porcelain mb-1">Run Tests</p>
            <code className="block bg-graphite-1 border border-stroke-hairline rounded-md px-3 py-2 text-xs text-porcelain">
              cargo test --lib
            </code>
          </div>
          <div>
            <p className="font-semibold text-porcelain mb-1">Run Benchmarks</p>
            <code className="block bg-graphite-1 border border-stroke-hairline rounded-md px-3 py-2 text-xs text-porcelain">
              cargo bench
            </code>
          </div>
          <div>
            <p className="font-semibold text-porcelain mb-1">Model Evaluation</p>
            <code className="block bg-graphite-1 border border-stroke-hairline rounded-md px-3 py-2 text-xs text-porcelain">
              python scripts/ixos_eval.py --suite both
            </code>
          </div>
          <div>
            <p className="font-semibold text-porcelain mb-1">Perf Baseline</p>
            <code className="block bg-graphite-1 border border-stroke-hairline rounded-md px-3 py-2 text-xs text-porcelain">
              cargo bench --bench search_e2e
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
