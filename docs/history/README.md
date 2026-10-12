# Project history

These documents preserve Ixos as it was being developed. Their contents are unchanged, so old plans and performance claims may describe features that no longer exist. The first monorepo commit is from 23 January 2026; some documents describe earlier work.

Pablo designed and directed Ixos, set its constraints and made the product decisions. AI coding agents, including Claude Code and Codex, wrote most of the implementation under his direction. The upstream authors created the embedding models, tokenizer and retrieval algorithms. This archive records integration and evaluation work without claiming those algorithms as original inventions.

## January: desktop and site

The Tauri desktop and Next.js site were already present in the January monorepo. Product plans included accounts and billing alongside search. Pablo directed the user experience while AI agents built the interfaces. Accounts and paid tiers were abandoned in the October refocus.

- [ixos auth billing controlplane spec](2026-01-desktop-and-site/old-plans/ixos-auth-billing-controlplane-spec.md)
- [ixos ui unification spec](2026-01-desktop-and-site/old-plans/ixos-ui-unification-spec.md)
- [tiers](2026-01-desktop-and-site/docs/product/tiers.md)
- [component showcase](2026-01-desktop-and-site/ixos-search/ui/component-showcase.md)
- [data features](2026-01-desktop-and-site/ixos-search/ui/data-features.md)
- [migration guide](2026-01-desktop-and-site/ixos-search/ui/migration-guide.md)
- [readme](2026-01-desktop-and-site/ixos-site/workspace.md)
- [checklist](2026-01-desktop-and-site/site/checklist.md)
- [ixos landing v3 fix spec](2026-01-desktop-and-site/site/ixos-landing-v3-fix-spec.md)
- [ixos landing v3 refinement spec](2026-01-desktop-and-site/site/ixos-landing-v3-refinement-spec.md)
- [qa](2026-01-desktop-and-site/site/qa.md)
- [spec full](2026-01-desktop-and-site/site/spec-full.md)
- [spec part1 tokens](2026-01-desktop-and-site/site/spec-part1-tokens.md)
- [spec part2 sections](2026-01-desktop-and-site/site/spec-part2-sections.md)
- [spec part3 effects](2026-01-desktop-and-site/site/spec-part3-effects.md)
- [spec part4 pages](2026-01-desktop-and-site/site/spec-part4-pages.md)
- [spec part5 rules](2026-01-desktop-and-site/site/spec-part5-rules.md)
- [readme](2026-01-desktop-and-site/ixos-site/readme.md)

## January: prototype

The first system combined local lexical and semantic search with embeddings stored in file metadata. The roadmaps grew to include a daemon, compliance features and paid tiers. These were later removed to make the search engine smaller and easier to understand. The implementation roadmaps also directed AI coding agents; they are preserved as mixed historical plans.

- [readme](2026-01-prototype/readme.md)
- [implementation roadmap1](2026-01-prototype/old-plans/implementation-roadmap1.md)
- [implementation roadmap2](2026-01-prototype/old-plans/implementation-roadmap2.md)
- [implementation roadmap3](2026-01-prototype/old-plans/implementation-roadmap3.md)
- [implementation roadmap4](2026-01-prototype/old-plans/implementation-roadmap4.md)
- [implementation roadmap5](2026-01-prototype/old-plans/implementation-roadmap5.md)
- [ixos search performance ux revolution](2026-01-prototype/old-plans/ixos-search-performance-ux-revolution.md)
- [ixos plan pack](2026-01-prototype/old-plans/ixos-plan-pack.docx)
- [ixos report deep summary](2026-01-prototype/old-plans/ixos-report-deep-summary.md)
- [ixos testing release playbook](2026-01-prototype/old-plans/ixos-testing-release-playbook.md)
- [jit embeddings feature audit strategy](2026-01-prototype/old-plans/jit-embeddings-feature-audit-strategy.md)
- [ixos strategic blueprint](2026-01-prototype/old-plans/ixos-strategic-blueprint.docx)
- [readme](2026-01-prototype/project-overview.md)
- [readme](2026-01-prototype/bench/readme.md)
- [changelog search](2026-01-prototype/docs/changelog-search.md)
- [project guide](2026-01-prototype/docs/project-guide.md)
- [capability matrix](2026-01-prototype/docs/capability-matrix.md)
- [control plane](2026-01-prototype/docs/control-plane.md)
- [flow map](2026-01-prototype/docs/flow-map.md)
- [gaps](2026-01-prototype/docs/gaps.md)
- [strategy](2026-01-prototype/docs/licensing/strategy.md)
- [checklist](2026-01-prototype/release/checklist.md)
- [readme](2026-01-prototype/scripts/readme.md)
- [features](2026-01-prototype/features.md)
- [strategic recommendation](2026-01-prototype/strategic-recommendation.md)

