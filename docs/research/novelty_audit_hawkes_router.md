# Novelty Audit: Hawkes/TPP Router For Ixos

Date: 2026-02-23
Scope: "Hawkes-based behavior prior for routing desktop/local file search under latency budgets + progressive streaming + privacy modes."

## Step 0: Ixos Reality (Repo-Grounded)

### 10 constraints and bottlenecks

1. The top-level search pipeline is explicitly staged as `Query input -> Candidate generation -> Semantic rerank -> Evidence extraction -> Results` with progressive streaming from query to early results (`docs/flow-map.md`).
2. Progressive search is already two-phase and stream-first: code labels `Phase 1: Lexical search (fast)` then `Phase 2: Semantic search (slower, more accurate)` (`src/ixos_rank/progressive.rs:466`, `src/ixos_rank/progressive.rs:624`).
3. Candidate generation is already multi-stage and mostly I/O bound: `Path scoring`, `Ripgrep`, optional `Document search`, then `Merge`, `Metadata priors`, `Sort`, `Hard cap` (`src/ixos_rank/candidate_generator/mod.rs:317`, `src/ixos_rank/candidate_generator/mod.rs:340`, `src/ixos_rank/candidate_generator/mod.rs:353`, `src/ixos_rank/candidate_generator/mod.rs:364`, `src/ixos_rank/candidate_generator/mod.rs:373`, `src/ixos_rank/candidate_generator/mod.rs:383`, `src/ixos_rank/candidate_generator/mod.rs:390`).
4. Current performance bottlenecks remain directory walk and ripgrep I/O; `Directory walk ~68ms` and `Ripgrep` is still a major cost at p95 in `reports/PERF_BOTTLENECKS.md`.
5. Auto mode is already Flash-first and has an explicit Pro refine gate (`should_refine`) with uncertainty signals (gap, lexical confidence, entropy, top-1/top-k) (`src/ixos_rank/progressive.rs:872`, `src/ixos_rank/progressive.rs:1335`).
6. Auto refine is currently bounded by a latency cap (`AUTO_REFINE_TIMEOUT_CAP = 2500ms`), so any new router must be budget-aware (`src/ixos_rank/progressive.rs:76`, `src/ixos_rank/progressive.rs:923`).
7. Ask mode has strict behavior: refine is skipped in Auto when `processed.mode == QueryMode::Ask`; Ask mode also changes lexical filtering by anchor terms (`src/ixos_rank/progressive.rs:565`, `src/ixos_rank/progressive.rs:874`).
8. Search-mode gating exists in Tauri command path: non-Pro users are downgraded (`Auto -> Flash`) and Pro mode can be rejected (`src-tauri/src/commands/search.rs:424`, `src-tauri/src/commands/search.rs:432`, `src-tauri/src/commands/search.rs:433`).
9. Behavior data already exists locally: activity ledger captures `search_query`, `result_clicked`, `file_opened`, timestamps, and query hash; workstreams cluster sessions by time gap (`src/activity_ledger/mod.rs:67`, `src/activity_ledger/mod.rs:44`, `src/workstreams/mod.rs:225`).
10. Privacy/deep-search mode changes behavior and persistence paths: workstream persistence is disabled in journalist/deep-search mode, and secure ranker currently skips personal signals when `is_journalist_mode()` is true (`src-tauri/src/commands/workstreams.rs:454`, `src/ixos_rank/secure_ranker.rs:480`). Also note core shim now returns `false` for legacy journalist flag (`src/journalist_mode.rs:15`), so mode semantics must be implemented through current deep-search state.

### Exact pipeline and routing boundaries (quoted)

From docs:
- `Q[Query input] --> CG[Candidate generation] --> SEM[Semantic rerank] --> EVID[Evidence extraction] --> RES[Results]` (`docs/flow-map.md`)

From code:
- `// Phase 1: Lexical search (fast)` (`src/ixos_rank/progressive.rs:466`)
- `// Phase 2: Semantic search (slower, more accurate)` (`src/ixos_rank/progressive.rs:624`)
- `// Flash-first Auto mode: publish immediately, then optionally refine top-K with Pro.` (`src/ixos_rank/progressive.rs:867`)
- `if should_run_auto_pro_refine { ... "Refining top results with Pro model..." }` (`src/ixos_rank/progressive.rs:891`)

