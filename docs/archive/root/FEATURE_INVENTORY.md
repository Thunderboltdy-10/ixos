# FEATURE_INVENTORY

This is the source-of-truth feature checklist for landing coverage and desktop parity work.

## Desktop App Features

| ID | Feature | User-facing behavior | Source paths |
|---|---|---|---|
| D-01 | Progressive search pipeline | Search streams lexical -> semantic -> refining updates | `ixos-search/ui/src/components/search/MainSearchView.tsx`, `ixos-search/ui/src/stores/searchStore.ts`, `ixos-search/src-tauri/src/commands/search.rs` |
| D-02 | Streaming lexical batches | Early candidate rows stream while scan continues | `ixos-search/ui/src/stores/searchStore.ts` (`lexicalBatch` handling), `ixos-search/src-tauri/src/commands/search.rs` |
| D-03 | Semantic rerank + final list | Ranked semantic results replace/augment lexical set | `ixos-search/ui/src/components/search/SearchResults.tsx`, `ixos-search/ui/src/stores/searchStore.ts` |
| D-04 | Late insights | Post-complete late result insertion and reveal badge | `ixos-search/ui/src/components/search/LateInsightBadge.tsx`, `ixos-search/ui/src/stores/searchStore.ts` |
| D-05 | Ask Mode auto intent path | Question-style query handling with Pro-aware gating | `src/ixos_rank/ask_mode/*`, `ixos-search/src-tauri/src/commands/search.rs`, `ixos-search/ui/src/stores/searchStore.ts`, `ixos-search/ui/src/components/search/AskModeSwitcher.tsx` |
| D-06 | Model/mode selection | Flash/Pro/Auto + flash/pro model routing in search options | `ixos-search/ui/src/components/search/ModeSwitcher.tsx`, `ixos-search/ui/src/components/search/ModelSwitcher.tsx`, `ixos-search/ui/src/components/settings/SearchSettings.tsx`, `ixos-search/src-tauri/src/commands/search.rs` |
| D-07 | Evidence/Why matched UX | Evidence tags/explanation/context shown for results | `ixos-search/ui/src/components/search/WhyMatched.tsx`, `ixos-search/ui/src/components/search/ExplainPanel.tsx`, `ixos-search/ui/src/components/search/ContextSnippet.tsx`, `src/ixos_rank/evidence/*` |
| D-08 | File actions | Open file and reveal in explorer from result selection | `ixos-search/ui/src/stores/searchStore.ts`, `ixos-search/ui/src/lib/tauri.ts`, `ixos-search/src-tauri/src/commands/system.rs` |
| D-09 | Search history and starring | Recent and starred thread restoration in sidebar | `ixos-search/ui/src/components/layout/Sidebar.tsx`, `ixos-search/ui/src/stores/starredStore.ts`, `ixos-search/src-tauri/src/commands/history.rs` |
| D-10 | Command palette + shortcuts | Cmd/Ctrl+K palette and Cmd/Ctrl+T new search flow | `ixos-search/ui/src/components/search/CommandPalette.tsx`, `ixos-search/ui/src/components/layout/AppShell.tsx` |
| D-11 | Overlay quick-search window | Separate overlay window mode | `ixos-search/ui/src/components/search/SearchOverlay.tsx`, `ixos-search/ui/src/App.tsx`, `ixos-search/src-tauri/src/commands/system.rs` |
| D-12 | Today view (Pro) | Daily brief, resume, recents, suggestions, move hints | `ixos-search/ui/src/components/today/TodayTab.tsx`, `ixos-search/ui/src/stores/todayStore.ts`, `ixos-search/src-tauri/src/commands/activity.rs` |
| D-13 | Workstreams view (Pro) | Auto-clustered sessions list/detail with management actions | `ixos-search/ui/src/components/workstreams/*`, `ixos-search/ui/src/stores/workstreamStore.ts`, `ixos-search/src-tauri/src/commands/workstreams.rs` |
| D-14 | Activity ledger | Local activity events power suggestions/clustering | `src/activity_ledger/*`, `ixos-search/src-tauri/src/commands/activity.rs`, `ixos-search/ui/src/stores/activityStore.ts` |
| D-15 | Pro gating and entitlement lock states | Time-suspect/expired lock handling and fallback | `ixos-search/ui/src/components/layout/AppShell.tsx`, `ixos-search/ui/src/lib/proAccess.ts`, `ixos-search/src-tauri/src/commands/auth.rs` |
| D-16 | Auth + billing flows | Sign in, entitlement refresh, pricing/checkout portal | `ixos-search/ui/src/components/auth/AuthGate.tsx`, `ixos-search/ui/src/components/account/PricingPanel.tsx`, `ixos-search/ui/src/stores/authStore.ts`, `ixos-search/src-tauri/src/commands/auth.rs`, `ixos-site/src/app/api/desktop/*` |
| D-17 | Settings suite | Search/account/keyboard/privacy/compliance/diagnostics/about tabs | `ixos-search/ui/src/components/settings/SettingsPanel.tsx` + tab components |
| D-18 | Privacy/compliance controls | Consent and data controls surfaced through settings/backend | `ixos-search/ui/src/components/settings/ComplianceSettings.tsx`, `src/compliance/*`, `ixos-search/src-tauri/src/commands/config.rs` |
| D-19 | Diagnostic checks | Doctor diagnostics surfaced to UI and CLI | `ixos-search/ui/src/components/settings/DiagnosticsSettings.tsx`, `src/diagnostics.rs`, `ixos-search/src-tauri/src/commands/doctor.rs` |
| D-20 | Model status/download/preload | Local model availability and download controls | `ixos-search/ui/src/lib/tauri.ts`, `ixos-search/src-tauri/src/commands/system.rs`, `src/ixos_embed/*` |