## February: desktop and site

This period expanded the desktop surfaces, progress animations and site variants. The archive contains design specifications, copy and audits rather than a claim that all planned behavior worked. AI agents implemented the designs with feedback from Pablo. The cleanup keeps the surviving search styling and removes the extra product surfaces.

- [cli reliability quickcheck](2026-02-desktop-and-site/docs/product/cli-reliability-quickcheck.md)
- [copy map](2026-02-desktop-and-site/docs/product/copy-map.md)
- [desktop app](2026-02-desktop-and-site/docs/product/desktop-app.md)
- [desktop ui audit](2026-02-desktop-and-site/docs/product/desktop-ui-audit.md)
- [phases 0 2 implementation and testing](2026-02-desktop-and-site/docs/product/phases-0-2-implementation-and-testing.md)
- [v4 design truth](2026-02-desktop-and-site/ixos-site/src/app/4/v4-design-truth.md)
- [v4 hero storyboard](2026-02-desktop-and-site/ixos-site/src/app/4/v4-hero-storyboard.md)
- [v4 motion bible](2026-02-desktop-and-site/ixos-site/src/app/4/v4-motion-bible.md)
- [v4 product truth](2026-02-desktop-and-site/ixos-site/src/app/4/v4-product-truth.md)
- [v4 design truth](2026-02-desktop-and-site/ixos-site/src/app/5/v4-design-truth.md)
- [v4 hero storyboard](2026-02-desktop-and-site/ixos-site/src/app/5/v4-hero-storyboard.md)
- [v4 motion bible](2026-02-desktop-and-site/ixos-site/src/app/5/v4-motion-bible.md)
- [v4 product truth](2026-02-desktop-and-site/ixos-site/src/app/5/v4-product-truth.md)
- [copy deck](2026-02-desktop-and-site/ixos-site/src/landing/copy-deck.md)
- [feature inventory](2026-02-desktop-and-site/ixos-site/src/landing/feature-inventory.md)
- [inspiration matrix](2026-02-desktop-and-site/ixos-site/src/landing/inspiration-matrix.md)
- [inspiration matrix v2 1](2026-02-desktop-and-site/ixos-site/src/landing/inspiration-matrix-v2-1.md)
- [reset plan](2026-02-desktop-and-site/ixos-site/src/landing/reset-plan.md)
- [variant status](2026-02-desktop-and-site/ixos-site/src/landing/variant-status.md)
- [worlds](2026-02-desktop-and-site/ixos-site/src/landing/worlds.md)
- [worlds v2 1](2026-02-desktop-and-site/ixos-site/src/landing/worlds-v2-1.md)
- [demo adapter](2026-02-desktop-and-site/ixos-site/src/landing/demo/demo-adapter.md)
- [copy deck](2026-02-desktop-and-site/site/copy-deck.md)
- [feature masterlist](2026-02-desktop-and-site/site/feature-masterlist.md)
- [ui truth sheet](2026-02-desktop-and-site/site/ui-truth-sheet.md)

## February: models and ranking

Model work explored static embeddings, quantization, ranking and cache behavior. The documents include proposed optimizations as well as results, and do not establish that every proposal shipped. Later evaluation selected two upstream model derivatives and a simple lexical/semantic combination. AI agents implemented and evaluated the alternatives under Pablo’s direction.

