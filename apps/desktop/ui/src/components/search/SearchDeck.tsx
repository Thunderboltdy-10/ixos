import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useSearchStore } from "@/stores/searchStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
const ACCENTS = {
  code: {
    dot: "bg-accent-teal",
    sonar: "bg-accent-teal",
    text: "text-accent-teal",
    activeBorder: "border-accent-teal/40",
    activeBg: "bg-accent-teal/10",
    dotBorder: "border-accent-teal bg-accent-teal",
    bar: "var(--accent-teal)",
  },
  documents: {
    dot: "bg-accent-amber",
    sonar: "bg-accent-amber",
    text: "text-accent-amber",
    activeBorder: "border-accent-amber/40",
    activeBg: "bg-accent-amber/10",
    dotBorder: "border-accent-amber bg-accent-amber",
    bar: "var(--accent-amber)",
  },
};
const formatDuration = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
export function SearchDeck() {
  const search = useSearchStore();
  const { config, locations } = useSettingsStore();
  const warming = locations.find(
    (location) => !["ready", "error"].includes(location.stage),
  );
  const phase =
    search.phase === "idle" && warming ? warming.stage : search.phase;
  const profile = config?.search.profile ?? "code";
  const accent = ACCENTS[profile];
  const underlineRef = useRef<HTMLDivElement>(null);
  const setDeckUnderlineBox = useLayoutStore(
    (state) => state.setDeckUnderlineBox,
  );
  const [now, setNow] = useState(Date.now());
  const active = ["discover", "lexical", "semantic"].includes(phase);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    const measure = () => {
      const rect = underlineRef.current?.getBoundingClientRect();
      if (rect)
        setDeckUnderlineBox({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (underlineRef.current) observer.observe(underlineRef.current);
    return () => observer.disconnect();
  }, [phase, setDeckUnderlineBox]);
  if (phase === "idle") return null;
  const stageIndex = ["discover", "lexical", "semantic", "complete"].indexOf(
    phase,
  );
  const isComplete = phase === "complete";
  const stats = search.streamStats;
  const resultCount = search.results.length;
  const displayElapsedMs = search.searchStartTime
    ? Math.max(0, (search.searchEndTime ?? now) - search.searchStartTime)
    : 0;
  const modeBadge = profile === "code" ? "Code" : "Documents";
  const statusMessage =
    warming && search.phase === "idle"
      ? "Warming chosen locations"
      : {
          discover: "Discovering files",
          lexical: "Keyword results ready",
          semantic: "Refining with semantic search",
          complete: "Search complete",
          cancelled: "Search cancelled",
          error: "Search stopped",
          idle: "Ready",
          ready: "Ready",
        }[phase];
  const animatedProgress = Math.max(0, stageIndex) / 3;
  const pipelineSteps = [
    {
      key: "discover",
      label: "Discover",
      detail: stats
        ? `${stats.searchableFiles} searchable files`
        : "Chosen locations",
    },
    {
      key: "lexical",
      label: "Lexical",
      detail: stats
        ? `${stats.lexicalCandidates} candidates`
        : "Keyword matches",
    },
    {
      key: "semantic",
      label: "Semantic",
      detail: stats
        ? `${stats.passagesEmbedded} passages embedded`
        : "Hybrid ranking",
    },
    { key: "complete", label: "Complete", detail: `${resultCount} results` },
  ].map((step, index) => ({
    ...step,
    state:
      index < stageIndex || isComplete
        ? "done"
        : index === stageIndex
          ? "active"
          : "pending",
  }));
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="mt-4 w-full overflow-hidden rounded-lg border border-stroke-hairline bg-graphite-1"
      >
        <div className="px-4 pb-2 pt-3">
          <div className="flex items-center gap-3">
            {/* Sonar dot — mode-colored */}
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {!isComplete && (
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full animate-sonar",
                    accent.sonar,
                  )}
                />
              )}
              <span
                className={cn(
                  "relative h-2.5 w-2.5 rounded-full",
                  isComplete ? "bg-success" : accent.dot,
                )}
              />
            </span>
            <span className="flex-1 truncate text-sm font-medium text-porcelain">
              {statusMessage}
            </span>
            <div className="flex items-center gap-3 text-xs font-mono text-fg-ghost">
              {resultCount > 0 && (
                <span className="tabular-nums">{resultCount} results</span>
              )}
              {displayElapsedMs > 0 && (
                <span className="tabular-nums">
                  {formatDuration(displayElapsedMs)}
                </span>
              )}
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-2xs bg-graphite-2",
                  accent.text,
                )}
              >
                {modeBadge}
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline steps — mode-colored accents */}
        <div className="grid grid-cols-1 gap-2 px-4 pb-3 md:grid-cols-4">
          {pipelineSteps.map((step) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0.5, y: 4 }}
              animate={
                step.state === "active"
                  ? { opacity: 1, y: 0, scale: [1, 1.015, 1] }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              transition={
                step.state === "active"
                  ? {
                      scale: {
                        repeat: Infinity,
                        duration: 2,
                        ease: "easeInOut",
                      },
                      opacity: { duration: 0.2 },
                    }
                  : { duration: 0.2 }
              }
              className={cn(
                "rounded-md border px-3 py-2",
                step.state === "active"
                  ? `${accent.activeBorder} ${accent.activeBg}`
                  : step.state === "done"
                    ? "border-white/10 bg-graphite-2/60"
                    : "border-white/5 bg-graphite-2/35",
              )}
            >
              <div className="flex items-center gap-2 text-xs">
                {step.state === "done" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <Check className="h-3.5 w-3.5 text-success" />
                  </motion.div>
                ) : (
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                    {step.state === "active" && (
                      <span
                        className={cn(
                          "absolute inline-flex h-full w-full rounded-full animate-sonar",
                          accent.sonar,
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative h-2.5 w-2.5 rounded-full border",
                        step.state === "active"
                          ? accent.dotBorder
                          : "border-fg-ghost/40 bg-transparent",
                      )}
                    />
                  </span>
                )}
                <span
                  className={cn(
                    "font-medium",
                    step.state === "active" ? accent.text : "text-fg-muted",
                  )}
                >
                  {step.label}
                </span>
              </div>
              <div className="mt-1 truncate text-2xs text-fg-dim">
                {step.detail}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress bar — mode-colored, green when done */}
        <div
          ref={underlineRef}
          className="relative h-[3px] w-full overflow-hidden bg-graphite-3"
        >
          <div className="absolute inset-0 bg-graphite-2" />
          <motion.div
            className="absolute left-0 top-0 h-full overflow-hidden"
            style={{
              background: isComplete
                ? "var(--accent-success)"
                : `linear-gradient(90deg, ${accent.bar} 0%, ${accent.bar} 65%, ${accent.bar} 100%)`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${animatedProgress * 100}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {!isComplete && (
              <div
                className="absolute inset-0 animate-progress-shimmer"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                  width: "100%",
                }}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
