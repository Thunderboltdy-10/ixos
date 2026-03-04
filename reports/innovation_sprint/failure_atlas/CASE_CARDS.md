# Failure Atlas Case Cards

## Coverage
- `exact_anchor`: 10 cases
- `semantic_drift`: 2 cases
- `privacy_guard`: 2 cases
- `ambiguous_short`: 1 case
- `large_directory_stress`: 1 case

## Cards

### 1) `exact_anchor_results_streamed_flash`
- Query: `results streamed` (`flash`)
- Witness: `corpus_tiny/logs/app.log` line `Results streamed`
- Must include: `corpus_tiny/logs/app.log` in top-5
- Must not include: `corpus_tiny/restricted/secret.txt` in top-5
- Why it matters: direct trust test for obvious anchor and privacy non-leak on benign query.

### 2) `exact_anchor_results_streamed_pro_control`
- Query: `results streamed` (`pro`)
- Witness: same as case 1
- Must include: `corpus_tiny/logs/app.log` in top-5
- Why it matters: control to isolate routing/model effects from corpus ambiguity.

### 3) `semantic_drift_results_streamed_auto_secret`
- Query: `results streamed` (`auto`)
- Witness: restricted file content unrelated to streamed results
- Must not include: `corpus_tiny/restricted/secret.txt` in top-5
- Why it matters: “plausible but wrong” semantic hit erodes user trust.

### 4) `exact_anchor_config_json`
- Query: `config json` (`flash`)
- Witness: `corpus_tiny/data/config.json`
- Must include: `corpus_tiny/data/config.json` in top-5
- Why it matters: filename/type anchor should beat semantically related markdown.

### 5) `exact_anchor_api_reference_endpoints`
- Query: `endpoints /search /config /compliance` (`flash`)
- Witness: endpoint list in `corpus_tiny/docs/api_reference.md`
- Must include: `corpus_tiny/docs/api_reference.md` in top-3
- Why it matters: exact technical anchor retrieval.

### 6) `exact_anchor_privacy_policy`
- Query: `local-only no telemetry` (`flash`)
- Witness: phrase in `corpus_tiny/docs/privacy_policy.md`
- Must include: `corpus_tiny/docs/privacy_policy.md` in top-3
- Why it matters: policy claims must be grounded in exact evidence.

### 7) `unicode_anchor_nandu_notes`
- Query: `ñandú notes` (`flash`)
- Witness: unicode filename path
- Must include: `corpus_tiny/nested/level1/level2/über/ñandú_notes.txt` in top-5
- Why it matters: Unicode+deep-path robustness.

### 8) `ambiguous_short_notes`
- Query: `notes` (`flash`)
- Witness: `meeting_notes_2024-11-15.txt`
- Must include: `corpus_tiny/docs/meeting_notes_2024-11-15.txt` in top-5
- Why it matters: short ambiguous query stress.

### 9) `exact_anchor_meeting_date`
- Query: `meeting notes 2024-11-15` (`flash`)
- Witness: exact date/title match
- Must include: `corpus_tiny/docs/meeting_notes_2024-11-15.txt` in top-3
- Why it matters: precision on mixed text+date anchor.

### 10) `anchor_project_plan_milestones`
- Query: `project plan milestones` (`flash`)
- Witness: `project_plan_2025.md`
- Must include: `corpus_tiny/docs/project_plan_2025.md` in top-5
- Must not include: `corpus_tiny/restricted/secret.txt` in top-5
- Why it matters: high-frequency user intent with privacy guard.

### 11) `pricing_false_negative_flash`
- Query: `free and pro tiers` (`flash`)
- Witness: exact phrase in `corpus_tiny/web/pricing.html`
- Must include: `corpus_tiny/web/pricing.html` in top-5
- Why it matters: known false-negative anchor failure.

### 12) `pricing_control_pro`
- Query: `free and pro tiers` (`pro`)
- Witness: same as case 11
- Must include: `corpus_tiny/web/pricing.html` in top-5
- Why it matters: control for model/rerank capability.

### 13) `privacy_non_request_no_secret`
- Query: `roadmap phase` (`flash`)
- Witness: `corpus_tiny/markdown/roadmap.md`
- Must include: `corpus_tiny/markdown/roadmap.md` in top-5
- Must not include: `corpus_tiny/restricted/secret.txt` in top-5
- Why it matters: no-leak baseline for unrelated queries.

### 14) `privacy_explicit_secret_request`
- Query: `restricted data` (`flash`)
- Witness: `corpus_tiny/restricted/secret.txt`
- Must include: `corpus_tiny/restricted/secret.txt` in top-5
- Why it matters: verifies allowed explicit retrieval path.

### 15) `anchor_search_engine_symbol`
- Query: `search engine` (`flash`)
- Witness: `corpus_tiny/code/search_engine.rs`
- Must include: `corpus_tiny/code/search_engine.rs` in top-5
- Why it matters: code-symbol precision test.

### 16) `large_dir_stress_tauri_command`
- Query: `tauri search command` (`flash`, `--dir .`)
- Witness: `src-tauri/src/commands/search.rs`
- Must include: `src-tauri/src/commands/search.rs` in top-10
- Why it matters: realistic large-tree retrieval stress.
- Volatility: excluded (expensive; measured separately by Ralph/bench).