- [section 0 executive decision](2026-02-models-and-ranking/section-0-executive-decision.pdf)
- [implementation roadmap6](2026-02-models-and-ranking/old-plans/implementation-roadmap6.md)
- [ixos model lab report](2026-02-models-and-ranking/old-plans/ixos-model-lab-report.md)
- [architecture audit 2026 02](2026-02-models-and-ranking/docs/architecture-audit-2026-02.md)
- [changelog models](2026-02-models-and-ranking/docs/changelog-models.md)
- [ixos master roadmap](2026-02-models-and-ranking/docs/ixos-master-roadmap.md)
- [readme](2026-02-models-and-ranking/docs/readme.md)
- [benchmarking](2026-02-models-and-ranking/docs/engineering/benchmarking.md)
- [markdown organization](2026-02-models-and-ranking/docs/engineering/markdown-organization.md)
- [search mode fallbacks](2026-02-models-and-ranking/docs/engineering/search-mode-fallbacks.md)
- [installation](2026-02-models-and-ranking/docs/getting-started/installation.md)
- [perf profile](2026-02-models-and-ranking/docs/modeling/perf-profile.md)
- [process](2026-02-models-and-ranking/docs/modeling/process.md)
- [ranking optimizations](2026-02-models-and-ranking/docs/modeling/ranking-optimizations.md)
- [branding](2026-02-models-and-ranking/docs/models/branding.md)
- [huggingface and models](2026-02-models-and-ranking/docs/models/huggingface-and-models.md)
- [quantization research](2026-02-models-and-ranking/docs/models/quantization-research.md)
- [readme](2026-02-models-and-ranking/docs/models/readme.md)
- [flash v1](2026-02-models-and-ranking/docs/models/flash-v1.md)
- [flash v2](2026-02-models-and-ranking/docs/models/flash-v2.md)
- [flash v4 512](2026-02-models-and-ranking/docs/models/flash-v4-512.md)
- [flash v4 fast 192](2026-02-models-and-ranking/docs/models/flash-v4-fast-192.md)
- [ixos pro v1](2026-02-models-and-ranking/docs/models/ixos-pro-v1.md)
- [potion 8m int8](2026-02-models-and-ranking/docs/models/potion-8m-int8.md)
- [pro fusion](2026-02-models-and-ranking/docs/models/pro-fusion.md)
- [pro v2](2026-02-models-and-ranking/docs/models/pro-v2.md)
- [canonical results](2026-02-models-and-ranking/models/lab/canonical-results-2026-02-03.md)
- [experiment log](2026-02-models-and-ranking/models/lab/experiment-log.md)
- [leaderboard](2026-02-models-and-ranking/models/lab/leaderboard.md)
- [models downloaded](2026-02-models-and-ranking/models/lab/models-downloaded.md)
- [perf leaderboard](2026-02-models-and-ranking/models/lab/perf-leaderboard.md)
- [plan](2026-02-models-and-ranking/models/lab/plan.md)
- [search opt plan](2026-02-models-and-ranking/models/lab/search-opt-plan.md)
- [benchmark results](2026-02-models-and-ranking/benchmark-results.md)
- [features and functionality](2026-02-models-and-ranking/features-and-functionality.md)
- [feature inventory](2026-02-models-and-ranking/feature-inventory.md)
- [implementation summary](2026-02-models-and-ranking/implementation-summary.md)
- [ixos model lab report](2026-02-models-and-ranking/ixos-model-lab-report.md)
- [ml models comprehensive analysis](2026-02-models-and-ranking/ml-models-comprehensive-analysis.md)
- [models report](2026-02-models-and-ranking/models-report.md)
- [model installation system report](2026-02-models-and-ranking/model-installation-system-report.md)
- [production and strategy gaps 2026 02 10](2026-02-models-and-ranking/production-and-strategy-gaps-2026-02-10.md)
- [project review report](2026-02-models-and-ranking/project-review-report.md)
- [canonical results](2026-02-models-and-ranking/models/lab/canonical-results.md)

## March: desktop and site

The March records describe later site and interface decisions. They preserve the design rationale and alternatives at that time. AI tools produced implementation and design drafts under Pablo’s direction. The present product is being reduced to locations, search and storage controls.

