# Agent Prompt: Ixos Pre-Roadmap Reality Audit (V2)

Copy/paste the block below into your autonomous agent (Codex / Claude / etc.).

---

## Prompt

You are **Ralph-loop Deep Research + Engineering Agent** running inside Pablo’s Ixos repo.

**Mission:** Produce a *reality-accurate* implementation + correctness + performance report **before** any new roadmap work or feature additions. You must work independently. Do not ask the user for help unless absolutely blocked.

### Hard rules
- **No code changes** (read-only), *except* writing new artifacts under `/reports`.
- Every non-trivial claim must include either:
  - file path + symbol name + line snippet, OR
  - command + captured stdout/stderr.
- If a step fails, record the failure and continue.
- Prefer evidence over interpretation.

### Output artifacts
1) `/reports/AGENT_REALITY_AUDIT_V2_<YYYY-MM-DD_HHMM>.md`
2) Raw artifacts referenced by the report:
   - `/reports/profile_*.(json|md)`
   - `/reports/scale_bench_*.(json|md)`
   - `/reports/cache_audit_*.txt`
   - `/reports/format_matrix_*.md`
   - `/reports/settings_matrix_*.csv`

---

## Step 0 — Snapshot
Record:
- OS + filesystem (NTFS/APFS/ext4) + disk type (SSD/HDD) if possible.
- CPU, RAM.
- Rust + Cargo versions.
- Git: branch, HEAD SHA, `git status -sb`.

---

## Step 1 — Build + tests (must run)
Run and save outputs:
- `cargo test`
- `cargo build --release`
- `cargo test parsers`

Also list release binaries:
- `ls -lah target/release | head -200`

---

## Step 2 — Feature surface inventory (CLI + UI parity)
Run:
- `./target/release/ixos --help`
- `./target/release/ixos search --help`
- `./target/release/ixos cache --help`
- `./target/release/ixos index --help`
- `./target/release/ixos daemon --help`
- `./target/release/ixos doctor --help`

Produce a **Settings Matrix CSV**:
- Enumerate every meaningful toggle combination that could affect correctness or privacy.
- Include: cache-mode, journalist/hardened, secure-timing, progressive on/off, ask-mode, search-mode (flash/pro/auto), model/pro-model.
- Output: `/reports/settings_matrix_<ts>.csv`

---

## Step 3 — Code reality map (must cite code)
Find and cite the exact code paths implementing:

### Search pipeline
- Candidate generation: PathIndex + ripgrep funnel.
- Semantic rerank: embedding + ranking.
- Progressive engine: fallbacks + streaming.
- Evidence extraction: passage extractor.

### Cache + invalidation
- Cache backend selection (ADS / xattr / LMDB fallback / null).
- What keys are used (embedder ID, model fingerprint).
- Invalidation logic (file hash / mtime / etc.).

### Pro v2
- Auto routing: how the “uncertain region” is computed.
- Fusion weights and where they are applied.

### Ask Mode
- How it’s triggered in UI and whether it’s exposed via CLI.
- How it computes “trust” (snippets, anchors, etc.).

---

## Step 4 — Performance: SMALL datasets (repro) + BIG root (realistic)

### 4A) Small reproducible profiles (dataset)
Run:
- `cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model ixos-flash-v2 --out reports/profile_flashv2_jit_<ts>.json`
- `cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode cache --model ixos-flash-v2 --out reports/profile_flashv2_cache_<ts>.json`
- `cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model potion --out reports/profile_potion_jit_<ts>.json`

Summarize:
- TTFR p50/p95
- Total p50/p95
- Stage p50/p95: directory_walk, ripgrep_scan, embedding, ranking, evidence

### 4B) Scale bench (real-world query sampling)
Run:
- `python scripts/scale_bench.py --search-mode auto --cache-mode jit --model ixos-flash-v2 --pro-model ixos-pro-v2 --max-queries 50 --out reports/scale_bench_auto_jit_<ts>.json`
- Repeat for `--cache-mode cache`.

### 4C) Big-root reality bench (critical)
Pick a **real root** that approximates Pablo’s target (100k–300k files). If the machine doesn’t have it, generate a synthetic tree (lots of small files + some large PDFs/DOCX) under `/tmp/ixos_bigroot`.

Run for 20 queries (mix: identifier, phrase, fuzzy semantic question, date/number query):
- `./target/release/ixos search "<q>" --dir <bigroot> --cache-mode jit --search-mode auto --progressive --evidence --format json > reports/bigroot_<mode>_<i>.json`
- Repeat with `--cache-mode cache`.

Compute and report:
- cold first-run TTFR/total
- warm second-run TTFR/total
- p50/p95 across the 20 queries
- stage breakdown if available

---

## Step 5 — Cache correctness + storage economics

### 5A) ADS/xattr verification
For 5 files:
- show how the ADS/xattr entry is created
- show its size
- show that it is reused on the next search

### 5B) Invalidation on change
For 3 files:
- modify content
- rerun search
- prove cache invalidated and rebuilt

### 5C) Storage report
Run:
- `./target/release/ixos cache stats --dir <bigroot> > reports/cache_stats_<ts>.txt`
- `./target/release/ixos cache audit --dir <bigroot> > reports/cache_audit_<ts>.txt`

Report:
- total cache bytes
- bytes per 1k files
- hit rate

---

## Step 6 — Parsing & format “works 100%” audit
Build a **format matrix** on both fixtures and bigroot:
- PDFs: text PDF + scanned PDF
- DOCX
- PPTX
- XLSX
- RTF
- image (png/jpg)

For each:
- Does parser succeed? If partial, what cap triggers?
- Does query find content inside?
- Does evidence snippet show the right span?

Output:
- `/reports/format_matrix_<ts>.md`

---

## Step 7 — Ask Mode audit (quality + UX contract)
Even if Ask Mode is UI-only, test it via the same internal entrypoint the UI uses.

Prove:
- Ask Mode respects selected model (no silent Pro forcing)
- Ask Mode produces evidence-backed snippet
- Ask Mode does not degrade TTFR substantially

If Ask Mode is not accessible via CLI:
- document exact missing wiring and recommend minimal CLI flag shape

---

## Step 8 — Stoplight + bottleneck hypotheses (ranked)
Finish the report with:
1) Stoplight table: Green/Yellow/Red by feature
2) Bottleneck ranking (measured) for bigroot
3) The top 10 changes ranked by ROI, but only if supported by measurements

**Stop condition:** You are done only when all Steps 0–8 have an artifact-backed section in the markdown.
