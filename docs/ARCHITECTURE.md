# How Ixos retrieves local evidence

Ixos combines exact text evidence with small static embeddings. It runs on CPU and searches ordinary local sources without requiring a remote service. The CLI is the primary interface for agents; the desktop currently uses the retained progressive pipeline described below.

## One search, from files to evidence

1. **Discover eligible sources.** An ignore-aware walk honors `.gitignore`, including outside a Git repository, and stops ancestor Git rules at the nearest repository boundary when one exists. Hidden files, symlinks, recognized dependency/cache directories and cloud placeholders are excluded. A folder named `env` remains searchable unless it contains `pyvenv.cfg`; a source module named `build` remains visible, while ignore rules exclude generated outputs. The walker is shared with lexical search and cache utilities.
2. **Read and verify freshness.** Read complete bounded primary bytes. Hash them on every request, including warm requests. Source metadata alone cannot detect equal-length edits reliably. In a resident process, an unchanged raw hash permits reuse of extraction, term counts and vectors. The per-file primary-byte limit is 16 MiB; the source corpus budget is 256 MiB. These are input limits, not total process-memory guarantees.
3. **Extract text.** Plain UTF-8 and BOM-marked UTF-16 are decoded strictly. Supported PDF/Office inputs use parsers; ZIP/XML expansion is bounded. Coordinates in these formats refer to extracted text, not page layout or original binary offsets. Unsupported or oversized files are counted as skipped, rather than silently using a prefix. The evaluator rejects incomplete eligible corpora.
4. **Prepare lexical evidence and semantic representatives.** BM25 uses the complete extracted text and path terms. Code uses a short introduction plus spaced representatives, with a length-dependent cap; documents use full-token pooling. These are query-independent cache recipes.
5. **Compute the query and rank.** Embed the query once. Score semantic similarity against the representative vectors and combine it with lexical evidence. Exact identifiers have a lexical guard. Lexical-only mode loads no model; semantic-only mode can be requested explicitly.
6. **Return bounded, verifiable views.** Locate evidence in the actual source, return exact line ranges, and fit complete result rows into the serialized byte budget. If a long source line cannot fit, return an explicit file-only result rather than pretending a shortened line is complete. Use `read --characters` for exact Unicode slices.

An agent looking for “cache invalidation after edits” can search by concept, inspect the returned path and line anchor, and then read the relevant function. `grep raw_hash` can verify the exact symbol. A search result is a navigation step; its score is neither a probability of correctness nor a claim that the small excerpt contains the entire answer.

The default preview chooses the strongest lexical line anywhere in a returned file, falling back to the strongest stored semantic passage. Experimental `--evidence-policy bounded-rerank` adds a second, query-time passage decision after file ranking. For up to ten returned files, it combines the existing representatives with up to eight chunks selected by local lexical evidence (at most sixteen candidates/file). The passage score is half positive cosine and half its best lexical line weight divided by the file's maximum line weight. Ties choose the earliest byte span and line. The preview starts at the selected passage's best lexical line, or its start when there is no lexical evidence.

Existing vectors are reused; only new candidate chunks are embedded in CPU batches of at most 64. Query-selected vectors are discarded and cannot enlarge the ADS/xattr record. Both stored and extra document vectors use the engine's normalized int8 round-trip precision, including in JIT mode; the query remains at runtime precision. Candidate selection sums unique lexical terms in deterministic order. Earlier lab screens used full-precision candidate vectors and are exploratory rather than exact-runtime measurements. This policy can improve navigation while leaving file ranking unchanged; it cannot recover a relevant file omitted before this stage. Native/resident hits still have extra evidence selection/inference costs, reported separately. See [evidence evaluation](evaluation/ANCHORS.md).

Lexical evidence uses complete alphanumeric runs at passage boundaries: a fragment cut from a long identifier is not counted as an exact query word. This conservatively drops the affected split camel-case run too, while retaining other complete words inside the chunk. Embedding input and source quotes remain unchanged. Default global-line preview selection also sums unique terms deterministically and preserves earliest-line ties; older random `HashSet` summation could move equally relevant previews across identical calls.

