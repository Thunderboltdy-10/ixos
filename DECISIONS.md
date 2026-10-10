# Current restoration decisions

## 2026-10-10

- KEEP monorepo: separate engine, desktop, sites and experiments remain organized independently.
- KEEP ADS/xattr as native cache. No cache files beside source documents; optional database storage must live under Ixos application-cache locations.
- KEEP explicit JIT and configurable retrieval. Do not decide final defaults/presets before benchmarks.
- FIX production correctness before optimizing: dynamic cache dimensions, real model identity, source freshness, consistent ignores, evidence locations/Unicode and parser/error handling.
- COMPARE length-dependent representative passages, full-text centroid and all-passage reference. Introduction is a candidate anchor; selection must be informative/diverse and tested for rare-fact misses.
- ITERATE bounded intelligent/session retrieval and model-policy interactions; preserve baseline quality and disclose negative results.
- DEFER image embedding to a later optional capability; not a current experiment priority.
- REMOVE active payment/device/account feature restrictions; retain necessary source/cache synchronization.
- PRESERVE historical source and process evidence; contribution/application records are private and Git-excluded.
- COMMIT once per completed gate; no remote publication or history rewriting without the corresponding release work.
- KEEP full-content hash validation as the correctness baseline; measure source I/O before adopting faster invalidation. Hash and parsed text come from the same file snapshot.
- FIX path-bound cache freshness until path augmentation is separated experimentally. Include extraction budgets/preparation behaviour in identity; never reuse silently incompatible vectors.
- REPLACE the shared temporary fallback with a persistent application-cache database. Use one slot per file, matching native metadata; no edit-key accumulation or automatic deletion of shared storage.
- REBUILD discovery each query until a measured watcher-backed manifest is justified; correctness for new files/ignore changes precedes directory-list reuse.
- REMOVE the fast-mode wrapper's hidden 2,048-character truncation. Preserve explicit protected-mode behaviour separately; expose the dependency's remaining 512-token limit as experiment work.
- KEEP output budget validity over byte truncation: reduce displayed results/evidence, never cut serialized JSON midway. Whole-stream progressive budgets need a later contract.
- SHARE cache identities and traversal with cache-management utilities. Report present versus valid entries, warm actual vectors on index, and clear only entries under the requested directory.
