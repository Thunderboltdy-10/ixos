# Architecture

`ixos-core` owns discovery, extraction, models, records, cache management, ranking and snippets. The CLI and MCP call the same library. The desktop uses the lightweight `ixos-runtime` client to talk to an owned instance of that same executable; it no longer links a separate core.

## Pipeline

1. Walk the chosen locations using ignore rules, without following symlinks. Skip unhydrated cloud placeholders and unsupported or oversized sources.
2. Read changed source bytes and extract text, PDF or Office content. Hash both the primary bytes and normalized extracted text.
3. Build full-text BM25 statistics, including path terms. The code profile embeds representative passages; the documents profile embeds a whole-text centroid.
4. Reuse matching cache records or embed missing passages on CPU. The encoded loader decodes vocabulary rows as needed, pools in float32 and normalizes vectors.
5. Rank files, select a query-time snippet and serialize a bounded response.

Code text is split into passages of up to 1,800 Unicode characters, preferring nearby line or word boundaries. Up to four passages are selected for shorter sources and eight for longer sources, spaced from the introduction to the end. Documents use one normalized whole-text vector. Search limits are 16 MiB per file and 256 MiB of combined extracted text; exceeding the combined limit returns an error.

## Records

Records live in `:ixos` on Windows or `user.ixos` on Unix. File metadata travels with the source on filesystems and copy tools that preserve it, and avoids a separate persistent search index. Unsupported metadata storage falls back to one LMDB database under the application cache. Records are portable when source content and the model recipe match.

All multibyte integers are little-endian. The checksum covers all preceding bytes.

| Field | Bytes |
|---|---:|
| `IXOS` magic | 4 |
| Format version | 1 |
| Model/representation fingerprint | 32 |
| Extracted-source fingerprint | 32 |
| Dimensions | 2 |
| Passage count | 1 |
| Each passage: byte start/end, line start/end, float32 scale | 28 |
| Each passage: normalized int8 vector | dimensions |
| xxh3 64-bit checksum | 8 |

A record is `80 + count * (28 + dimensions)` bytes. The code model has 256 dimensions and at most eight passages (2,352 bytes); documents has 512 dimensions and one passage (620 bytes). Decoding validates counts, dimensions, locators, fingerprints and checksum. Live vectors use the same quantization as cached vectors.

## Freshness and resident state

Each search walks the locations again to discover new and deleted files. A resident engine remembers size, modified time, file identity and an OS change indicator. Matching metadata permits reuse only when the timestamp is outside the two-second race window; otherwise Ixos reads and hashes the file. Filesystems without usable identity use the full-hash path. Changed primary bytes force re-extraction, and source/model fingerprints decide whether a stored record remains valid.

MCP and the desktop keep models, parsed text, vectors and BM25 statistics in RAM. Only changed files update document frequencies and total length. Lexical searches reuse parsed sources without embedding them; switching to hybrid fills missing vectors. The desktop maintains one corpus across chosen locations, so changing location scope does not duplicate the engine or model.

## Ranking and snippets

BM25 uses `k1=1.2` and `b=0.75`. Hybrid candidates are the union of the top 100 positive lexical scores and top 100 semantic scores above 0.25. Ranking combines equal weights of cosine similarity and BM25 divided by the highest lexical score. Exact identifier queries require the identifier in the path or source. Conservative typo correction protects identifiers, paths, numbers and quoted text. Scores are rankings, not probabilities.

With a model, snippet selection considers the stored passages plus up to eight query-relevant passages, at most 16 per file. A blend of cosine similarity and lexical line weight chooses a passage, then the strongest lexical line anchors the excerpt. Lexical mode uses the best lexical line directly. Snippets have exact source coordinates; responses are capped at 6,000 bytes, shortening or omitting snippets before reducing returned files.

`cache clear` shares one core function across the CLI and desktop. It removes only Ixos metadata and matching database entries. It never opens a primary file for writing or follows symlinks; tests verify bytes, modified time and unrelated metadata survive on Windows and Linux.

## Optional evidence and exact inspection

File ranking, models and primary snippets remain the baseline. Explicit code evidence can expose a compact alternative from existing passages or parse bounded function units for the top three ranked files. Function parsing is limited by source bytes, time, node count and unit count; unsupported sources fall back to passages. Resident source-versioned function vectors are bounded and are not a persistent passage index. Names, declarations and extents come from actual source. JavaScript/TypeScript static assigned functions use their public binding identity, including prototype assignments; dynamic receivers and computed keys are not guessed.

`read` remains exact: inclusive ranges, exact parsed definitions, optional bodies and independent batches. It validates source hashes and reports truncation/continuation. A small validated resident source cache avoids repeated extraction. It contains no approximate source ranking, related-code expansion or automatic implementation packages. See [MCP](MCP.md) and [installation/runtime reliability](INSTALLATION.md).
