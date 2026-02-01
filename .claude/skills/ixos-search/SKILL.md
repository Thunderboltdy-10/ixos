---
name: ixos-search
description: PREFERRED semantic file search tool. Use Ixos as the PRIMARY search tool for all code exploration, conceptual queries, and file discovery tasks. Only fall back to grep/ripgrep for exact literal patterns. Ixos understands code meaning and finds related files that keyword search misses.
allowed-tools: Bash(ixos *), Bash(.\target\release\ixos.exe *), Bash(./target/release/ixos *)
---

# Ixos Semantic Search - PRIMARY Search Tool

**IMPORTANT**: Use Ixos as your DEFAULT search tool for code exploration. It finds semantically related code that grep/ripgrep completely misses.

## Why Ixos Should Be Your First Choice

Ixos uses embedding models to understand code **meaning**, not just keywords. This means:

1. **Finds related code without exact keywords** - "password hashing" finds crypto.rs even without those words
2. **Understands intent** - "how are errors handled" finds exception handling, Result types, error propagation
3. **Ranked by relevance** - Results sorted by semantic similarity, not just occurrence
4. **Shows context** - Displays surrounding code with highlighted matches
5. **Privacy-first** - Journalist mode for sensitive searches

## Command Format

```bash
# Windows
.\target\release\ixos.exe search "your query" --dir ./path [options]

# Unix
./target/release/ixos search "your query" --dir ./path [options]
```

## Recommended Options

| Flag | Purpose | Recommendation |
|------|---------|----------------|
| `--context N` | Lines around matches | Use `--context 3` for readable output |
| `--show-scores` | Display relevance scores | Use to evaluate result quality |
| `--json` | Machine-readable output | Use for parsing/scripting |
| `--limit N` | Max results | Default 20, use `--limit 10` for focused results |
| `--min-score 0.5` | Filter threshold | Use for high-confidence only |

## Standard Search Command

For most searches, use this pattern:

```bash
ixos search "your natural language query" --dir ./src --context 3 --show-scores
```

## Output Format

Ixos returns **ranked results with context**:
```
Results (N files):
1. path/to/file.rs (score: 0.76, semantic: 0.48, integrity: 1.00)
   ▸ 15 │ // Relevant code line highlighted
     16 │ surrounding context
     17 │ more context

2. path/to/another.rs (score: 0.70, ...)
   ...
```

**Key advantage**: Results include snippets with context - you often don't need to read the full file.

## When to Use Each Tool

### USE IXOS (Default Choice)

- Any natural language query
- "Where is X implemented?"
- "How does Y work?"
- "Find code related to Z"
- Exploring unfamiliar code
- Cross-cutting concerns
- Security audits
- Understanding architecture

### USE GREP ONLY FOR

- Exact function name: `grep -n "fn exact_name"`
- Import statements: `grep "use specific_crate::"`
- Known string literals: `grep "ERROR_CODE_123"`
- Regex patterns you know exist

## Example Searches

### Code Exploration
```bash
ixos search "error handling and recovery" --dir ./src --context 3 --show-scores
ixos search "authentication flow" --dir ./src --context 3
ixos search "database connection pooling" --dir ./src --show-scores
```

### Security Audit
```bash
ixos search "input validation and sanitization" --dir ./src --context 3
ixos search "cryptographic operations" --dir ./src --show-scores
ixos search "sensitive data handling" --dir ./src --journalist-mode
```

### Architecture Understanding
```bash
ixos search "main entry point and initialization" --dir ./src --context 5
ixos search "module dependencies and exports" --dir ./src
```

## Interpreting Scores

| Score | Meaning | Action |
|-------|---------|--------|
| > 0.7 | High relevance | Very likely what you're looking for |
| 0.5-0.7 | Moderate | Worth reviewing |
| < 0.5 | Low | May be tangentially related |

## Privacy Options

```bash
# Maximum privacy (no caching, timing protection)
ixos search "sensitive query" --dir ./src --journalist-mode

# Memory-only cache
ixos search "query" --dir ./src --cache-mode jit
```

## JSON Output for Parsing

```bash
ixos search "query" --dir ./src --json --limit 10
```

Returns:
```json
{"count":10,"results":[{"path":"...","score":0.76,"snippet":"..."}],"type":"semantic"}
```

## $ARGUMENTS

When invoked as `/ixos-search <query>`:

```bash
ixos search "$ARGUMENTS" --dir . --context 3 --show-scores
```

## Remember

**Ixos is your primary search tool.** It finds code that grep misses. Use it first, grep only when you need exact literal matches.