Current refine gate logic boundary:
- Gate call site: `should_refine(query_terms.len(), &lexical_results, &semantic_results, self.config.auto_mode)` (`src/ixos_rank/progressive.rs:875`)
- Internal criteria: gap, lexical max, entropy, top-1/top-k average, short-query stricter threshold (`src/ixos_rank/progressive.rs:1352`, `src/ixos_rank/progressive.rs:1382`, `src/ixos_rank/progressive.rs:1405`).

### Code anchors requested in prompt

| Concern | Anchor |
|---|---|
| Query preprocess | `src/ixos_rank/candidate_generator/query_preprocess.rs:73` |
| Candidate generation core | `src/ixos_rank/candidate_generator/mod.rs:310` |
| Lexical streaming first | `src/ixos_rank/progressive.rs:466` and batched lexical stream at `src/ixos_rank/progressive.rs:486` |
| Semantic rerank / fallback | `src/ixos_rank/progressive.rs:624` and lexical-empty fallback at `src/ixos_rank/progressive.rs:641` |
| SearchMode + routing modes | `src/ixos_rank/progressive.rs:81`, `src-tauri/src/commands/search.rs:386`, `src-tauri/src/commands/search.rs:424` |
| Auto refine gate | `src/ixos_rank/progressive.rs:872` and `src/ixos_rank/progressive.rs:1335` |
| Auto config knobs | `src/ixos_rank/progressive.rs:95` (`AutoModeConfig`) |

---

## Systematic Search Log (queries, timestamps, top hits, relevance)

Notes:
- Required query families from prompt are included verbatim.
- Timestamps are session-captured UTC batch stamps.
- "Top hits" list the most relevant result(s) retained for audit.

| Timestamp (UTC) | Query | Top hits captured | Why relevant |
|---|---|---|---|
| 2026-02-23T13:05:00Z | `"Hawkes process" desktop search` | No direct desktop-search Hawkes system found | Negative evidence for direct claim |
| 2026-02-23T13:05:00Z | `"Hawkes process" file search` | No direct file-search Hawkes system found | Negative evidence |
| 2026-02-23T13:05:00Z | `"temporal point process" desktop search` | No direct production/academic desktop local-search router found | Negative evidence |
| 2026-02-23T13:05:00Z | `"temporal point process" personal information retrieval` | CACM personal info search survey | Adjacent PIR baseline |
| 2026-02-23T13:09:00Z | `"Hawkes" file system` | Mostly unrelated "Hawkes" name collisions | Negative evidence |
| 2026-02-23T13:09:00Z | `"Hawkes" file access prediction` | No high-confidence filesystem paper using Hawkes found | Negative evidence |
| 2026-02-23T13:09:00Z | `"Hawkes" prefetch file access` | No direct paper mapped to desktop local search | Negative evidence |
| 2026-02-23T13:09:00Z | `"Hawkes" query routing retrieval` | `Effective Personalized Search with Heterogeneous Graph Based Hawkes Process` (DOI) | Closest Hawkes-to-search prior art |
| 2026-02-23T13:14:00Z | `"self-exciting" personal information retrieval` | No direct desktop/local file routing paper | Negative evidence |
| 2026-02-23T13:14:00Z | `"Hawkes" local search` | No desktop local-search system with Hawkes router found | Negative evidence |
| 2026-02-23T13:14:00Z | `"temporal point process" filesystem hierarchy` | No strong direct source combining TPP + filesystem hierarchy + routing | Negative evidence |
| 2026-02-23T13:14:00Z | `"temporal graph network" file access` | TGN paper (arXiv:2006.10637) | Adjacent dynamic temporal modeling |
| 2026-02-23T13:14:00Z | `"dynamic graph" desktop search personalization` | No direct desktop implementation found | Negative evidence |
| 2026-02-23T13:14:00Z | `"TGN" personal information retrieval` | No direct PIR TGN system found | Negative evidence |
| 2026-02-23T13:20:00Z | `Hawkes process personalized search paper` | IEEE TBDATA 2024 Hawkes personalized search; DBLP entry | Direct prior art in personalized search ranking |
| 2026-02-23T13:20:00Z | `heterogeneous graph hawkes personalized retrieval` | Same IEEE paper + metadata pages | Confirms closeness |
| 2026-02-23T13:28:00Z | `Stuff I've Seen personal information retrieval` | Microsoft Research SIS paper page | Canonical desktop PIR baseline |
| 2026-02-23T13:28:00Z | `Instant Search via Query Segmentation` | Microsoft WSDM 2011 page | Query-time latency/interaction baseline |
| 2026-02-23T13:34:00Z | `Alfred learns your usage` | Alfred getting started docs | Product-level behavior ranking signal |
| 2026-02-23T13:34:00Z | `Windows Search indexing FAQ` | Microsoft support indexing FAQ | Product-level local search behavior/recency context |
| 2026-02-23T13:34:00Z | `macOS Spotlight` | Apple Spotlight guide | Product baseline for desktop search UX |
| 2026-02-23T13:38:00Z | `Raycast root search` | Raycast manual root search + search files docs | Product baseline for local launcher/search |
| 2026-02-23T13:42:00Z | `zoxide frecency` | zoxide repo/docs | Practice baseline: frecency routing for directories |
| 2026-02-23T13:42:00Z | `fzf history ranking` | fzf repo/docs | Practice baseline for lightweight local heuristics |

