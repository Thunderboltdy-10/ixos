# Ralph Code Audit
- Iteration: `4`
- Generated: `2026-02-13T17:35:33.358042+00:00`
- Overall: **FAIL**
- TODO/FIXME count: `9`

## Cargo Clippy
- Status: **PASS**
- Command: `cargo clippy --all-targets`
- Exit code: `0`
- Duration: `5.71s`

```text
<no stdout>
```

```text
Checking ixos-protocol v0.1.0 (C:\Users\pablo\Downloads\Ixos)
warning: manual absolute difference pattern without using `abs_diff`
   --> src\activity_ledger\co_occurrence.rs:168:31
    |
168 |                       let gap = if other_ts > source_ts {
    |  _______________________________^
169 | |                         other_ts - source_ts
170 | |                     } else {
171 | |                         source_ts - other_ts
172 | |                     };
    | |_____________________^ help: replace with `abs_diff`: `other_ts.abs_diff(source_ts)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#manual_abs_diff
    = note: `#[warn(clippy::manual_abs_diff)]` on by default

warning: this `map_or` can be simplified
   --> src\activity_ledger\mod.rs:156:27
    |
156 |         let after_start = self.start.map_or(true, |s| timestamp >= s);
    |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#unnecessary_map_or
    = note: `#[warn(clippy::unnecessary_map_or)]` on by default
help: use is_none_or instead
    |
156 -         let after_start = self.start.map_or(true, |s| timestamp >= s);
156 +         let after_start = self.start.is_none_or(|s| timestamp >= s);
    |

warning: this `map_or` can be simplified
   --> src\activity_ledger\mod.rs:157:26
    |
157 |         let before_end = self.end.map_or(true, |e| timestamp < e);
    |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#unnecessary_map_or
help: use is_none_or instead
    |
157 -         let before_end = self.end.map_or(true, |e| timestamp < e);
157 +         let before_end = self.end.is_none_or(|e| timestamp < e);
    |

warning: manual implementation of `.is_multiple_of()`
   --> src\activity_ledger\mod.rs:263:12
    |
