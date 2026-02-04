# Ixos Skill Comparison Report

> Comprehensive evaluation of the `/ixos-search` skill vs traditional grep/glob search.

**Generated:** 2026-02-04
**Queries Tested:** 12 (representative subset of 25 planned)
**Hardware:** Windows 11, AMD Ryzen 7 5800X

---

## Executive Summary

**Winner: Ixos skill for semantic queries, grep for exact matches.**

Ixos excels at:
- Natural language queries ("where is authentication handled")
- Conceptual searches ("how does workstream clustering work")
- Debugging questions ("why would workstreams be empty")
- Architecture understanding

Grep excels at:
- Exact identifier lookup (`MmapModel2VecEmbedder`)
- Finding all usages of a symbol across codebase
- Known string patterns

---

## Detailed Query Results

### Category 1: Architecture Questions

| Query | Ixos Top Result | Relevance | Grep Result | Notes |
|-------|-----------------|-----------|-------------|-------|
| "where is authentication handled" | `commands/system.rs`, `proxy.ts` | 5/5 | N/A (no keyword) | Ixos finds auth-related code without exact keywords |
| "how does workstream clustering work" | `workstreams/mod.rs` (score: 16.43) | 5/5 | `grep cluster` finds same | Both find it; Ixos shows algorithm docs |
| "model download flow" | `mmap_model.rs`, `commands/system.rs` | 5/5 | `grep download` finds more | Ixos ranks implementation over docs |
| "capability enforcement" | `capabilities.rs` (score: 8.54) | 5/5 | `grep Capability` finds 50+ | Ixos focuses on enforcement logic |
| "explain activity ledger design" | `activity_ledger/mod.rs` | 5/5 | N/A | Semantic query, no exact match |

### Category 2: Feature Location

| Query | Ixos Top Result | Relevance | Grep Result | Notes |
|-------|-----------------|-----------|-------------|-------|
| "semantic search implementation" | `progressive.rs`, `main.rs` | 5/5 | `grep semantic` finds 100+ | Ixos finds core implementation |
| "co-occurrence analysis" | `co_occurrence.rs` (score: 2.01) | 4/5 | Direct match works | Both find it; score lower than expected |
| "Today Tab components" | `todayStore.ts`, `TodayTab.tsx` | 5/5 | `grep TodayTab` works | Equivalent results |
| "notification or toast system" | `notificationStore.ts` | 5/5 | `grep toast` works | Equivalent results |

### Category 3: Debug/Troubleshoot

| Query | Ixos Top Result | Relevance | Grep Result | Notes |
|-------|-----------------|-----------|-------------|-------|
| "why would workstreams be empty" | `workstreams.rs`, `storage.rs` | 5/5 | N/A | **Ixos wins** - understands debugging intent |

### Category 4: Specific Terms

| Query | Ixos Files | Grep Files | Notes |
|-------|------------|------------|-------|
| "MmapModel2VecEmbedder" | 5 ranked | 19 total | **Grep wins for completeness** |

---

## Performance Metrics

| Metric | Ixos | Grep |
|--------|------|------|
| Average query time | ~30s (full corpus) | <1s |
| First useful result | Usually #1 | Requires filtering |
| Context included | Yes (3 lines default) | Configurable |
| Ranking quality | Semantic relevance | Alphabetical/occurrence |

**Note:** Ixos time includes model loading (~100ms) + full corpus embedding. For repeated queries in the desktop app, warm cache reduces this significantly.

---

## Unique Strengths

### Ixos Unique Findings

1. **Conceptual queries**: "explain the design of X" returns documentation and implementation together
2. **Debug-oriented**: "why would X be empty" understands the troubleshooting intent
3. **Cross-file relationships**: Finds related code even without shared keywords
4. **Ranked output**: Most relevant results first, not just all matches

### Grep Unique Findings

1. **Completeness**: Finds every occurrence, including documentation
2. **Speed**: Near-instant for simple patterns
3. **Precision**: Exact regex matching for known patterns
4. **No false positives**: Only exact matches returned

---

## Failure Modes Identified

### Ixos Failures

1. **Low scores on exact matches**: When searching for exact class names, semantic scores may be lower than expected
2. **Missing some usages**: May not rank all occurrences highly (grep finds 19 files, Ixos shows 5)
3. **Speed on cold start**: 30s latency acceptable for complex queries but slow for quick lookups

### Grep Failures

1. **No semantic understanding**: Can't find "authentication" if code says "login" or "auth"
2. **No ranking**: 100 results are equally weighted
3. **Requires exact keywords**: "why would X fail" returns nothing

---

## Recommendations

### When to Use Ixos (Default)

- **Always first** for natural language queries
- Architecture exploration
- Understanding unfamiliar code
- Debugging investigations
- Cross-cutting concern searches
- Any query that sounds like a question

### When to Use Grep

- Exact function/class name lookup
- Finding all import statements
- Known string literals
- Refactoring (need all occurrences)
- CI/automation scripts

---

## Skill Improvement Suggestions

1. **Emphasize default usage**: The skill prompt should make it clear Ixos is the DEFAULT tool
2. **Speed expectations**: Note that semantic search trades speed for relevance
3. **Complementary tools**: Suggest grep for exact matches after Ixos for semantic
4. **Query examples**: Include more debugging-style query examples

---

## Conclusion

The Ixos skill provides significant value for semantic code exploration that grep cannot match. For developers working with unfamiliar codebases or debugging complex issues, Ixos finds relevant code that keyword search completely misses.

**Recommended workflow:**
1. Start with Ixos for any exploratory or conceptual query
2. Use grep only for exact identifier lookup or finding all occurrences
3. Trust Ixos ranking - top results are usually most relevant
