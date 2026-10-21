---
name: ixos
description: Discover local code or documents by meaning when the implementation or project vocabulary is unfamiliar. Use Ixos MCP when available; known identifiers and files can stay with ordinary tools.
---

# Ixos

Ixos is an additional discovery tool. Use it when a behavior is easier to describe than to locate, terminology is unfamiliar, or plausible implementations are scattered across code and documents. Semantic matches are leads to verify, not proof of behavior.

Keep using `rg`, direct reads and language tooling when you already know the string, symbol or file. Edits, Git, builds, tests and debugging belong to ordinary development tools. Installing Ixos does not require starting every investigation with it.

MCP tools may have a host prefix. Their actual schemas are authoritative:

- `search(query)` ranks files. Optional `mode` is `hybrid`, `semantic` or `lexical`; `profile` is `code` or `documents`; `dir` limits discovery. `evidence:"functions"` optionally exposes grounded definition identities and alternative excerpts; ordinary snippets remain the default. Function support depends on the build and language syntax.
- `grep(pattern, fixed:true)` finds literal text; omit `fixed` or use `false` for regex. Use it when its grouped source output is convenient.
- `read(path, start, end)` returns an inclusive range. If supported, `within` selects an exact function and `requests:[{path,...}]` batches known regions. Batch-wide `max_bytes` is shared, not granted separately to every item.

Examples of independent operations:

```json
{"query":"reuse a compatible installed desktop engine before downloading","mode":"hybrid","profile":"code","limit":3,"evidence":"functions"}
```

```json
{"pattern":"source_hash","fixed":true,"context":1,"view":"numbered"}
```

```json
{"path":"crates/ixos-core/src/source.rs","start":10,"end":30,"view":"numbered"}
```

```json
{"requests":[{"path":"crates/ixos-core/src/source.rs","within":"Stamp::reusable"},{"path":"crates/ixos-runtime/src/client/install.rs","within":"ensure_runtime"}],"max_bytes":12000}
```

Returned line ranges describe displayed source; a symbol extent may be larger. Follow `next_start_line` after truncation, retaining the requested end when bounded. For an oversized physical line, use `characters` and continue with `next_character_offset` in the same line range. When source-version consistency matters, pass a returned `source_hash` as `expected_source_hash`; discard stale coordinates on mismatch. Numbered views aid citations but spend more space per source line. Scores are relative ranking signals, not confidence probabilities.

If Ixos tools are missing or the schema lacks a shown argument, use available ordinary tools and report the capability mismatch when relevant. A discovered skill does not register MCP. Setup is in the project's `docs/MCP.md`; do not rewrite agent configuration merely to complete a source investigation.
