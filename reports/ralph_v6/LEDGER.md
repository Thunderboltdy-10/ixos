# Ralph v6 Ledger

- Prosecutor pass 1: complete
- Prosecutor pass 2: complete
- Final live candidates: `C19`, `C20`

## C01: Template-Similarity Ask Activation

- name: template-similarity Ask activation
- irreducible object: new query-intent detector for local search questions
- novelty shape: new X
- closest known family: intent classification / template matching
- kill argument: the implementation is typo-tolerant prefix checks plus char-ngram similarity to hand-written question templates; that is squarely known intent-detection machinery
- why it might survive: only the local latency constraint is distinctive, which is not enough
- falsification path: if standard intent-detection terminology fully describes it, kill it
- empirical probe: none needed beyond code inspection
- verdict: KNOWN
- confidence: 0.96

## C02: Question Rewrite with Extension Hints

- name: question rewrite with extension hints
- irreducible object: new query rewrite for question-shaped local search
- novelty shape: new X for Y
- closest known family: query rewriting / query expansion
- kill argument: the code strips question stop words, preserves operators, and injects `ext:` hints; that is classical rewrite/expansion behavior
- why it might survive: it is cheap and repo-aware, but still only rewrite logic
- falsification path: if "query rewrite with operator preservation" captures it, kill it
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.90

## C03: IDF Anchor Extraction

- name: IDF anchor extraction
- irreducible object: new anchor extractor for Ask queries
- novelty shape: new X for Y
- closest known family: keyphrase extraction / term weighting
- kill argument: anchors are just high-IDF query terms with a cap; that is standard signal extraction
- why it might survive: only because it is embedded in local search
- falsification path: if keyphrase/IDF language fully explains it, kill it
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.95

## C04: Anchor-Filtered Lexical Funnel

- name: anchor-filtered lexical funnel
- irreducible object: new constrained candidate filter for Ask-mode lexical search
- novelty shape: new X for Y
- closest known family: constrained candidate generation / lexical filtering
- kill argument: it filters lexical candidates by anchor presence and falls back when recall collapses; that is a normal precision-recall tradeoff heuristic
- why it might survive: it is operationally careful, but not a new object
- falsification path: if "anchor-based candidate filtering with fallback" is enough to name it, kill it
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.90

## C05: Trusted Snippet Selector

- name: trusted snippet selector
- irreducible object: new passage selector combining anchor coverage and semantic score
- novelty shape: new X
- closest known family: answer sentence selection / justification ranking
- kill argument: the object is a weighted passage reranker over lexical anchors and semantic similarity; justification-selection work already occupies this space
- why it might survive: local files and privacy constraints change deployment, not the object
- falsification path: compare against answer sentence selection / justification ranking literature
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.91

## C06: Regex-First Answer Card Extraction

- name: regex-first answer card extraction
- irreducible object: new answer-card extractor from local passages
- novelty shape: new X
- closest known family: extractive QA heuristics
- kill argument: dates, numbers, and first-sentence fallback are generic extractive QA patterns
- why it might survive: it is simple and local, but not novel
- falsification path: if extractive QA / answer sentence selection captures it, kill it
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.98

## C07: Evidence-Chain Confidence

- name: evidence-chain confidence
- irreducible object: new confidence score from evidence diversity and strength
- novelty shape: new X
- closest known family: heuristic confidence estimation
- kill argument: diversity plus average contribution plus strong-signal bonus is a heuristic confidence layer, not a new formal object
- why it might survive: only as an implementation detail
- falsification path: if it cannot be distinguished from heuristic confidence scoring, kill it
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.88

## C08: Evidence Explanation and Tag Synthesis

- name: evidence explanation and tag synthesis
- irreducible object: new explanation object for ranked file matches
- novelty shape: new X
- closest known family: explanation generation / evidence UI tags
- kill argument: natural-language summaries and tags for lexical/semantic/path evidence are explanation UX, not a new retrieval object
- why it might survive: it improves product trust, but does not survive the rename test
- falsification path: if "explanation layer over evidence features" names it cleanly, kill it
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.95

