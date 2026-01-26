# Licensing Strategy

## Recommended path: Open-core

Why: The product value is trust and performance. An open core preserves local-first credibility, while premium model packs and tuned defaults deliver paid value without server-side inference.

### What to open
- Core Rust library and CLI (search pipeline, fusion, evaluation harness)
- UI shell and basic settings
- Baseline Flash model cards and documentation

### What can be paid
- Curated Pro model pack (offline download bundle)
- Tuned fusion weights + calibrated routing defaults
- Enterprise controls (policy, audit, and deployment tooling)

### How to monetize without breaking local-first trust
- Distribute Pro models as signed offline bundles that never call home.
- Keep inference on-device; the only network interaction is optional model download.
- Offer optional paid support, enterprise compliance tooling, and UI enhancements.

### License plan (code)
- Code: dual license MIT/Apache-2.0 (current repo already MIT OR Apache-2.0)
- Paid features: EULA for model packs and enterprise distribution rights

## Model license matrix (verify before release)

| Artifact | Source | License | Usage | Notes |
| --- | --- | --- | --- | --- |
| st-all-mpnet-base-v2 | Sentence Transformers | Apache-2.0 | Teacher | Used for Flash v2/v4 distillation |
| st-paraphrase-mpnet-base-v2 | Sentence Transformers | Apache-2.0 | Teacher | Used for ixos-pro-v1 |
| potion-base-8m | Potion Research | MIT | Flash baseline, Pro fusion | int8 variant used in prod |
| ixos-flash-v2 | Ixos (distilled) | MIT (internal) | Flash default | Derived from mpnet teacher |
| ixos-flash-v4-int8-512 | Ixos (distilled) | Apache-2.0 (derived) | Flash candidate | Derived from mpnet teacher |
| ixos-flash-v4-int8-192 | Ixos (distilled) | Apache-2.0 (derived) | Flash candidate | Derived from mpnet teacher |
| ixos-pro-v1 | Ixos (distilled) | Apache-2.0 (derived) | Legacy pro | Deprecated for quality |
| Pro fusion (flash + potion + lexical) | Ixos pipeline | Composite | Pro pipeline | Requires compatible licenses for each component |
| Qwen3-Embedding-0.6B | Alibaba | Alibaba License | Experimental | Not recommended for prod |

### Notes
- Treat distilled weights as derivative of their teacher licenses.
- Verify license compatibility before bundling weights in paid packs.
- Keep a signed manifest of licenses for any redistributed model pack.
