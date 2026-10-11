# Ixos repository contract

The primary product is the Rust CLI for code and document retrieval. The desktop is a secondary interface; this remains a monorepo. All features are free/open source. The February Flash/Pro restoration contract is preserved under `docs/archive/pre-restoration/AGENTS.md`; its unmeasured targets and model branding are historical.

## Structure and commands

- `src/retrieval/`: current search/grep/read/serve, records, stats and bounded sessions.
- `src/ixos_embed/`, `src/parsers/`, `src/storage/`, `src/ixos_rank/`: CPU runtime/extraction/shared and retained progressive facilities.
- `ixos-search/src-tauri/`, `ixos-search/ui/`: desktop Rust/React. `ixos-site/`: Next.js. `packages/` and `shared/`: shared product primitives.
- `eval/`, `scripts/`, `config/`: versioned evaluation and model setup. `reports/restoration/`: receipts. `legacy/` and `docs/archive/`: historical, not current truth.
- `cargo build --release --locked --bin ixos`; `cargo test --workspace --locked --jobs 2`.
- `python -m unittest discover -s eval -t .`; real model probes under `scripts/verify_*`.
- `npm ci`; `npm run dev`; `npm run tauri:dev`; `npm run site:dev`. UI/site builds are separate from core runtime proof. Local site guardrails also apply.

## Engineering and evidence

1. Observe → Hypothesize → Implement → Measure → Decide → Document. Baseline/profile before optimizing. Never count stub inference as actual-model quality or cache proof.
2. Each performance/quality claim needs commands, raw receipts, exact source/binary/model/corpus identities and before/after conditions. Preserve failures. Sample size is unique labeled queries/families, not repeated commands.
3. Select using dev/validation. Frozen held-out recipes in `eval/final-selection.json` cannot be tuned from inspected test results. New inspection-driven changes need fresh held-out data or exploratory labeling.
4. Distinguish fresh JIT, fresh native warm and resident warm. Verify actual cache hits. Count stdout and diagnostic stderr tokens. Input byte limits are not process RSS guarantees.
5. Preserve primary source bytes and ignore policy. No embedding sidecars in searched folders; ADS/xattr or application-cache DB only. Edits invalidate disk and RAM representations. JIT remains available.
6. Retain external model names/licenses/cards. Removing tokenizer limits or row storage quantization is not training, distillation or integer inference. Legacy IDs remain compatibility baselines, not invented new generations.
7. Bounded session intelligence is explicit, resettable and optional. Feedback must refer to actually displayed results and current sources. Silence is unknown; external rg is not observed.

## Persistent state

Maintain `PLAN.md` (current next steps), append-only `RUNLOG.md` and `DECISIONS.md` (keep/revert/pivot). Before compaction or a large pivot, append a **STATE SNAPSHOT** with current baselines/best measured results, bottlenecks and next three tasks. Public receipts live under reports; private authorship/application/chat records stay excluded through `.git/info/exclude`.

## Changes and history

Use Rust 2021/rustfmt, snake_case modules and PascalCase React components. Format changed files without recursively rewriting unrelated modules. Run relevant correctness checks and real-artifact probes for ranking/cache/extraction changes. Use Conventional Commits, `codex/` branches and coherent gate-sized commits. Never stage envs, downloaded weights/data, private records or build outputs. No public push, destructive history rewrite or release until historical keys are revoked/rotated and a reviewed history plan is applied.

Archived documents are immutable progression evidence. Copy/move with hash verification before replacing an active guide. Retired Ixplorer and old experiments may remain in legacy; do not restore them into the default product implicitly.

## Product surfaces

Do not ship generic AI flowcharts, node-link diagrams or decorative architecture maps. Explanations use real product labels, rows, result cards, chips and source badges. Landing app demos use `@ixos/ixos-ui` via `src/landing/DemoSurface.tsx` and `DemoSurfaceShell.tsx`. Preserve desktop animations/general styling unless an actual failure requires a fix. Do not imply the desktop uses the measured CLI engine before an integration verifies that.