263 |         if self.events.len() % 100 == 0 {
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: replace with: `self.events.len().is_multiple_of(100)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#manual_is_multiple_of
    = note: `#[warn(clippy::manual_is_multiple_of)]` on by default

warning: this `map_or` can be simplified
   --> src\activity_ledger\mod.rs:356:17
    |
356 | /                 action_types
357 | |                     .as_ref()
358 | |                     .map_or(true, |types| types.contains(&e.action_type))
    | |_________________________________________________________________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#unnecessary_map_or
help: use is_none_or instead
    |
358 -                     .map_or(true, |types| types.contains(&e.action_type))
358 +                     .is_none_or(|types| types.contains(&e.action_type))
    |

warning: this `if` statement can be collapsed
   --> src\compliance\search_history.rs:283:25
    |
283 | /                         if file_date < cutoff {
284 | |                             if std::fs::remove_file(&path).is_ok() {
285 | |                                 deleted += 1;
286 | |                             }
287 | |                         }
    | |_________________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#collapsible_if
    = note: `#[warn(clippy::collapsible_if)]` on by default
help: collapse nested if block
    |
283 ~                         if file_date < cutoff
284 ~                             && std::fs::remove_file(&path).is_ok() {
285 |                                 deleted += 1;
286 ~                             }
    |

warning: redundant closure
   --> src\compliance\transparency.rs:237:22
    |
237 |             .map_err(|e| ComplianceError::Storage(e))?;
    |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: replace the closure with the tuple variant itself: `ComplianceError::Storage`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#redundant_closure
    = note: `#[warn(clippy::redundant_closure)]` on by default

warning: redundant closure
   --> src\compliance\transparency.rs:252:18
    |
252 |         .map_err(|e| ComplianceError::Storage(e))?;
    |                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: replace the closure with the tuple variant itself: `ComplianceError::Storage`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#redundant_closure

warning: redundant closure
   --> src\compliance\transparency.rs:255:22
    |
255 |             .map_err(|e| ComplianceError::Storage(e))?;
    |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: replace the closure with the tuple variant itself: `ComplianceError::Storage`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#redundant_closure

warning: redundant closure
   --> src\compliance\transparency.rs:260:22
    |
260 |             .map_err(|e| ComplianceError::Storage(e))?;
    |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: replace the closure with the tuple variant itself: `ComplianceError::Storage`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#redundant_closure

warning: redundant closure
   --> src\compliance\transparency.rs:271:22
    |
271 |             .map_err(|e| ComplianceError::Storage(e))?;
    |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: replace the closure with the tuple variant itself: `ComplianceError::Storage`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#redundant_closure

warning: redundant closure
   --> src\compliance\transparency.rs:278:22
    |
278 |             .map_err(|e| ComplianceError::Storage(e))?;
    |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: replace the closure with the tuple variant itself: `ComplianceError::Storage`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#redundant_closure

warning: redundant closure
   --> src\compliance\transparency.rs:281:61
    |
281 |         writeln!(stdout_lock, "{}", "━".repeat(56)).map_err(|e| ComplianceError::Storage(e))?;
    |                                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: replace the closure with the tuple variant itself: `ComplianceError::Storage`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#redundant_closure

warning: useless use of `format!`
   --> src\compliance\transparency.rs:312:26
    |
312 |         output.push_str(&format!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
    |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: consider using `.to_string()`: `"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n".to_string()`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#useless_format
    = note: `#[warn(clippy::useless_format)]` on by default

warning: useless use of `format!`
   --> src\instrumentation\reporter.rs:165:22
    |
165 |         md.push_str(&format!("| Metric | Value |\n"));
    |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: consider using `.to_string()`: `"| Metric | Value |\n".to_string()`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#useless_format

warning: useless use of `format!`
   --> src\instrumentation\reporter.rs:166:22
    |
166 |         md.push_str(&format!("|--------|-------|\n"));
    |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: consider using `.to_string()`: `"|--------|-------|\n".to_string()`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#useless_format

warning: calling `push_str()` using a single-character string literal
   --> src\instrumentation\reporter.rs:176:9
    |
176 |         md.push_str("\n");
    |         ^^^^^^^^^^^^^^^^^ help: consider using `push` with a character literal: `md.push('\n')`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#single_char_add_str
    = note: `#[warn(clippy::single_char_add_str)]` on by default

warning: calling `push_str()` using a single-character string literal
   --> src\instrumentation\reporter.rs:194:9
    |
194 |         md.push_str("\n");
    |         ^^^^^^^^^^^^^^^^^ help: consider using `push` with a character literal: `md.push('\n')`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#single_char_add_str

warning: calling `push_str()` using a single-character string literal
   --> src\instrumentation\reporter.rs:237:9
    |
237 |         md.push_str("\n");
    |         ^^^^^^^^^^^^^^^^^ help: consider using `push` with a character literal: `md.push('\n')`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#single_char_add_str

warning: casting to the same type is unnecessary (`u64` -> `u64`)
  --> src\instrumentation\sampler.rs:47:34
   |
47 |                     let mem_mb = (mem_bytes / (1024 * 1024)) as u64;
   |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: try: `(mem_bytes / (1024 * 1024))`
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#unnecessary_cast
   = note: `#[warn(clippy::unnecessary_cast)]` on by default

warning: this `if` statement can be collapsed
  --> src\integrations\academic.rs:89:17
   |
89 | /                 if slice.chars().all(|c| c.is_ascii_digit()) {
90 | |                     if slice.starts_with("19") || slice.starts_with("20") {
91 | |                         return Some(slice.to_string());
92 | |                     }
93 | |                 }
   | |_________________^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#collapsible_if
help: collapse nested if block
   |
89 ~                 if slice.chars().all(|c| c.is_ascii_digit())
90 ~                     && (slice.starts_with("19") || slice.starts_with("20")) {
91 |                         return Some(slice.to_string());
92 ~                     }
   |

warning: this manual char comparison can be written more succinctly
   --> src\ixos_embed\augmented.rs:270:28
    |
270 |     for part in name.split(|c: char| c == '_' || c == '-' || c == '.' || c == ' ') {
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: consider using an array of `char`: `['_', '-', '.', ' ']`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#manual_pattern_char_comparison
    = note: `#[warn(clippy::manual_pattern_char_comparison)]` on by default

warning: doc list item without indentation
   --> src\ixos_embed\mmap_model.rs:212:9
    |
212 |     /// Returns immediately (<1ms). Model is loaded on first `embed()` call.
    |         ^
    |
    = help: if this is supposed to be its own paragraph, add a blank line
    = help: for further information visit https://rust-lang.github.io/rust-clippy/rust-1.92.0/index.html#doc_lazy_continuation
    = note: `#[warn(clippy::doc_lazy_continuation)]` on by default
help: indent this line
    |
212 |     ///   Returns immediately (<1ms). Model is loaded on first `embed()` call.
    |         ++

warning: you should consider adding a `Default` implementation for `DescriptionExtractor`
  --> src\
```

## Cargo Test
- Status: **FAIL**
- Command: `cargo test`
- Exit code: `101`
- Duration: `24.52s`

```text
running 476 tests
test activity_ledger::tests::test_hash_stability ... ok
test activity_ledger::tests::test_create_event ... ok
test activity_ledger::co_occurrence::tests::test_no_self_co_occurrence ... ok
test activity_ledger::co_occurrence::tests::test_window_filtering ... ok
test activity_ledger::co_occurrence::tests::test_co_occurrence_tracking ... ok
test activity_ledger::storage::tests::test_memory_storage_clear ... ok
test activity_ledger::tests::test_get_activity_filtered ... ok
test activity_ledger::storage::tests::test_memory_storage_roundtrip ... ok
test activity_ledger::tests::test_ledger_basic_operations ... ok
test activity_ledger::tests::test_time_range_contains ... ok
test activity_ledger::tests::move_recommendations_require_repetition ... ok
test activity_ledger::tests::move_recommendations_surface_with_repeated_evidence ... ok
test cli::commands::tests::test_index_command ... ok
test cli::commands::tests::test_config_command ... ok
test cli::commands::tests::test_global_options ... ok
test cli::commands::tests::test_output_format_conversion ... ok
test cli::commands::tests::test_cache_mode_default ... ok
test cli::commands::tests::test_search_cache_mode ... ok
test cli::commands::tests::test_search_cache_mode_legacy_alias_jit ... ok
test cli::commands::tests::test_search_cache_mode_new_values ... ok
test cli::commands::tests::test_search_command ... ok
test cli::commands::tests::test_cli_parse ... ok
test cli::config::tests::test_cache_mode_aliases_are_normalized ... ok
test cli::commands::tests::test_version_command ... ok
test cli::commands::tests::test_search_with_options ... ok
test cli::config::tests::test_default_config ... ok
test cli::config::tests::test_get ... ok
test cli::config::tests::test_list ... ok
test cli::config::tests::test_load_nonexistent ... ok
test cli::config::tests::test_set ... ok
test cli::config::tests::test_set_invalid_value ... ok
test cli::config::tests::test_set_unknown_key ... ok
test cli::output::tests::test_create_formatter ... ok
test cli::config::tests::test_toml_serialization ... ok
test cli::config::tests::test_config_path ... ok
test cli::output::tests::test_csv_escape ... ok
test cli::output::tests::test_csv_formatter ... ok
test cli::output::tests::test_human_formatter_empty ... ok
test cli::output::tests::test_human_formatter_lexical ... ok
test cli::output::tests::test_human_formatter_semantic ... ok
test cli::output::tests::test_output_format_display ... ok
test cli::output::tests::test_output_format_parse ... ok
test cli::output::tests::test_json_formatter_lexical ... ok
test cli::output::tests::test_json_formatter_semantic ... ok
test cli::output::tests::test_ripgrep_formatter ... ok
test compliance::audit::tests::test_audit_entry_creation ... ok
test compliance::audit::tests::test_audit_entry_with_details ... ok
test compliance::audit::tests::test_hex_encode ... ok
test compliance::ccpa::tests::test_ccpa_notice_default ... ok
test compliance::ccpa::tests::test_data_category ... ok
test compliance::ccpa::tests::test_opt_out_status ... ok
test compliance::consent::tests::test_consent_record_creation ... ok
test cli::config::tests::test_save_and_load ... ok
test compliance::consent::tests::test_consent_record_with_disclosure ... ok
test compliance::consent::tests::test_consent_type_display ... ok
test compliance::consent::tests::test_consent_withdrawal ... ok
test compliance::documentation::tests::test_documentation_generation ... ok
test compliance::documentation::tests::test_limitation_severity_display ... ok
test cli::config::tests::test_unversioned_config_migrates_to_current_version ... ok
test compliance::documentation::tests::test_risk_level_display ... ok
test compliance::gdpr::tests::test_deletion_details_total ... ok
test compliance::gdpr::tests::test_export_info_creation ... ok
test compliance::documentation::tests::test_markdown_export ... ok
test compliance::gdpr::tests::test_processing_info_default ... ok
test compliance::documentation::tests::test_json_export ... ok
test compliance::search_history::tests::test_search_history_entry_creation ... ok
test compliance::search_history::tests::test_search_mode_display ... ok
test compliance::storage::tests::test_validator_rejects_short_data ... ok
test compliance::storage::tests::test_validator_detects_tampering ... ok
test compliance::storage::tests::test_validator_sign_verify_roundtrip ... ok
test compliance::tests::test_disclosure_version ... ok
test compliance::transparency::tests::test_default_disclosure ... ok
test compliance::transparency::tests::test_disclosure_cli_format ... ok
test compliance::types::tests::test_data_subject_request_creation ... ok
test compliance::transparency::tests::test_disclosure_json ... ok
test compliance::types::tests::test_deletion_scope_parsing ... ok
test compliance::types::tests::test_regulation_deadlines ... ok
test compliance::types::tests::test_request_status_update ... ok
test daemon::config::tests::test_default_config ... ok
test daemon::config::tests::test_journalist_config ... ok
test daemon::config::tests::test_should_index_extension ... ok
test instrumentation::metrics::tests::test_metrics_collector ... ok
test instrumentation::metrics::tests::test_percentiles ... ok
test instrumentation::reporter::tests::test_baseline_generation ... ok
test ixos_embed::augmented::tests::test_augmentation_config ... ok
test daemon::service::tests::test_daemon_stats ... ok
test daemon::service::tests::test_daemon_creation ... ok
test ixos_embed::augmented::tests::test_config_validation ... ok
test ixos_embed::augmented::tests::test_extract_filename_tokens ... ok
test ixos_embed::augmented::tests::test_extract_path_tokens ... ok
test ixos_embed::augmented::tests::test_split_camel_case ... ok
test ixos_embed::augmented::tests::test_tokenize_name ... ok
test ixos_embed::chunker::tests::test_empty_content ... ok
test ixos_embed::chunker::tests::test_large_content_chunking ... ok
test ixos_embed::chunker::tests::test_max_file_size_truncation ... ok
test ixos_embed::chunker::tests::test_overlap_calculation ... ok
test ixos_embed::chunker::tests::test_paragraph_splitting ... ok
test ixos_embed::chunker::tests::test_small_content_no_chunking ... ok
test ixos_embed::chunker::tests::test_unicode_character_splitting ... ok
test ixos_embed::chunker::tests::test_whitespace_only_content ... ok
test ixos_embed::memory_protection::tests::test_memory_protection_config_default ... ok
test ixos_embed::memory_protection::tests::test_mlock_graceful_degradation ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_as_str ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_creation ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_empty ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_from_string ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_into_inner ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_large_data_skips_lock ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_mutable_access ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_unlocked ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_with_custom_config ... ok
test ixos_embed::memory_protection::tests::test_secure_buffer_zeroizes_on_drop ... ok
test ixos_embed::memory_protection::tests::test_secure_embedding_buffer_as_slice ... ok
test ixos_embed::memory_protection::tests::test_secure_embedding_buffer_creation ... ok
test ixos_embed::memory_protection::tests::test_secure_embedding_buffer_from_vec ... ok
test ixos_embed::memory_protection::tests::test_secure_embedding_buffer_into_inner ... ok
test ixos_embed::memory_protection::tests::test_secure_embedding_buffer_mutable_access ... ok
test ixos_embed::memory_protection::tests::test_secure_embedding_buffer_to_vec ... ok
test ixos_embed::memory_protection::tests::test_secure_embedding_buffer_zeroize_trait ... ok
test ixos_embed::mmap_model::tests::test_cache_status ... ok
test ixos_embed::mmap_model::tests::test_from_path_nonexistent ... ok
test ixos_embed::mmap_model::tests::test_from_pretrained_custom_model ... ok
test ixos_embed::mmap_model::tests::test_huggingface_cache_detection ... ok
test ixos_embed::mmap_model::tests::test_mmap_embedder_creation ... ok
test ixos_embed::mmap_model::tests::test_mmap_embedder_dimensions_default ... ok
test ixos_embed::mmap_model::tests::test_mmap_embedder_embed_quality ... ignored, requires network access to download model
test ixos_embed::mmap_model::tests::test_mmap_embedder_fingerprint_consistent ... ok
test ixos_embed::mmap_model::tests::test_mmap_embedder_lazy_load ... ignored, requires network access to download model
test ixos_embed::mmap_model::tests::test_mmap_embedder_model_id ... ok
test ixos_embed::mmap_model::tests::test_mmap_embedder_not_loaded_initially ... ok
test ixos_embed::mmap_model::tests::test_mmap_embedder_thread_safety ... ignored, requires network access to download model
test ixos_embed::mmap_model::tests::test_new_ixos_handles_missing_model ... ok
test ixos_embed::model2vec::tests::test_model2vec_creation ... ignored, requires network access to download model
test ixos_embed::model2vec::tests::test_model2vec_embed ... ignored, requires network access to download model
test ixos_embed::model2vec::tests::test_model2vec_similarity ... ignored, requires network access to download model
test ixos_embed::model2vec::tests::test_model_id ... ok
test ixos_embed::model::tests::test_stub_model_custom_dims ... ok
test ixos_embed::model::tests::test_stub_model_deterministic ... ok
test ixos_embed::model::tests::test_stub_model_different_inputs ... ok
test ixos_embed::model::tests::test_stub_model_dimensions ... ok
test ixos_embed::model::tests::test_stub_model_embed_batch ... ok
test ixos_embed::mmap_model::tests::test_available_models ... ok
test ixos_embed::model::tests::test_stub_model_embed_batch_empty ... ok
test ixos_embed::model::tests::test_stub_model_embed_length ... ok
test ixos_embed::model::tests::test_stub_model_fingerprint ... ok
test ixos_embed::model::tests::test_stub_model_normalized ... ok
test ixos_embed::prefetcher::tests::test_cache_size_tracking ... ok
test ixos_embed::background_indexer::tests::test_indexer_double_start ... ok
test ixos_embed::prefetcher::tests::test_prefetch_nonexistent_file ... ok
test ixos_embed::prefetcher::tests::test_cache_clear ... ok
test ixos_embed::secure_embedder::tests::test_embed_batch_secure_empty ... ok
test ixos_embed::secure_embedder::tests::test_embed_batch_secure_faster_than_sequential ... ok
test ixos_embed::secure_embedder::tests::test_embed_batch_secure_produces_embeddings ... ok
test ixos_embed::secure_embedder::tests::test_embed_batch_secure_matches_single ... ok
test ixos_embed::secure_embedder::tests::test_embed_batch_sync_produces_embeddings ... ok
test ixos_embed::secure_embedder::tests::test_embed_batch_secure_timing_floor ... ok
test ixos_embed::background_indexer::tests::test_indexer_progress_updates ... ok
test ixos_embed::secure_embedder::tests::test_embed_secure_produces_embedding ... ok
test ixos_embed::background_indexer::tests::test_indexer_start_stop ... ok
test ixos_embed::prefetcher::tests::test_prefetch_small_file ... ok
test ixos_embed::secure_embedder::tests::test_embed_sync_deterministic ... ok
test ixos_embed::secure_embedder::tests::test_embed_secure_constant_time_floor ... ok
test ixos_embed::secure_embedder::tests::test_normalize_content_exact ... ok
test ixos_embed::secure_embedder::tests::test_normalize_content_long ... ok
test ixos_embed::secure_embedder::tests::test_normalize_content_short ... ok
test ixos_embed::secure_embedder::tests::test_embed_sync_produces_embedding ... ok
test ixos_rank::candidate_generator::document_engine::tests::test_bm25_score_calculation ... ok
test ixos_rank::candidate_generator::document_engine::tests::test_empty_query ... ok
test ixos_rank::candidate_generator::document_engine::tests::test_is_docume
```

```text
Compiling ixos-protocol v0.1.0 (C:\Users\pablo\Downloads\Ixos)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 10.94s
     Running unittests src\lib.rs (target\debug\deps\ixos_protocol-84cb6656b9dd4a69.exe)
     Running unittests src\main.rs (target\debug\deps\ixos-f8decd642f2a1358.exe)
     Running unittests src\bin\ixos-agent-benchmark.rs (target\debug\deps\ixos_agent_benchmark-93944fddf3bd9544.exe)
     Running unittests src\bin\ixos-bench.rs (target\debug\deps\ixos_bench-2ab7b2f75a13e2f5.exe)
     Running unittests src\bin\ixos-big-bench.rs (target\debug\deps\ixos_big_bench-7b976798cecd454b.exe)
     Running unittests src\bin\ixos-perf-suite.rs (target\debug\deps\ixos_perf_suite-d2c313243dc86101.exe)
     Running unittests src\bin\ixos-profile.rs (target\debug\deps\ixos_profile-939b99dd902f9dc6.exe)
     Running unittests src\bin\ixos-scale-bench.rs (target\debug\deps\ixos_scale_bench-9fa7c0258a240a74.exe)
     Running tests\settings_matrix.rs (target\debug\deps\settings_matrix-8bed62da03583ad0.exe)
error: test failed, to rerun pass `--test settings_matrix`
```
