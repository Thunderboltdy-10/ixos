# Current models and recipes

Ixos uses attributed third-party static embedding parents. Gate 3 did not train or distill a new student. Parent weights are retained locally outside Git; preparation code and pinned identities are version controlled.

| Profile | Pinned parent | Local variant | Preparation |
|---|---|---|---|
| code | `minishlab/potion-code-16M-v2`, revision `e9d2a44ca6a05ac6685f3b23709ea57eb7352d5b` | `potion-code-16M-v2-unbounded` | Preserve weights; tokenizer truncation/padding set to null |
| documents | `minishlab/potion-retrieval-32M`, revision `6fc8051fab2a1e0ee76689cf08c853792ac285e7` | `potion-retrieval-32M-row-int8` | Row-wise int8 storage + float row scales; tokenizer unchanged |

Both parents declare MIT licenses. [Code parent card](https://huggingface.co/minishlab/potion-code-16M-v2), [general parent card](https://huggingface.co/minishlab/potion-retrieval-32M). The installer preserves upstream cards; it validates exact SHA256s and runtime fingerprints from `config/retrieval-models.json`.

The selected code artifact totals 33,514,284 bytes across weights/tokenizer/config. General row-int8 totals 34,048,476 bytes versus 130,703,808 for the original parent. These are disk footprints. The runtime expands vocabulary rows to F32 (~62 MiB code / ~123 MiB general just for the table), plus tokenizer, source, terms, vectors and other allocations. Storage quantization does not prove an RSS or integer-inference improvement. Worst-device behavior remains unmeasured.

Measured Windows resident processes over 112 Ixos sources peaked at about 131 MiB (code) / 203 MiB (general). These include startup/preparation and are specific to this small code corpus, not the dense document suite or weak hardware. See [Gate 4 resource profile](../../reports/restoration/GATE4.md) for working-set versus committed-byte conditions and raw receipts.

The original code parent inherits a 512-token cap. Flash inherits 128-token truncation/padding. `max_tokens=None` at the API does not disable artifact tokenizer truncation. Normalized variants have separate fingerprints, unchanged weights and explicit no-training receipts. General has no inherited cap. Every eligible token contributes to full pooling, but pooling can dilute a rare topic; code representative sampling can miss an unsampled concept.

`scripts/setup_models.py --profile code|documents|all` reproduces selected derivatives. `eval/normalize_tokenizer.py`, `eval/compress_model.py` contain the transformations. Older Flash/Potion/Pro docs, manifests and lab plans are preserved in `docs/archive/pre-restoration/` and older archive folders. Legacy runtime IDs remain for comparison/desktop compatibility. A missing `ixos-pro-v2` artifact is not evidence of a shipped true Pro model.

Future distillation must use new artifact IDs, pinned teacher revisions/licenses, training data/split provenance and actual quality/runtime measurements. Current modern-teacher research is a proposal, not a tested improvement. [Model publication playbook](PUBLISHING.md).
