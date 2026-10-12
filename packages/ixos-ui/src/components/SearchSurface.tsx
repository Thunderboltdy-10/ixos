import { useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  Copy,
  Sparkles,
  Check,
  Search,
  Folder,
  ChevronDown,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { IxosSearchResult } from "../types";

type SearchProfile = "code" | "documents";
type SearchTone = "teal" | "amber" | "violet";

interface PipelineStats {
  stage?: string;
  filesScanned?: number;
  scanned?: number;
  candidates?: number;
  embedded?: number;
  cacheHits?: number;
  scanTrail?: string[];
}

interface SearchSurfaceProps {
  query: string;
  onQueryChange?: (value: string) => void;
  onSubmit?: () => void;
  directoryLabel?: string;
  profile?: SearchProfile;
  tone?: SearchTone;
  onProfileChange?: (profile: SearchProfile) => void;
  stageLabel?: string;
  isSearching?: boolean;
  errorMessage?: string | null;
  results: IxosSearchResult[];
  selectedIndex?: number;
  onSelectResult?: (index: number) => void;
  onOpenResult?: (index: number) => void;
  onRevealResult?: (index: number) => void;
  allowResultsScroll?: boolean;
  hideSearchChrome?: boolean;
  resultLimit?: number;
  pipelineStats?: PipelineStats;
  interactive?: boolean;
}

interface AccentTheme {
  id: SearchTone;
  accent: string;
  accentSoft: string;
  accentFaint: string;
  accentStrong: string;
  border: string;
  text: string;
}

interface MatchLine {
  lineNumber: number | null;
  text: string;
  kind: "before" | "match" | "after";
}

const PROFILES: SearchProfile[] = ["code", "documents"];

const THEMES: Record<SearchTone, AccentTheme> = {
  teal: {
    id: "teal",
    accent: "#2DD4BF",
    accentSoft: "rgba(45, 212, 191, 0.18)",
    accentFaint: "rgba(45, 212, 191, 0.08)",
    accentStrong: "rgba(45, 212, 191, 0.8)",
    border: "rgba(45, 212, 191, 0.4)",
    text: "#5EEAD4",
  },
  amber: {
    id: "amber",
    accent: "#F59E0B",
    accentSoft: "rgba(245, 158, 11, 0.18)",
    accentFaint: "rgba(245, 158, 11, 0.08)",
    accentStrong: "rgba(245, 158, 11, 0.8)",
    border: "rgba(245, 158, 11, 0.42)",
    text: "#FCD34D",
  },
  violet: {
    id: "violet",
    accent: "#A78BFA",
    accentSoft: "rgba(167, 139, 250, 0.2)",
    accentFaint: "rgba(167, 139, 250, 0.08)",
    accentStrong: "rgba(167, 139, 250, 0.84)",
    border: "rgba(167, 139, 250, 0.44)",
    text: "#C4B5FD",
  },
};

function inferStage(stageLabel: string, stage?: string) {
  const raw = (stage ?? stageLabel).toLowerCase();
  if (raw === "discover" || raw.includes("warming")) return "discover";
  if (raw.includes("lexical")) return "lexical";
  if (raw.includes("semantic")) return "semantic";
  if (raw.includes("complete")) return "complete";
  return "lexical";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveTheme(profile: SearchProfile, tone?: SearchTone): AccentTheme {
  if (tone) return THEMES[tone];
  if (profile === "documents") return THEMES.amber;
  return THEMES.teal;
}

function cleanSearchText(input: string): string {
  const withoutAnsi = input.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
  const printable = withoutAnsi
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
  return printable;
}

function buildContextLines(result: IxosSearchResult): MatchLine[] {
  const hasStructuredContext =
    (result.contextBefore && result.contextBefore.length > 0) ||
    (result.contextMatch && result.contextMatch.length > 0) ||
    (result.contextAfter && result.contextAfter.length > 0);

  if (hasStructuredContext) {
    const start = Math.max(
      1,
      (result.matchedLineNumber ?? 1) - (result.contextBefore?.length ?? 0),
    );
    const before = (result.contextBefore ?? []).map((text, index) => ({
      lineNumber: start + index,
      text: cleanSearchText(text),
      kind: "before" as const,
    }));
    const matchStart = start + before.length;
    const match = (result.contextMatch ?? [result.snippet]).map(
      (text, index) => ({
        lineNumber: matchStart + index,
        text: cleanSearchText(text),
        kind: "match" as const,
      }),
    );
    const afterStart = matchStart + match.length;
    const after = (result.contextAfter ?? []).map((text, index) => ({
      lineNumber: afterStart + index,
      text: cleanSearchText(text),
      kind: "after" as const,
    }));
    return [...before, ...match, ...after].filter(
      (line) => line.text.trim().length > 0,
    );
  }

  const base = cleanSearchText(result.snippet)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(0, 8);

  const line = result.matchedLineNumber ?? null;
  return base.length > 0
    ? base.map((text, index) => ({
        lineNumber: line ? line + index : null,
        text,
        kind: index === 0 ? ("match" as const) : ("after" as const),
      }))
    : [
        {
          lineNumber: line,
          text: "No context available for this result.",
          kind: "after" as const,
        },
      ];
}

function compactPath(path: string): string {
  if (path.length <= 120) return path;
  return `${path.slice(0, 55)}...${path.slice(-55)}`;
}

export function SearchSurface({
  query,
  onQueryChange,
  onSubmit,
  directoryLabel,
  profile = "code",
  tone,
  onProfileChange,
  stageLabel = "Streaming",
  isSearching = false,
  errorMessage,
  results,
  selectedIndex = 0,
  onSelectResult,
  onOpenResult,
  onRevealResult,
  allowResultsScroll = true,
  hideSearchChrome = false,
  resultLimit,
  pipelineStats,
  interactive = true,
}: SearchSurfaceProps) {
  const visibleResults = useMemo(
    () => (resultLimit ? results.slice(0, resultLimit) : results),
    [resultLimit, results],
  );

  const rawStage = pipelineStats?.stage ?? stageLabel;
  const stage = inferStage(stageLabel, rawStage);
  const fillHeight = hideSearchChrome;
  const denseMode = hideSearchChrome;
  const theme = resolveTheme(profile, tone);

  const selected = visibleResults[selectedIndex] ?? visibleResults[0] ?? null;
  const safeSelectedIndex =
    visibleResults.length > 0
      ? clamp(selectedIndex, 0, visibleResults.length - 1)
      : 0;

  const progressText = isSearching
    ? `scanning ${pipelineStats?.filesScanned ?? pipelineStats?.scanned ?? 0} files...`
    : visibleResults.length > 0
      ? `${visibleResults.length} result${visibleResults.length === 1 ? "" : "s"} ready`
      : "ready";

  const scanTrail = useMemo(
    () => [...(pipelineStats?.scanTrail ?? [])].slice(-8).reverse(),
    [pipelineStats?.scanTrail],
  );

  const contextLines = useMemo(
    () => (selected ? buildContextLines(selected) : []),
    [selected],
  );

  const [copiedKind, setCopiedKind] = useState<"path" | "context" | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<"profile" | null>(null);
  const surfaceVars = {
    "--ixos-accent": theme.accent,
    "--ixos-accent-soft": theme.accentSoft,
    "--ixos-accent-faint": theme.accentFaint,
    "--ixos-accent-strong": theme.accentStrong,
    "--ixos-accent-border": theme.border,
  } as CSSProperties;

  const handleCopy = async (kind: "path" | "context") => {
    if (!selected) return;
    const payload =
      kind === "path"
        ? selected.path
        : contextLines
            .map((line) => `${line.lineNumber ?? "--"}  ${line.text}`)
            .join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
        setCopiedKind(kind);
        setTimeout(
          () => setCopiedKind((current) => (current === kind ? null : current)),
          1100,
        );
      }
    } catch {
      // Clipboard failure should not break the panel.
    }
  };

  return (
    <div
      className="ixos-search-surface"
      data-fill={fillHeight}
      data-dense={denseMode}
      data-tone={theme.id}
      style={surfaceVars}
    >
      {!hideSearchChrome && (
        <div style={{ paddingBottom: 16 }}>
          {/* Breadcrumb row */}
          <div
            style={{
              padding: "0 0 12px 0",
              fontSize: 11,
              color: "rgba(255,255,255,0.28)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-ixo-mono), monospace",
            }}
          >
            <span>Ixos</span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Search</span>
            {progressText && (
              <span
                style={{ marginLeft: "auto", fontSize: 10, color: theme.text }}
              >
                {progressText}
              </span>
            )}
          </div>

          <div
            style={{
              border: `1px solid ${theme.border}`,
              background: "rgba(10,14,18,0.5)",
              borderRadius: 8,
              position: "relative",
            }}
          >
            {/* Query row */}
            <div
              style={{
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Search
                size={14}
                style={{ opacity: 0.45, color: theme.accent, flexShrink: 0 }}
              />
              <input
                value={query}
                onChange={(e) => onQueryChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmit?.();
                }}
                readOnly={!interactive}
                placeholder="Type what you remember..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#F3F5F7",
                  fontFamily: "var(--font-ixo-mono), monospace",
                  fontSize: 13,
                  flex: 1,
                }}
              />
              <X
                size={14}
                style={{
                  opacity: 0.3,
                  color: "#F3F5F7",
                  cursor: interactive ? "pointer" : "default",
                  flexShrink: 0,
                }}
                onClick={() => {
                  if (interactive) onQueryChange?.("");
                }}
              />
            </div>
            {/* Folder path and modes row */}
            <div
              style={{
                padding: "6px 14px 9px",
                borderTop: `1px solid rgba(255,255,255,0.04)`,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Folder
                size={11}
                style={{ opacity: 0.3, color: "#F3F5F7", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.32)",
                  fontFamily: "var(--font-ixo-mono), monospace",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {directoryLabel || "Sample files"}
              </span>

              {/* Modes */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {/* Overlay to close dropdowns */}
                {dropdownOpen && (
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 14000 }}
                    onClick={() => setDropdownOpen(null)}
                  />
                )}

                <div
                  style={{
                    position: "relative",
                    zIndex: dropdownOpen === "profile" ? 15001 : 1,
                  }}
                >
                  <div
                    onClick={() =>
                      interactive &&
                      setDropdownOpen(
                        dropdownOpen === "profile" ? null : "profile",
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: interactive ? "pointer" : "default",
                    }}
                  >
                    <Sparkles size={10} style={{ color: theme.accent }} />
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: "var(--font-ixo-mono), monospace",
                        color: theme.accent,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      {profile}
                    </span>
                    <ChevronDown
                      size={10}
                      style={{ color: "rgba(255,255,255,0.3)", marginLeft: 2 }}
                    />
                  </div>

                  <AnimatePresence>
                    {dropdownOpen === "profile" && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          marginTop: 8,
                          background: "#1a1d24",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 6,
                          padding: 4,
                          minWidth: 120,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                        }}
                      >
                        {PROFILES.map((m) => (
                          <div
                            key={m}
                            onClick={() => {
                              onProfileChange?.(m);
                              setDropdownOpen(null);
                            }}
                            style={{
                              padding: "6px 10px",
                              fontSize: 10,
                              fontFamily: "var(--font-ixo-mono), monospace",
                              color:
                                profile === m
                                  ? theme.accent
                                  : "rgba(255,255,255,0.7)",
                              background:
                                profile === m
                                  ? "rgba(255,255,255,0.05)"
                                  : "transparent",
                              borderRadius: 4,
                              cursor: "pointer",
                              textTransform: "capitalize",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(255,255,255,0.08)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                profile === m
                                  ? "rgba(255,255,255,0.05)"
                                  : "transparent")
                            }
                          >
                            {m}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Activity size={10} style={{ color: theme.text }} />
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "var(--font-ixo-mono), monospace",
                      color: theme.text,
                      fontWeight: 700,
                    }}
                  >
                    LOCAL
                  </span>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div
              style={{
                marginTop: 10,
                border: "1px solid rgba(239, 68, 68, 0.5)",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.08)",
                padding: "10px 12px",
                color: "#fca5a5",
                fontSize: 12,
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="ixos-search-layout">
        <div className="ixos-search-results" data-scroll={allowResultsScroll}>
          <div className="ixos-search-meta-row">
            <span
              style={{
                fontFamily: "var(--font-ixo-mono), monospace",
                fontSize: 10,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              discover {"->"} lexical {"->"} semantic
            </span>
            <span
              style={{
                fontFamily: "var(--font-ixo-mono), monospace",
                fontSize: 10,
                color: theme.text,
              }}
            >
              {pipelineStats?.candidates ?? visibleResults.length} matches |
              local-first
            </span>
          </div>

          {isSearching && scanTrail.length > 0 && (
            <div className="ixos-stream-activity">
              {scanTrail.map((path, index) => (
                <motion.div
                  key={`${path}-${index}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.95, y: 0 }}
                  transition={{
                    duration: 0.22,
                    delay: Math.min(index * 0.04, 0.24),
                  }}
                  className="ixos-stream-row"
                >
                  <span className="ixos-stream-dot" />
                  <span className="ixos-stream-path">{compactPath(path)}</span>
                </motion.div>
              ))}
            </div>
          )}

          <div className="ixos-result-list">
            <AnimatePresence>
              {visibleResults.length > 0 ? (
                visibleResults.map((result, index) => {
                  const isSelected = index === safeSelectedIndex;
                  return (
                    <motion.div
                      key={`${result.id}-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        height: "auto",
                      }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1],
                        delay: Math.min(index * 0.02, 0.12),
                      }}
                      className="ixos-result-row"
                      data-selected={isSelected}
                      onClick={() => onSelectResult?.(index)}
                      style={{
                        marginBottom: "6px",
                        overflow: "hidden",
                        cursor: "default",
                        borderLeft: isSelected
                          ? `2px solid ${theme.accent}`
                          : "2px solid transparent",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          height: 32,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-ixo-mono), monospace",
                              fontSize: 11,
                              color: isSelected
                                ? theme.text
                                : "rgba(255,255,255,0.42)",
                              flexShrink: 0,
                            }}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-ixo-mono), monospace",
                              fontSize: 15,
                              fontWeight: isSelected ? 700 : 400,
                              color: isSelected
                                ? "#F8FAFC"
                                : "rgba(243,245,247,0.7)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {result.title || result.path}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-ixo-mono), monospace",
                            fontSize: 12,
                            color: isSelected
                              ? theme.text
                              : "rgba(255,255,255,0.64)",
                            flexShrink: 0,
                          }}
                        >
                          {result.score.toFixed(3)}
                        </span>
                      </div>

                      <AnimatePresence>
                        {
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            style={{ paddingLeft: 28, paddingBottom: 10 }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                color: "rgba(255,255,255,0.52)",
                                fontFamily: "var(--font-ixo-mono), monospace",
                                display: "block",
                                marginBottom: 5,
                              }}
                            >
                              {compactPath(result.path)}
                              {result.matchedLineNumber
                                ? `:${result.matchedLineNumber}`
                                : ""}
                            </span>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: "rgba(255,255,255,0.68)",
                                lineHeight: 1.45,
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {cleanSearchText(result.snippet).replace(
                                /\s+/g,
                                " ",
                              )}
                            </p>
                          </motion.div>
                        }
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    minHeight: 160,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.34)",
                    fontFamily: "var(--font-ixo-mono), monospace",
                    fontSize: 12,
                  }}
                >
                  {isSearching
                    ? "warming first ranked results..."
                    : "no results found."}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <aside className="ixos-card ixos-search-snippet">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              paddingBottom: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#f3f5f7",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Sparkles size={16} style={{ color: theme.accent }} />
              About Match
            </h2>
            <div
              className="ixos-chip"
              style={{
                background: theme.accentFaint,
                color: theme.text,
                borderColor: theme.border,
              }}
            >
              <Activity size={12} />
              {stage}
            </div>
          </div>

          {selected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <h4
                  style={{
                    margin: 0,
                    color: "#f3f5f7",
                    fontSize: 16,
                    fontWeight: 700,
                    wordBreak: "break-word",
                  }}
                >
                  {selected.title}
                </h4>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 99,
                      background: "rgba(255,255,255,0.05)",
                      color: "#bdc1c6",
                      fontFamily: "var(--font-ixo-mono), monospace",
                    }}
                  >
                    {compactPath(selected.path)}
                  </span>
                  {selected.matchedLineNumber ? (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 99,
                        background: theme.accentSoft,
                        color: theme.text,
                        fontFamily: "var(--font-ixo-mono), monospace",
                      }}
                    >
                      Line {selected.matchedLineNumber}
                    </span>
                  ) : null}
                </div>
              </div>

              <div
                style={{
                  background: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "#9aa0a6",
                      fontFamily: "var(--font-ixo-mono), monospace",
                    }}
                  >
                    Match Context
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy("context")}
                    style={{
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      background:
                        copiedKind === "context"
                          ? theme.accentSoft
                          : "rgba(255,255,255,0.04)",
                      color:
                        copiedKind === "context"
                          ? theme.text
                          : "rgba(243,245,247,0.74)",
                      fontSize: 10,
                      fontFamily: "var(--font-ixo-mono), monospace",
                      padding: "4px 8px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      cursor: interactive ? "pointer" : "default",
                    }}
                  >
                    {copiedKind === "context" ? (
                      <Check size={11} />
                    ) : (
                      <Copy size={11} />
                    )}
                    {copiedKind === "context" ? "Copied" : "Copy"}
                  </button>
                </div>
                <div style={{ padding: 10, maxHeight: 252, overflow: "auto" }}>
                  {contextLines.map((line, index) => (
                    <div
                      key={`${line.lineNumber ?? "x"}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "58px minmax(0, 1fr)",
                        gap: 12,
                        padding: "3px 2px",
                        borderRadius: 6,
                        background: "transparent",
                      }}
                    >
                      <span
                        style={{
                          color:
                            line.kind === "match"
                              ? theme.text
                              : "rgba(255,255,255,0.42)",
                          fontSize: 11,
                          fontFamily: "var(--font-ixo-mono), monospace",
                        }}
                      >
                        {line.lineNumber ?? "--"}
                      </span>
                      <span
                        style={{
                          color:
                            line.kind === "match"
                              ? "#f5f8fa"
                              : "rgba(255,255,255,0.82)",
                          fontSize: 12,
                          lineHeight: 1.5,
                          fontFamily: "var(--font-ixo-mono), monospace",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {line.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  background: "rgba(255,255,255,0.03)",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#9aa0a6",
                    fontWeight: 700,
                  }}
                >
                  Ranking
                </h4>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                    marginTop: 4,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <span
                    style={{
                      color: "#f3f5f7",
                      fontWeight: 700,
                      fontFamily: "var(--font-ixo-mono), monospace",
                    }}
                  >
                    Ranking score
                  </span>
                  <span
                    style={{
                      color: theme.text,
                      fontWeight: 700,
                      fontFamily: "var(--font-ixo-mono), monospace",
                    }}
                  >
                    {selected.score.toFixed(3)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
              >
                <button
                  type="button"
                  disabled={!onOpenResult}
                  onClick={() => onOpenResult?.(safeSelectedIndex)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: interactive ? "pointer" : "default",
                    color: theme.text,
                    background: theme.accentSoft,
                    border: `1px solid ${theme.border}`,
                    fontFamily: "var(--font-ixo-mono), monospace",
                  }}
                >
                  Open in Editor
                </button>
                <button
                  type="button"
                  disabled={!onRevealResult}
                  onClick={() => onRevealResult?.(safeSelectedIndex)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 9,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: interactive ? "pointer" : "default",
                    color: "#f3f5f7",
                    background: theme.accentFaint,
                    border: `1px solid ${theme.border}`,
                    fontFamily: "var(--font-ixo-mono), monospace",
                  }}
                >
                  Reveal File
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy("path")}
                  style={{
                    gridColumn: "1 / -1",
                    padding: "8px 12px",
                    borderRadius: 9,
                    fontWeight: 600,
                    fontSize: 11,
                    cursor: interactive ? "pointer" : "default",
                    color:
                      copiedKind === "path"
                        ? theme.text
                        : "rgba(255,255,255,0.86)",
                    background:
                      copiedKind === "path"
                        ? theme.accentFaint
                        : "rgba(255,255,255,0.04)",
                    border: `1px solid ${copiedKind === "path" ? theme.border : "rgba(255,255,255,0.1)"}`,
                    fontFamily: "var(--font-ixo-mono), monospace",
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {copiedKind === "path" ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                  {copiedKind === "path" ? "Path copied" : "Copy file path"}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 220,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#9aa0a6",
                  fontSize: 13,
                  textAlign: "center",
                  fontFamily: "var(--font-ixo-mono), monospace",
                  lineHeight: 1.5,
                }}
              >
                Select a result to inspect context, scoring signals, and quick
                actions.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