## C09: Deferred Evidence Enrichment

- name: deferred evidence enrichment
- irreducible object: new progressive evidence-enrichment schedule
- novelty shape: new X for Y
- closest known family: lazy enrichment / deferred computation in progressive systems
- kill argument: Ixos shows semantic hits first and enriches later; that is a reasonable systems optimization, but not a sharp research object
- why it might survive: only if the transition semantics become formal, which the current code does not do
- falsification path: if "deferred enrichment for latency" is sufficient, downgrade it
- empirical probe: inspect progressive stage ordering
- verdict: INCREMENTAL
- confidence: 0.81

## C10: Auto-Refine Heuristic

- name: auto-refine heuristic
- irreducible object: new uncertainty router for progressive local search
- novelty shape: new X for Y
- closest known family: selective query processing / query difficulty routing
- kill argument: gap, entropy, lexical consensus, and top-k averages are standard uncertainty/routing signals
- why it might survive: it is tuned to Ixos, but that is not enough
- falsification path: compare against selective query processing and tail-latency control literature
- empirical probe: code probe of `should_refine`
- verdict: KNOWN
- confidence: 0.90

## C11: Flash/Pro/Lexical/Directory Fusion

- name: Flash/Pro/lexical/directory fusion
- irreducible object: new weighted fusion reranker for progressive search
- novelty shape: new X
- closest known family: hybrid reranking / weighted fusion
- kill argument: the object is a weighted linear blend of existing signals; that is generic fusion
- why it might survive: only as product tuning
- falsification path: if weighted hybrid reranking describes it, kill it
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.95

## C12: Directory Centroid Boost

- name: directory centroid boost
- irreducible object: new directory centroid prior for local retrieval
- novelty shape: new X for Y
- closest known family: centroid priors / folder-context priors
- kill argument: EMA directory centroids with hotness are a standard context prior; novelty depends too much on the filesystem wrapper
- why it might survive: it is practically useful, but not sharp enough
- falsification path: compare against hierarchy-aware retrieval and semantic-cluster priors
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.88

## C13: FSTD Topology-Distilled Directory Prior

- name: topology-distilled directory prior
- irreducible object: new topology-distilled reranking prior
- novelty shape: new X for Y
- closest known family: hierarchy-aware retrieval / structural priors
- kill argument: once reduced, this is a hierarchy prior predicted from query embeddings; the filesystem domain becomes the third qualifier that keeps it sounding novel
- why it might survive: the distillation angle is cleaner than generic centroids, but still too dependent on directory topology as niche wrapper
- falsification path: attack with hierarchy-aware retrieval literature; if a simpler hierarchy-prior term fits, downgrade it
- empirical probe: none needed in this pass
- verdict: INCREMENTAL
- confidence: 0.67

## C14: Witness Guard Heuristic

- name: witness guard heuristic
- irreducible object: new witness-based privacy guard in semantic reranking
- novelty shape: new X for Y
- closest known family: heuristic safe-search / lexical verification before promotion
- kill argument: the current implementation is only a score bonus and penalty scheme; it does not yet define a first-class obligation, invariant, or certificate
- why it might survive: it points toward a sharper object, but the shipped form is still heuristic
- falsification path: if it can be renamed "heuristic witness boosting for sensitive paths", downgrade it
- empirical probe: witness-guard unit suite
- verdict: INCREMENTAL
- confidence: 0.78

## C15: Witness Anchor Promotion into Top-K

- name: witness anchor promotion
- irreducible object: new promotion rule for witness-backed candidates
- novelty shape: new X
- closest known family: reranking promotion rule / fallback precision repair
- kill argument: it is a narrow heuristic that moves a witness-backed candidate into top-k when the top window lacks a strong witness
- why it might survive: only as part of a sharper certificate object
- falsification path: if it cannot stand alone without `C14`, downgrade it
- empirical probe: witness-guard unit suite
- verdict: INCREMENTAL
- confidence: 0.83

