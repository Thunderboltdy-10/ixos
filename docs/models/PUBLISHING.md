# Model publication playbook

No Hugging Face upload has been performed. Publish only after attribution/license and actual-artifact checks pass, and after the owner authorizes the external upload.

1. Reproduce with `python scripts/setup_models.py --profile all --destination NEW_FOLDER`; pin NumPy 2.3.5 for document conversion. Verify the catalog's three artifact hashes/fingerprint, original four parent hashes/revision, preserved card and install receipt. Run actual-model retrieval/cache probes against these reproduced folders.
2. Use descriptive derivative names identifying the upstream parent and transform. Do not present unchanged weights or storage quantization as newly trained Ixos models. Include original parent authorship/license/revision, transformation scripts/commit, original tokenizer limits, runtime precision and honest disk/RSS distinctions in the model card.
3. Upload only weights, tokenizer, config, upstream card, derivative card and nonprivate recipe receipts. Exclude corpora, source/cache signing keys, local paths, private process records and envs. Inspect the exact staged files before upload.
4. Record the resulting immutable repository revision, per-file SHA256 and model fingerprint. Update catalog/download manifests only after a fresh download verifies identity and CLI behavior on each native platform. Preserve prior model IDs/results; no silent replacement.
5. A newly distilled model also needs teacher/data/license provenance, disjoint evaluation groups, exact training/quantization recipes, and before/after quality/latency/RSS/output costs. Screen on dev/validation; freeze before fresh held-out scoring.
