# Ixos Copy Deck — Landing Page

**Tone**: Precise. Confident. Technical without gatekeeping. Proof-forward, never hype.
**Voice**: A senior engineer who built it and knows exactly what it does.

---

## Global Elements

### Logo Tagline
```
IX OS protocol
```

### Nav Links
```
Flow   Proof   Ask   Pricing
```

### Primary CTA
```
Download — free
```

### Secondary CTA
```
Read the docs →
```

---

## Hero Section

### Headline (above search box)
```
Search that converges.
```

### Sub-headline
```
Ixos runs lexical and semantic retrieval in parallel,
then locks on evidence. Entirely on your device.
```

### Search Placeholder
```
Try: "authentication token refresh"
```

### Search Phase Labels
- **Phase 1**: `SCANNING` — `lexical sweep · 312 files`
- **Phase 2**: `RERANKING` — `semantic pass · 47 candidates`
- **Phase 3**: `LOCKED` — `evidence confirmed · 0.94 confidence`

### Quality Mode Labels
- `Flash` — fast, local
- `Auto` — balanced
- `Pro` — max recall

### Result Lock Badge
```
Evidence confirmed
```

### Evidence Panel Header
```
Why this matched
```

---

## Section 02 — Filesystem Sweep

### Title
```
No daemon. No stale index.
```

### Body
```
Every query starts with a parallel scan. Ixos reads
your directory fresh — no background process, no sync lag,
no index drift. If the file changed, the result reflects it.
```

### Stat Pills
- `JIT` — strategy
- `rayon` — parallelism
- `none` — telemetry

---

## Section 03 — Performance Cluster

### Title
```
Numbers with sources.
```

### Metrics
- `~7ms` — `1,000 files loaded (parallel)`
- `<800ms` — `full search, stub model`
- `0` — `daemons, background processes`

### Source Label
```
From CLAUDE.md benchmarks — reproducible with cargo test
```

---

## Section 04 — Progressive Lock

### Title
```
Three stages. One deterministic state per scroll position.
```

### Body
```
Progressive search isn't streaming — it's controlled convergence.
Stage 1 shows what lexical finds. Stage 2 adds semantic reranking.
Stage 3 locks on the evidence trail. You can stop at any stage.
```

### Stage Labels
- `01` `SCANNING` — `lexical pass`
- `02` `RERANKING` — `embedding pass`
- `03` `LOCKED` — `evidence confirmed`

---

## Section 05 — Pipeline Map

### Title
```
Four explicit stages. Inspectable at each boundary.
```

### Body
```
Ixos doesn't collapse retrieval into an opaque score.
Each stage is named, sourced, and inspectable.
The hybrid merge adapts under degradation.
```

### Stage Labels
1. `JIT Scan` — `rayon · parallel`
2. `Lexical Engine` — `BM25-like · keyword`
3. `Semantic Engine` — `Model2Vec · embedding`
4. `Hybrid Merge` — `adaptive · attack-aware`

---

## Section 06 — Benchmarks

### Title
```
Canonical results. Not cherry-picked.
```

### Body
```
Flash and Pro are benchmarked from fixed model versions.
MRR@10 from reproduced canonical runs in models/lab/.
```

### Benchmark Cards
- **Flash v2**: `MRR@10: 0.8340` · `339ms/1k` · `16.6MB · int8`
- **Pro v2**: `MRR@10: 0.9209` · `430ms/1k` · `~102MB · fusion`

---

## Section 07 — Compute Budget

### Title
```
You control the trade-off.
```

### Body
```
Flash runs fast and light. Pro maximizes recall.
Auto routes each query to the right budget.
The triangle shows what you're optimizing.
```

### Mode Labels (in triangle)
- Corner 1: `Speed`
- Corner 2: `Accuracy`
- Corner 3: `RAM`

---

## Section 08 — Capability Matrix

### Title
```
Desktop and CLI. Different surfaces, same engine.
```

### Body
```
The search engine is identical across both.
Desktop adds visual context, history, and Pro views.
CLI adds JSON/CSV/ripgrep output for pipeline use.
```

### Matrix Column Headers
- `Desktop`
- `CLI`

---

## Section 09 — System Internals

### Title
```
Every cache entry is signed.
```

### Body
```
Embeddings are stored as 225-byte signed records.
HMAC-SHA256 verifies integrity on read.
ADS on NTFS, xattr on Unix, in-memory on FAT32.
Ed25519 attests result provenance.
```

### Cache Format (code-style label)
```
[version:u8][fingerprint:32b][hash:32b][embedding:128b][sig:32b]
```

---

## Section 10 — CLI

### Title
```
Scriptable. Reproducible. Ships in one binary.
```

### Body
```
JSON output for pipelines. ripgrep format for tools.
--journalist-mode for maximum privacy.
--progressive to see stages in your terminal.
```

### CLI Example Labels
- `Journalist mode` — `--journalist-mode`
- `JSON pipeline` — `--json | jq`
- `Progressive view` — `--progressive`
- `Score breakdown` — `--show-scores`

---

## Section 11 — Ask Mode

### Title
```
Ask without locking into Pro.
```

### Body
```
Intent detection routes your question to the retrieval
pipeline first. Evidence is assembled locally, then
surfaced with citations — no model call required for search.
Ask mode is available on Auto and Pro.
```

---

## Section 12 — Local Privacy

### Title
```
Your files don't leave your device.
```

### Body
```
Search runs in-process. No telemetry by default.
No cloud index, no sync, no API keys.
Ephemeral mode writes nothing to disk.
Journalist mode adds timing protection.
```

### Privacy Guarantees (card labels)
- `Local computation` — `All embeddings on-device`
- `No cloud index` — `Files never transmitted`
- `Zero telemetry` — `No usage data collected`
- `Ephemeral mode` — `No persistent cache writes`

---

## Section 13 — Pro Value Loop

### Title
```
Context that persists. Sessions that cluster.
```

### Body
```
Today shows what you left unfinished.
Workstreams groups your sessions automatically.
Ask gives you Q&A with citations from those sessions.
```

### Feature Labels
- `Today` — `Resume where you stopped`
- `Workstreams` — `Clustered session context`
- `Ask` — `Q&A from your own files`

---

## Section 14 — Pricing

### Title
```
Free search. Pro context.
```

### Free Plan
```
Free — forever
——————————————
Hybrid semantic search
CLI + Desktop
All cache modes
Unlimited local queries
```

### Pro Plan
```
Pro — $X/mo
——————————————
Everything in Free
Today (activity ledger)
Workstreams (auto-cluster)
Ask mode (evidence Q&A)
Priority model updates
```

---

## Section 15 — CTA

### Headline
```
Start searching.
```

### Sub-headline
```
Ixos is free to download. No account required for search.
```

### Platform Buttons
- `macOS` — Apple Silicon + Intel
- `Windows` — x64
- `Linux` — x86_64

### Secondary Link
```
View documentation →
```

---

## Footer

### Navigation Groups
- **Product**: Search, Today, Workstreams, Ask, CLI
- **Docs**: Architecture, CLI reference, Privacy, Changelog
- **Legal**: Terms, Privacy policy

### Footer Tagline
```
IX OS protocol — local-first semantic search
```
