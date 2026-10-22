# MCP and agent setup

Ixos is one local runtime: humans use the CLI, agents use its MCP tools, and the desktop uses a private worker protocol. `ixos mcp --dir /absolute/project --profile code` starts the public stdio server. `ixos setup` provisions the canonical agent skill and both models; `ixos setup --skip-models` installs only the skill. A skill explains tool strategy; MCP registration makes the tools callable. Neither alone substitutes for the other.

| Tool | Use | Arguments |
|---|---|---|
| `search` | Conceptual discovery or ranked lexical/semantic search | `query`, `dir`, `profile`, `mode`, `limit`, `context`, `evidence`, `view` |
| `grep` | Exact identifiers, literals or regular expressions | `pattern`, `dir`, `fixed`, `ignore_case`, `limit`, `context`, `view` |
| `read` | Expand a known range | `path`, `dir`, `start`, `lines` or `end`, `expected_source_hash`, `characters`, `character_offset`, `requests`, `max_bytes`, `view` |

Only query, pattern, or a read selector (`path` or `requests`) is required. Omitted arguments use the server location/settings. `start` and `end` are inclusive; `end` and `lines` are mutually exclusive. A `dir` override explicitly selects another location, so the host's tool permissions must match the intended workspace. Read paths must be ordinary, discovered sources within that selected root. Grep and read honor traversal/ignore rules and do not write cache records.

## Codex and Claude Code

Register with [Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli):

```sh
codex mcp add ixos -- ixos mcp --dir /absolute/project --profile code
```