Extra candidate vectors never enter the persistent document record. Unselected vectors are discarded; selected vectors may remain in the explicit bounded RAM session history to support subsequent feedback. Stateless searches retain none of them across requests.

## Compact semantic representation

`src/retrieval/record.rs` splits the extracted text into passages of at most 1,800 Unicode scalars, preferring a newline/space boundary in the latter half. The passages cover the whole source during preparation. The code profile stores:

- Every passage for one to three passages.
- Four representatives when the file has four to eight passages.
- Eight representatives for longer files.

Selected positions span the beginning through the end, using ties-to-even rounding. The first passage is always included. The selection is deterministic and independent of the search query, so cache contents do not change with every question. Semantic file score is the maximum cosine similarity over the selected vectors.

**This is a bounded approximation.** An important topic between the representatives may be absent from the semantic cache. Full-source lexical evidence can still find its literal terms, but it cannot guarantee a match for a concept expressed in different words. Tests compared uniform, lexical-diverse and vector-diverse selection with whole-file pooling and an all-passages reference. The chosen compact recipe was selected before held-out scoring; the all-passages reference is retained as an experiment rather than a tiny-cache claim.

The document profile stores one 512-dimensional whole-file centroid. Every tokenizer token contributes when the artifact has no inherited truncation. Small topics can be diluted by large surrounding topics. A file containing many unrelated ideas is a harder semantic problem than a focused file; the engine does not treat a centroid as complete semantic coverage.

The original Flash tokenizer clips at 128 tokens, and the original code parent at 512. Removing the API token limit alone did not remove those tokenizer limits. The selected code variant changes tokenizer settings, preserves parent weights and receives a new fingerprint. It is not a newly trained Ixos model.

## Scoring and query handling

The lexical score is BM25 (`k1=1.2`, `b=0.75`) over source terms, with path terms counted twice. Semantic similarity uses normalized static embeddings. Hybrid mode forms the union of the top 100 lexical and top 100 eligible semantic candidates, then uses:

```text
hybrid = 0.5 × semantic cosine + 0.5 × (BM25 / largest BM25 in this query)
```

The default semantic floor is 0.25. It is a candidate filter, not calibrated answer confidence. The normalization depends on the corpus and query; scores from unrelated searches should not be compared as probabilities. `--show-scores` exposes the component scores.

Quoted identifiers, paths and similar literal queries use a lexical guard. The optional typo correction repairs only a unique adjacent transposition of an ordinary lowercase word found in the live vocabulary. It protects identifiers, paths, numbers and quotes. It does not perform an opaque LLM rewrite. Vague questions can still return unhelpful candidates; the agent should inspect evidence and refine the question or use exact symbols.

## Native cache and three distinct request conditions

The signed `IXD1` document record contains a recipe fingerprint, source fingerprint, vector dimensions/count, passage byte/line locators, per-vector scale, int8 values and HMAC. Recipe identity includes the actual model artifacts and preparation recipe. Source identity includes primary bytes and normalized extracted text. Every vector dimension is retained.

| Recipe | Signed payload | Meaning |
|---|---:|---|
| Eight × 256-dimensional code vectors | 2,375 bytes | Eight distinct representative passages |
| One × 512-dimensional document vector | 643 bytes | Whole-file pooled input |

The formula is `103 + passages × (28 + dimensions)`. Filesystem allocation overhead is additional. Records live in Windows `:ixos_document_v1` ADS or Unix `user.ixos.document-v1` xattr. Actual native write failure uses a 64 MiB LMDB in the application cache. There are no embedding sidecars in the searched folder.