- [preset 1 command center](2026-03-desktop-and-site/ixos-site/src/presets/preset-1-command-center.md)
- [preset 2 signal architecture](2026-03-desktop-and-site/ixos-site/src/presets/preset-2-signal-architecture.md)
- [preset 3 precision grid](2026-03-desktop-and-site/ixos-site/src/presets/preset-3-precision-grid.md)
- [preset 4 spatial immersion](2026-03-desktop-and-site/ixos-site/src/presets/preset-4-spatial-immersion.md)
- [preset 5 directors cut](2026-03-desktop-and-site/ixos-site/src/presets/preset-5-directors-cut.md)
- [readme](2026-03-desktop-and-site/ixos-search/readme.md)

## October: restoration and cleanup

The restoration found a cache that kept only 64 of 512 dimensions, stale cache records and discovery rules that hid source folders. A smaller engine replaced the old ranking pipeline and was checked on code and document retrieval. Hybrid ranking improved on BM25 on the supplied unseen repository families; query-time passage selection improved cumulative line recall by 5.3 percentage points. The underlying results and their limits are summarized in [RESULTS.md](../RESULTS.md).

Session learning was tried and removed because it did not improve retrieval. Even accepting the correct file did not put it in the next top five. The cleanup also removes the old pipeline, paid tiers, compliance machinery and raw report trees. Original restoration reports remain available at the local `restoration-end` tag.

- [features](2026-10-restoration/features.md)
- [readme](2026-10-restoration/readme.md)
- [release](2026-10-restoration/engineering/release.md)
- [resources](2026-10-restoration/engineering/resources.md)
- [anchors](2026-10-restoration/evaluation/anchors.md)
- [contextbench](2026-10-restoration/evaluation/contextbench.md)
- [repoqa](2026-10-restoration/evaluation/repoqa.md)
- [trajectories](2026-10-restoration/evaluation/trajectories.md)
- [installation](2026-10-restoration/getting-started/installation.md)
- [publishing](2026-10-restoration/models/publishing.md)
- [readme](2026-10-restoration/models/readme.md)

## Research

These papers, bibliographies and design explorations considered ranking, routing and broader product directions. They are historical research notes, not proof of invention or validated product results. Upstream ideas retain their attribution; AI tools helped synthesize and investigate them. The cleanup introduces no new research direction.

- [final best direction](research/docs/research/final-best-direction.md)
- [hero object candidates](research/docs/research/hero-object-candidates.md)
- [idea bank 50plus](research/docs/research/idea-bank-50plus.md)
- [lit scan bibliography](research/docs/research/lit-scan-bibliography.md)
- [novelty audit hawkes router](research/docs/research/novelty-audit-hawkes-router.md)
- [novelty audit hero objects](research/docs/research/novelty-audit-hero-objects.md)
- [recommendation best1](research/docs/research/recommendation-best1.md)
- [recommendation v2](research/docs/research/recommendation-v2.md)
- [top10 deepdive](research/docs/research/top10-deepdive.md)
- [top12 deepdive](research/docs/research/top12-deepdive.md)
- [upper bounds](research/docs/research/upper-bounds.md)

## Code snapshots

These annotated tags are available locally. Run `git switch --detach TAG` to inspect a period. The links below use the same pending repository URL as the site; Pablo will confirm it before publishing.

| Period | Tag | Snapshot |
|---|---|---|
| January | [history/2026-01-prototype](https://github.com/PABLO_GITHUB_USER/ixos/tree/history%2F2026-01-prototype) | First monorepo, 23 January 2026 |
| February | [history/2026-02-models](https://github.com/PABLO_GITHUB_USER/ixos/tree/history%2F2026-02-models) | Model and ranking work, 2 February 2026 |
| March | [history/2026-03-desktop](https://github.com/PABLO_GITHUB_USER/ixos/tree/history%2F2026-03-desktop) | Desktop and site, 20 March 2026 |
| October restoration | [history/2026-10-restoration-end](https://github.com/PABLO_GITHUB_USER/ixos/tree/history%2F2026-10-restoration-end) | Restoration code and original reports |
| October cleanup | [history/2026-10-cleanup](https://github.com/PABLO_GITHUB_USER/ixos/tree/history%2F2026-10-cleanup) | Simplified engine, desktop, site and evaluation |

The existing `restoration-end` tag points to the same restoration snapshot. The historical documents above remain unchanged; the human index describes decisions that survived or were abandoned.