Register with [Claude Code](https://code.claude.com/docs/en/mcp#option-3-add-a-local-stdio-server):

```sh
claude mcp add --transport stdio ixos -- ixos mcp --dir /absolute/project --profile code
```

Use the host's MCP connection/settings view to confirm `search`, `grep` and `read` are enabled. Quote Windows paths containing spaces. Use the absolute runtime path if it is not on PATH, including the desktop-managed runtime path if applicable. Reload the host after installation when needed. Host approval and sandbox policy still apply; the installer does not weaken them. The skill is installed into native host/shared locations described in [Installation](INSTALLATION.md). Successful setup should be checked with an actual tool call, not only a visible skill entry.

## Evidence and compact views

Defaults retain the single-snippet JSON contract. For code discovery, agents can request:

```json
{"query":"invalidate cached source after file changes","profile":"code","mode":"hybrid","evidence":"functions","limit":5,"view":"numbered"}
```

`evidence:"passages"` exposes a bounded distinct alternative from existing passage candidates. `evidence:"functions"` uses source structure and bounded function representations for the top three files, falling back to passage evidence for unsupported, oversized or unparseable sources. A build without function support rejects that mode; use passages. Optional evidence applies to model-backed code search. Lexical search and the documents profile retain their original snippets. File ordering/scores and the original excerpt are preserved. In explicit evidence modes, `matches` replaces `snippet` and its first entry is the original excerpt. Each match contains exact `lines:[first,last]` and `text`; optional `symbol:[name,first,last]` is a definition extent, and `scope:[line,declaration]` quotes enclosing source. A five-line excerpt is still partial evidence. Alternatives are possibilities to inspect, not confirmation that a function answers the query.

`view:"numbered"` renders compact source text and groups grep hits by path, retaining exact machine-readable `structuredContent`. If that view cannot preserve the returned information within budget it falls back to JSON. Numbered reads may return a shorter tail, with truthful updated coordinates/truncation and continuation. Default `view:"json"` has matching JSON text/structured content. The default response-content ceiling is 6,000 bytes; read accepts explicit `max_bytes` up to 24,000 bytes; JSON-RPC/MCP framing and duplicated structured content are additional wire bytes. Tokens vary with source language and mode.

When supplied, pass the result's `source_hash` back to `read` as `expected_source_hash`. A mismatch rejects old coordinates; search/read current source and retry. Hashes cover primary bytes and normalized extracted text. Document coordinates refer to extracted text, not PDF page numbers. After a truncated line read, follow `next_start_line`. For one oversized physical line request `characters` and advance `character_offset` using `next_character_offset`, keeping the same line range. Character offsets count Unicode characters; returned slice byte offsets refer to normalized extracted UTF-8 text.

## State and diagnostics

The process keeps models, text, BM25 statistics and vectors resident per location/profile. Mode, limit and context changes reuse state; each search refreshes sources. Function caches are resident, bounded and source-versioned. Scores are ranking signals, not probabilities. Use grep for known identifiers and read selected ranges rather than repeatedly reformulating an already successful search.

Ixos implements initialization, ping, tool listing and calls over [MCP stdio](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#stdio). Stdout carries only newline-delimited protocol messages; diagnostics use stderr. A tools/call request with `_meta:{"io.ixos/diagnostics":true}` can receive search statistics in result `_meta`; normal tool content is unchanged. This optional diagnostic envelope is not a tool argument or a new tool.

`cargo test -p ixos-cli --test mcp` launches the real server and checks all tools, legacy serialization, Unicode, ignored paths, malformed requests, source-version guards, inclusive ranges and bounded continuation.

## Batched source reads

`read` accepts either the existing single selector or `requests`, an array of 1 to 8 selectors. A selector uses `path`, optional inclusive `start` and `end` (or `lines`), `expected_source_hash`, `characters` and `character_offset`. Batch selectors may also carry a unique, nonempty string `id` of at most 128 UTF-8 bytes. `dir`, `view` and `max_bytes` apply to the whole call; do not put them inside a selector. Top-level selectors and `requests` are mutually exclusive.

```json
{"requests":[{"id":"definition","path":"src/cache.rs","start":20,"end":55},{"id":"caller","path":"src/main.rs","start":80,"lines":12}],"max_bytes":12000,"view":"json"}
```

The response is `{"results":[...]}` in request order. Each successful item contains the existing source fields, plus its `id` when provided. A failing item contains `error` and its optional `id`; other items still run. Unknown selector fields and malformed ranges produce item errors. Invalid batch structure, duplicate or invalid ids, and mixed top-level selectors reject the call.

The default 6,000-byte JSON content budget is divided equally and deterministically, including ids and outer framing. Unused shares are not transferred between items. Every item receives a share; a budget too small for all items rejects the call. `max_bytes` accepts integers from 128 to 24,000; small batches still need enough space for each item's metadata. Long physical lines may require `characters` or a larger explicit budget. Successful items retain independent truthful `truncated`, source hashes and continuation coordinates. Use each item's own `next_start_line` or `next_character_offset` and `expected_source_hash` when continuing. Batch `view:"numbered"` currently falls back to complete JSON so no item is silently dropped by rendering. Single reads retain their legacy shape and default budget.

## Exact function reads

Single reads and batch items also accept `within` and optional `body:true`. `within` is an exact function name or immediate parsed `Owner::name` (`Owner.name` is also accepted). Multiple definitions return `selection.status:"ambiguous"` and grounded candidate extents with no guessed excerpt. Unsupported or oversized sources can lack a definition; use grep and exact ranges instead.

```json
{"path":"src/cache.rs","within":"Cache::refresh","max_bytes":12000,"view":"numbered"}
```

Definition reads preserve preceding associated documentation. `body:true` starts at the parsed implementation body and excludes a leading Python docstring. `start` and `end`/`lines` can constrain an exact inclusive range within the definition. The definition extent and returned excerpt are reported separately. Use returned continuation coordinates to read a truncated tail, with the same source hash. Body selection fails explicitly if no implementation body is identified.

Inspection never needs an embedding model. It revalidates ignore rules, primary source freshness and exact coordinates. Its resident cache holds at most 16 entries and approximately 4 MiB of accounted allocations; ordinary engine/model/parser state is additional. It rejects more than 500,000 extracted lines before allocating per-line strings. Exact/batched/explicit-budget reads fit a line prefix to the available budget; ordinary default single-range reads preserve their historical shape and extents.

There are no approximate query, opening/closing anchor or related-code selectors in `read`. Such experiments did not justify a second retrieval system inside a source-inspection operation.