## C16: Sensitive-Query Exception

- name: sensitive-query exception
- irreducible object: new query-conditioned privacy exception
- novelty shape: new X
- closest known family: policy gating / safe-search exception handling
- kill argument: allowing sensitive retrieval when the query explicitly requests it is normal policy logic, not a new research object
- why it might survive: it is necessary for usability, but not novel
- falsification path: if "policy exception for requested sensitive content" names it cleanly, kill it
- empirical probe: none needed
- verdict: KNOWN
- confidence: 0.90

## C17: Integrity-and-Behavior Secure Ranker

- name: integrity-and-behavior secure ranker
- irreducible object: new trust-aware reranker using integrity, temporal, behavior, and personal signals
- novelty shape: new X
- closest known family: trust-aware ranking / anti-tamper reranking
- kill argument: weighted reranking over trust and behavior features is a known family; the exact feature mix is implementation tuning
- why it might survive: product relevance, not novelty
- falsification path: if trust-aware ranking captures it, kill it
- empirical probe: none needed for novelty decision
- verdict: KNOWN
- confidence: 0.96

## C18: Ask-Mode Selected-Model Invariant

- name: Ask-mode selected-model invariant
- irreducible object: new invariant that Ask Mode must respect the user-selected model
- novelty shape: new X
- closest known family: product routing invariant
- kill argument: this is a product correctness rule, not a research object
- why it might survive: it matters operationally, but that does not create novelty
- falsification path: if it disappears outside the product wrapper, kill it
- empirical probe: `test_ask_mode_respects_selected_model`
- verdict: INVALID
- confidence: 0.99

## C19: Witness-Obligation Certificate for Sensitive Local Retrieval

- name: witness-obligation certificate for sensitive local retrieval
- irreducible object: new witness-obligation certificate for privacy-safe local retrieval
- novelty shape: new X for Y
- closest known family: safe-search filters / privacy-aware retrieval controls / lexical verification heuristics
- kill argument: attack 1 says it is just safe-search policy; attack 2 says it is just Ixos's existing witness-guard heuristic. Both attacks fail if the object is sharpened into an obligation that blocks exposure without explicit witness support or sensitive-query intent
- why it might survive: the object is a first-class exposure condition, not a classifier, fusion rule, or explanation layer, and the current repo already contains the right failure surface
- falsification path: find primary-source prior art that explicitly defines a retrieval-time witness obligation for exposure-sensitive results; if found, downgrade immediately
- empirical probe: turn the current heuristic into a binary obligation and benchmark false sensitive exposure rate, MRR@10, and latency on a synthetic sensitive-path dataset
- verdict: SURVIVES
- confidence: 0.58

## C20: Probe-Miss Risk Certificate for Progressive Local Search

- name: probe-miss risk certificate for progressive local search
- irreducible object: new probe-miss risk certificate for progressive local search
- novelty shape: new X for Y
- closest known family: risk-controlled pruning / selective query processing / cascade ranking
- kill argument: attack 1 says it is just uncertainty routing; attack 2 says it is just multi-stage pruning. Both attacks fail if the object remains an anytime miss-risk certificate over remaining pipeline work, rather than a heuristic classifier or budget rule
- why it might survive: the current repo has stage transitions and heuristics but no explicit certificate that the remaining lexical/semantic/refine/evidence work cannot still overturn top-k
- falsification path: find prior art with an anytime top-k miss-risk certificate across multi-stage retrieval, especially one close to progressive local search
- empirical probe: instrument top-k swaps after each stage, fit a conservative bound from gap/entropy/witness features, and compare certificate-driven stopping to current `should_refine` behavior
- verdict: SURVIVES
- confidence: 0.64

