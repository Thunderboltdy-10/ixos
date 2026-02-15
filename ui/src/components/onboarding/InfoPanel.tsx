import { useState } from 'react';
import { BookOpen, Zap, Shield, Cpu, Database, FileSearch, Layers, Gauge, Keyboard, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const sections = [
  {
    title: 'Quick Start',
    icon: BookOpen,
    items: [
      'Pick a folder, then ask a question or type keywords.',
      'Use Ixos Flash/Auto/Ixos Pro to balance speed vs accuracy.',
      'Use Memory/Local/Deep Search to control privacy, caching, and evidence depth.',
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
      'Ixos Flash: fastest Model2Vec search for instant feedback.',
      'Auto: Flash + Pro refinement on ambiguous queries.',
      'Ixos Pro: always runs the highest quality rerank.',
    ],
  },
  {
    title: 'Ask Mode (Pro)',
    icon: Sparkles,
    items: [
      'Ask Mode is activated by question intent (not only question marks).',
      'Typo-tolerant intent detection catches imperfect prompts.',
      'Results emphasize evidence passages and answer cards with confidence.',
      'If Pro is unavailable, Ixos falls back to standard semantic search.',
    ],
  },
  {
    title: 'Today + Workstreams (Pro)',
    icon: Layers,
    items: [
      'Today summarizes recent file activity and suggested next files.',
      'Workstreams are built from local search/open events and can be seeded manually.',
      'Connection maps visualize how files relate across folders.',
      'Move recommendations appear when repeat behavior suggests a better folder structure.',
    ],
  },
  {
    title: 'Privacy & Security',
    icon: Shield,
    items: [
      'Memory mode keeps embeddings only in memory.',
      'Local mode stores embeddings in ADS/xattr for faster repeat searches.',
      'Deep Search prioritizes richer evidence extraction while staying local.',
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
      'Global shortcut (Ctrl+Space) to open Ixos from anywhere.',
      'Ctrl+K opens the command palette for quick actions and history.',
      'Settings for search, privacy, compliance, and keyboard.',
    ],
  },
  {
    title: 'Keyboard & Commands',
    icon: Keyboard,
    items: [
      'Ctrl+K: Command palette (search history, quick actions, navigation).',
      'Ctrl+T: New search tab.',
      'Enter to search, Esc to cancel, arrows to navigate results.',
      'CLI: ixos search, ixos index, ixos config, ixos compliance.',
    ],
  },
];

export function InfoPanel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextStep = () => {
    if (currentIndex < sections.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const currentSection = sections[currentIndex];
  const Icon = currentSection.icon;

  return (
    <div className="flex flex-col h-full bg-graphite-1/95 backdrop-blur-xl border border-stroke-hairline rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-stroke-hairline/50">
        <div>
          <h3 className="text-lg font-display text-porcelain mb-1">Guide</h3>
          <p className="text-xs text-fg-secondary font-mono">
            {currentIndex + 1} <span className="text-fg-muted">/</span> {sections.length}
          </p>
        </div>
      </div>

      {/* Content Carousel */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 min-h-[300px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-lg"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-graphite-2 to-graphite-1 border border-stroke-hairline flex items-center justify-center shadow-lift">
                <Icon className="w-8 h-8 text-accent-teal" />
              </div>

              <h2 className="text-2xl font-semibold text-porcelain">{currentSection.title}</h2>

              <ul className="space-y-4 text-left w-full bg-graphite-2/55 rounded-xl p-6 border border-white/[0.03]">
                {currentSection.items.map((item, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-teal/40 mt-2 flex-shrink-0 group-hover:bg-accent-teal transition-colors duration-300" />
                    <span className="text-sm text-fg-secondary leading-relaxed group-hover:text-porcelain transition-colors duration-300">
                      {item}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer / Controls */}
      <div className="p-6 border-t border-stroke-hairline/50 flex items-center justify-between bg-graphite-1/30">
        <button
          onClick={prevStep}
          disabled={currentIndex === 0}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            currentIndex === 0
              ? "text-fg-muted cursor-not-allowed opacity-50"
              : "text-fg-secondary hover:text-porcelain hover:bg-graphite-2"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex gap-1.5">
          {sections.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                idx === currentIndex ? "bg-accent-teal w-4" : "bg-fg-dim/30"
              )}
            />
          ))}
        </div>

        <button
          onClick={nextStep}
          disabled={currentIndex === sections.length - 1}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            currentIndex === sections.length - 1
              ? "text-fg-dim cursor-not-allowed opacity-50"
              : "text-porcelain bg-accent-teal/10 hover:bg-accent-teal/20 hover:text-accent-teal"
          )}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
