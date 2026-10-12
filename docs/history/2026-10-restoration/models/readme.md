# Current models and recipes

Ixos uses attributed third-party static embedding parents. Gate 3 did not train or distill a new student. Parent weights are retained locally outside Git; preparation code and pinned identities are version controlled.

| Profile | Pinned parent | Local variant | Preparation |
|---|---|---|---|
| code | `minishlab/potion-code-16M-v2`, revision `e9d2a44ca6a05ac6685f3b23709ea57eb7352d5b` | `potion-code-16M-v2-unbounded` | Preserve weights; tokenizer truncation/padding set to null |
| documents | `minishlab/potion-retrieval-32M`, revision `6fc8051fab2a1e0ee76689cf08c853792ac285e7` | `potion-retrieval-32M-row-int8` | Row-wise int8 storage + float row scales; tokenizer unchanged |

Both parents declare MIT licenses. [Code parent card](https://huggingface.co/minishlab/potion-code-16M-v2), [general parent card](https://huggingface.co/minishlab/potion-retrieval-32M). The installer preserves upstream cards; it validates exact SHA256s and runtime fingerprints from `config/retrieval-models.json`.

The selected code artifact totals 33,514,284 bytes across weights/tokenizer/config. General row-int8 totals 34,048,476 bytes versus 130,703,808 for the original parent. These are disk footprints. The current CLI keeps owned encoded vocabulary rows and decodes used tokens into F32 during inference. The retained eager reference/desktop loader expands the complete table (~62 MiB code / ~123 MiB general), plus tokenizer and other allocations. Both accumulate and normalize in F32; neither is integer inference. Worst-device behavior remains unmeasured.

The earlier eager Windows runtime over 112 Ixos sources peaked at about 131 MiB (code) / 203 MiB (general); those historical [Gate 4 measurements](../../reports/restoration/GATE4.md) remain preserved. [Gate 12](../../reports/restoration/GATE12.md) compares encoded/eager rows with exact real-model vector bits, fresh CLI calls, native cache reuse and resident sessions on fixed sources. Its isolated Windows model bridge used about 52 MiB at ready and peaked around 82–83 MiB for either selected parent, versus 84/144 MiB at ready and 127/188 MiB peak for eager. Those figures exclude a prepared retrieval corpus; they are not dense-document or weak-device guarantees.

The first encoded F16 implementation reduced memory but made the fixed code batch slower. The retained experiment receipts show that regression and the subsequent safe SIMD conversion. Original pooling semantics are attributed to `model2vec-rs 0.1.4`; its MIT notice is included under `docs/licenses/model2vec-rs-MIT.txt` and in local CLI packages. Reference constructors remain available for reproduction. No model weights or selected representation changed in this loader experiment.

The original code parent inherits a 512-token cap. Flash inherits 128-token truncation/padding. `max_tokens=None` at the API does not disable artifact tokenizer truncation. Normalized variants have separate fingerprints, unchanged weights and explicit no-training receipts. General has no inherited cap. Every eligible token contributes to full pooling, but pooling can dilute a rare topic; code representative sampling can miss an unsampled concept.

`scripts/setup_models.py --profile code|documents|all` reproduces selected derivatives. `eval/normalize_tokenizer.py`, `eval/compress_model.py` contain the transformations. Older Flash/Potion/Pro docs, manifests and lab plans are preserved in `docs/archive/pre-restoration/` and older archive folders. Legacy runtime IDs remain for comparison/desktop compatibility. A missing `ixos-pro-v2` artifact is not evidence of a shipped true Pro model.

Future distillation must use new artifact IDs, pinned teacher revisions/licenses, training data/split provenance and actual quality/runtime measurements. Current modern-teacher research is a proposal, not a tested improvement. [Model publication playbook](PUBLISHING.md).