---

## Novelty Audit Table

Scoring rubric for "How close to our target?":
- 5 = nearly same problem + method + constraints
- 4 = method and objective very close, but major deployment/context differences
- 3 = adjacent method/problem overlap
- 0-2 = weak overlap

| Source + link | Domain | Uses Hawkes? | Uses filesystem hierarchy? | Uses for ROUTING search scope/IO? | Local-first + privacy constraints? | Progressive streaming + latency budget? | How close (0-5) | Key differences / why not the same |
|---|---|---|---|---|---|---|---:|---|
| Xu et al., *Effective Personalized Search with Heterogeneous Graph Based Hawkes Process* (IEEE TBDATA 2024), DOI: https://doi.org/10.1109/TBDATA.2024.3403392 | Personalized web/IR ranking | Y | N | N (ranking, not scope routing) | N | N | 4 | - Hawkes is on user-item graph relevance, not local file-scope routing.<br>- No desktop filesystem traversal or ripgrep/IO budget.<br>- No privacy-mode degradation path.<br>- No progressive lexical-first streaming. |
| Mei & Eisner, *The Neural Hawkes Process* (ICML 2017), https://arxiv.org/abs/1612.09328 | Temporal event sequence modeling | Y | N | N | N | N | 2 | - Generic sequence model paper.<br>- No retrieval/routing pipeline.<br>- No local-first constraints. |
| Trivedi et al., *DyRep* (ICLR 2019), https://openreview.net/forum?id=HyePrhR5KX | Dynamic graph representation + event process | Y (TPP-style intensity) | N | N | N | N | 2 | - Dynamic graph modeling, not search routing.<br>- No desktop files or privacy mode. |
| Rossi et al., *Temporal Graph Networks* (2020), https://arxiv.org/abs/2006.10637 | Dynamic graph learning | N (general temporal memory, not explicit Hawkes) | N | N | N | N | 2 | - Strong temporal graph baseline only.<br>- Not a search scope/router mechanism. |
| Dumais et al., *Stuff I've Seen* (SIGIR 2003), https://www.microsoft.com/en-us/research/publication/stuff-ive-seen-a-system-for-personal-information-retrieval-and-re-use/ | Desktop personal information retrieval | N | Y | Partial (ranking/filtering in desktop index) | Partial | N | 3 | - Desktop PIR is close in domain.<br>- No Hawkes/TPP.<br>- Index-centric architecture, not zero-index optional routing. |
| Hassan et al., *Instant Search via Query Segmentation* (WSDM 2011), https://www.microsoft.com/en-us/research/publication/instant-search-via-query-segmentation/ | Search interaction latency | N | N | Partial (query-time behavior) | N | Y | 2 | - Addresses low latency and interaction.<br>- Not filesystem desktop routing.<br>- No Hawkes or privacy-mode handling. |
| Teevan et al., *Personal Information Search: Challenges and Methods* (CACM), https://cacm.acm.org/research/personal-information-search-challenges-and-methods/ | PIR survey | N | Partial | N | Partial | N | 2 | - Context survey, no concrete Hawkes router.<br>- No progressive stream architecture. |
| Yuan et al., *Using Digital Traces to Find Lost Web Pages* (JASIST 2014), https://asu.elsevierpure.com/en/publications/using-digital-traces-to-find-lost-web-pages | Refinding / behavior traces | N | N | Partial | Partial | N | 2 | - Behavior signals are relevant.<br>- Task is web-page refinding, not local file-scope routing. |
| Raycast Manual (Root Search), https://manual.raycast.com/root-search | Product launcher/search | N | Partial | Y (practical ordering heuristics) | Partial (local app context) | Y (interactive) | 2 | - Product behavior hints, no published Hawkes model.<br>- No formal privacy-mode objective. |
| Raycast Manual (Search Files), https://manual.raycast.com/search-files | Product local file search | N | Y | Partial | Partial | Y | 2 | - Local file search exists.<br>- No evidence of Hawkes/TPP routing. |
| Alfred docs, https://www.alfredapp.com/help/getting-started/what-is-alfred/ | Product launcher/search | N | Partial | Y (usage-adaptive ranking) | Partial | Y | 2 | - Behavior-based ranking exists.<br>- Not Hawkes and not documented as budgeted scope router. |
| Apple Spotlight guide, https://support.apple.com/guide/mac-help/spotlight-mchlp1008/mac | Desktop OS search | N | Y | Partial | Partial | Y | 2 | - Desktop search baseline only.<br>- No disclosed Hawkes/TPP routing. |
| Windows Search indexing FAQ, https://support.microsoft.com/en-us/windows/indexing-in-windows-faq-da061c83-af6b-095c-0f7a-4dfecda4d15a | Desktop OS search/indexing | N | Y | Y (index scope controls) | Partial | Partial | 2 | - Scope controls are index settings, not event-intensity router.<br>- No Hawkes/TPP evidence. |
| zoxide docs, https://github.com/ajeetdsouza/zoxide | Command-line navigation heuristic | N | Y | Y (directory routing/order) | Y | Y | 2 | - Strong frecency baseline.<br>- Not search relevance; no semantic rerank integration. |
| fzf docs, https://github.com/junegunn/fzf | Fuzzy local filtering | N | N | Partial | Y | Y | 1 | - Tooling baseline only.<br>- No behavior-aware Hawkes routing. |
| Query recommendation temporal behavior chapter, https://link.springer.com/chapter/10.1007/978-3-030-48516-0_28 | Query recommendation | N (time-aware behavior) | N | N | N | N | 1 | - Adjacent temporal personalization.<br>- No filesystem/local-first scope routing. |

### Audit conclusion

- We found **direct prior art for Hawkes in personalized search ranking** (score 4/5).
- We did **not** find a direct system matching all of:
  - local desktop file search scope/routing,
  - progressive lexical-first streaming with optional semantic/pro refine,
  - explicit latency budgeted gating,
  - privacy/deep-search mode graceful degradation.

### Required pivot (triggered by closeness 4/5)

Because a source scored 4, we pivot away from claiming "Hawkes for search personalization" as novel.

Pivoted claim envelope:
- Not "Hawkes in search is novel."
- Instead: **budget-constrained, privacy-aware, filesystem-scoped routing for progressive local search** where Hawkes/TPP is one prior among ablations.

Safe claim wording for paper/EE:
- "We study whether temporal point-process priors improve stage-routing decisions in a local-first progressive file-search system under explicit latency budgets and privacy modes."

