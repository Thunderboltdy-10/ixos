# Agent evidence: selected scope and evidence limits

Ixos remains a file-retrieval engine with exact follow-up inspection. Ordinary hybrid search, models, ranking and primary snippets are preserved. Optional function evidence offers more grounded source alternatives; it does not decide what code an agent should change.

## What the investigations support

The repeatedly inspected RepoQA diagnostic set has 260 queries from 26 families. The recorded baseline found the relevant file in the top ten for 240 queries (92.31%). Its displayed snippet overlapped the labeled function for 101 queries (38.85%); mean coverage of the entire labeled function was 14.26%. Coverage is size-dependent, and informative preceding documentation can score zero. These are distinct measures, not interchangeable accuracy claims.

Of the 139 file-found misses, the exclusive qualitative/mechanical classification was 10 absent candidates, 66 passage-ranking failures, 25 excerpt-localization failures and 38 useful related documentation cases. Mechanical classification without documentation priority was 11/76/52. Improving coefficients or forcing excerpts toward signatures did not consistently transfer: strict overlap sometimes improved while useful explanatory text disappeared.

Bounded native function evidence historically increased labeled-function overlap to 171/260 without changing file ranking. That is improved source availability on exposed diagnostic material. It does not prove improved autonomous-agent accuracy. Subsequent controlled agent work did not establish a reliable correctness or cumulative-context advantage over ordinary tools. Batching reduced some retrieval-call counts without a consistent total-input benefit. Capability discovery and tool availability also do not imply voluntary agent adoption.

## Product decisions

- Keep ordinary search unchanged. Source freshness is a correctness fix, including same-size edits with restored modification times.
- Make bounded function evidence explicit and optional. Preserve primary excerpts and associated documentation; attach grounded identities/extents instead of replacing useful text with signatures.
- Retain explicit passage alternatives as a smaller parser-free option and fallback. Bound extra work and output; do not expose every internal candidate.
- Provide exact ranges, exact parsed definitions/bodies, independent batches, grouped grep, source-version guards and truthful continuation.
- Remove approximate semantic read selectors, opening/closing anchors, related-code inference and automatic implementation packages. They overlapped agent reasoning without established workflow benefit.
- Keep a short optional capability skill. Known strings, files, edits, builds, history and precise language navigation can stay with ordinary development tools.

The shared executable serves CLI, MCP and desktop worker roles; the desktop is a client. Reliability changes cover deadlines, cancellation, failed-worker recovery, verified installation and per-host skill reporting. These are integration/correctness improvements, not new retrieval-quality claims.

## Validation and reproduction

`cargo test -p ixos-core -p ixos-cli -p ixos-runtime --all-features --locked` exercises extraction/eligibility, source coordinates, edited sources, vector-cache invalidation, exact reads, response budgets, real MCP requests and runtime fault recovery. Build the UI before full workspace checks; see [Contributing](../CONTRIBUTING.md). [Evaluation](../eval/README.md) documents the historical retrieval baseline. [MCP](MCP.md) and [Installation](INSTALLATION.md) describe current contracts and resource bounds.

Historical experiments remain separate from the production implementation. Previously examined material must not be presented as a fresh holdout. Further performance or agent-productivity claims require clearly identified binaries, models, corpora, repeated resident timings and source-grounded task outcomes. Another broad heuristic search campaign is not a release prerequisite.