## CLI Features

| ID | Command/Feature | Behavior | Source paths |
|---|---|---|---|
| C-01 | `ixos search` | Semantic search with progressive option and multiple output formats | `src/cli/commands.rs`, `src/main.rs` (`handle_search`) |
| C-02 | Search modes + model selection | `--search-mode`, `--model`, `--pro-model`, ask-intent behavior | `src/cli/commands.rs`, `src/main.rs` |
| C-03 | Cache mode controls | `--cache-mode` and cache policy normalization | `src/cli/commands.rs`, `src/cli/config.rs`, `src/main.rs` |
| C-04 | Deep search mode | `--deep-search` expanded, slower comprehensive pass | `src/cli/commands.rs`, `src/main.rs` |
| C-05 | Index command | Directory indexing and optional cache clear path | `src/cli/commands.rs`, `src/main.rs` (`handle_index`) |
| C-06 | Config command | get/set/list/reset/path for local config | `src/cli/commands.rs`, `src/main.rs` (`handle_config`), `src/cli/config.rs` |
| C-07 | Daemon command | daemon foreground/status/stop options | `src/cli/commands.rs`, `src/main.rs` |
| C-08 | Cache subcommands | stats/clear/audit/mode/rebuild | `src/cli/commands.rs`, `src/main.rs` (`handle_cache`) |
| C-09 | Compliance command set | consent, GDPR, CCPA, docs export, audit | `src/cli/commands.rs`, `src/main.rs` (`handle_compliance`), `src/compliance/*` |
| C-10 | Doctor command | runtime diagnostics report (`--json`, `--verbose`) | `src/cli/commands.rs`, `src/main.rs` (`handle_doctor`) |
| C-11 | Model command set | list/download/preload/status/delete model flows | `src/cli/commands.rs`, `src/main.rs` (`handle_model`) |
| C-12 | Update command | self-update check/install behavior | `src/cli/commands.rs`, `src/main.rs`, `src/cli/self_update.rs` |
| C-13 | Version + release-check | version diagnostics and release-check stub workflow | `src/cli/commands.rs`, `src/main.rs` |

## Landing Coverage Mapping Rule
- Every feature ID above must appear exactly once in `/4` via a unique lens or explicit unsupported marker.
- No duplicated claims across lenses.
- Every claim must carry an in-UI or nearby source pointer path from this file.