Windows streams share the primary file's timestamps. Ixos suppresses automatic access/write-time updates on the **cache handle before truncation**, using the documented `SetFileTime` sentinel. It does not restore an old timestamp after writing, which could overwrite a concurrent primary edit's timestamp. Legacy embedding and personal-signal streams use the same helper. The primary is opened first and held against rename/delete during the short cache write; a missing primary is never created just to attach metadata. Actual native write failure still uses the application DB. Stream/xattr updates can generate filesystem events and Unix ctime changes; preserving modification time is not an invisible-write guarantee. See [Windows handle semantics](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfiletime) and [shared stream timestamps](https://learn.microsoft.com/en-us/windows/win32/fileio/file-streams).

| Condition | Source freshness | Extraction/lexical preparation | Document embeddings |
|---|---|---|---|
| Fresh JIT process | Full bounded read/hash | Rebuilt | Computed; no persistent writes |
| Fresh native warm process | Full bounded read/hash | Rebuilt | Validated native/application record |
| Resident warm request | Full bounded raw read/hash | Reused if unchanged | Reused if unchanged |

JIT in a resident process can reuse RAM between requests; this differs from a new JIT process. Native warm does not mean the model and parsed corpus are already in memory. Metadata is read separately from primary content; profiling led to bounded parallel source/metadata reads, rather than speculative assembly work. Four workers were selected; the limit is eight. Worker-summed I/O times can exceed wall time, so `ioBatchWallMs` and total request time are reported separately.

Same-filesystem renaming preserves native records, because their source identity does not include the path. Copies, archives and filesystem changes may discard ADS/xattr. A record transferred to another signing-key environment is recomputed. A fallback DB entry is keyed by path and is not automatically portable. Cache-full/write errors are reported; retrieval can continue by recomputing. Deleted fallback entries are removed when a live engine observes their disappearance; fresh processes do not globally sweep unrelated paths.

## Bounded session intelligence

`serve` holds a model, parsed sources and optional session state across JSONL requests. It supports search, exact grep, bounded read and reset. Explicit feedback refers to a previous response ID and its displayed file paths or zero-based result indices. Unseen results and stale source identities cannot be accepted. Silence is unknown.

Related/combined policies maintain a small semantic topic anchor. Pronoun follow-ups retain more context; an explicit low-similarity topic change clears it. Feedback applies Rocchio-style positive/negative adjustments to the query. History is capped at 16 returned-response records and feedback at four turns. It does not store an unlimited lifelong user profile or observe external ripgrep calls.

The experimental `context` policy additionally retains lexical topic terms for short anaphoric follow-ups. It adds a bounded 0.15 topic score in hybrid mode and can widen the candidate union. It remains optional: strong gains on authored ambiguous fixtures did not transfer equally to the more realistic own-code replay. Stateless retrieval is the baseline. A request to reset the task clears history explicitly.

## Retained progressive desktop pipeline

The desktop and `--retrieval legacy` keep the earlier path/ripgrep candidate funnel, capped semantic reranking, progressive events, Ask intent/evidence, optional personal/directory signals and integrity/compliance utilities. Gate 1 repaired its cache dimensions, source freshness, traversal, Unicode evidence, ranking penalties and CLI errors. Gate 2 removed paid/account/device-instance restrictions; Ask respects the selected model.

The new CLI's full-source representations and new model profiles are not automatically applied to the desktop. Desktop animation and general design remain a separate workstream. Legacy model IDs and old benchmark scripts are historical compatibility/evaluation material; a missing Pro artifact is not a shipping “true Pro” model.

## Modules and evidence

| Location | Responsibility |
|---|---|
| `src/retrieval/mod.rs` | Source refresh, lexical/semantic fusion, statistics, bounded session state |
| `src/retrieval/record.rs` | Full-source chunks and compact representatives |
| `src/retrieval/evidence.rs` | Deterministic line weights and optional bounded query-time passage selection |
| `src/retrieval/cache.rs` | Signed ADS/xattr records and application DB fallback |
| `src/retrieval/commands.rs` | Bounded output, exact read/grep, JSONL protocol |
| `src/retrieval/typo.rs` | Conservative auditable correction |
| `src/ixos_embed/` | CPU model loading/pooling and legacy embedding facilities |
| `src/parsers/` | Text/PDF/Office extraction and resource checks |
| `src/ixos_rank/` | Retained progressive pipeline and shared ignore-aware discovery |
| `eval/` | Frozen sources/labels, evidence contracts, matrix, baselines and replay |

Current benchmark numbers belong in the final restoration report, with source/model/binary hashes and timing conditions. Clean-text retrieval tests do not establish PDF layout fidelity, OCR, image embeddings, worst-device performance or autonomous agent task success. Native macOS execution and a clean public-history release remain separate checks.
