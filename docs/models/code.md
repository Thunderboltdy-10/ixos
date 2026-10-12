---
license: mit
language: en
---

# Ixos Code

Derived from [minishlab/potion-code-16M-v2](https://huggingface.co/minishlab/potion-code-16M-v2), made by MinishLab and released under the MIT license.
Pinned upstream revision: `e9d2a44ca6a05ac6685f3b23709ea57eb7352d5b`.

The 256-dimensional embedding weights and model configuration are unchanged.
The tokenizer's `truncation` and `padding` fields are set to `null`, then its JSON is serialized without extra whitespace. This removes inherited input clipping and batch padding. No training or distillation was done.

Ixos uses the static token embeddings on CPU, mean pools and normalizes them.
Longer input does not guarantee better retrieval. Model scores rank files; they are not probabilities.
Run `python scripts/models.py build` to reproduce the files and verify the hashes against the Rust installer table.
The publication includes `UPSTREAM_MODEL_CARD.md` with the original authorship, license and training details.
