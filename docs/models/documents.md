---
license: mit
language: en
---

# Ixos Documents

Derived from [minishlab/potion-retrieval-32M](https://huggingface.co/minishlab/potion-retrieval-32M), made by MinishLab and released under the MIT license.
Pinned upstream revision: `6fc8051fab2a1e0ee76689cf08c853792ac285e7`.

The 512-dimensional vocabulary rows are stored as symmetric int8 values. For each row, the scale is its maximum absolute value divided by 127 (or 1 for an all-zero row). Values are rounded to the nearest integer with ties to even, and clipped to [-127, 127]. Any upstream per-token weight multiplies the row scale. Int8 rows are stored as `embeddings`, and float32 scales as `weights`, in safetensors format. Tokenizer and configuration files are unchanged.

No training or distillation was done. The encoded Rust loader decodes the used rows and pools in float32 on CPU; this is a storage transformation, not integer inference.
Run `python scripts/models.py build` to reproduce the files and verify the hashes against the Rust installer table.
The publication includes `UPSTREAM_MODEL_CARD.md` with the original authorship, license and training details.
