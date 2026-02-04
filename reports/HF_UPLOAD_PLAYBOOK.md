# HF_UPLOAD_PLAYBOOK.md

Date: 2026-02-03

## Targets (Canonical Repos)

1) **Flash v2 (production default)**
- Repo: `Thunderboltdy10/Ixos-Flash-v2`
- Source folder: `models/ixos-flash-v2`
- Required files:
  - `config.json`
  - `model.safetensors`
  - `tokenizer.json`
- Recommended extras:
  - `modules.json`
  - `README.md`
  - `MODEL_CARD.md`

2) **Flash v1 (legacy)**
- Repo: `Thunderboltdy10/Ixos-Flash`
- Source folder: `models/ixos-flash-v1`
- Files: same as above

3) **Pro v1 (legacy)**
- Repo: `Thunderboltdy10/Ixos-Pro`
- Source folder: `models/ixos-pro-v1`
- Files: same as above

4) **Pro v2 metadata (optional)**
- Repo: `Thunderboltdy10/Ixos-Pro-v2`
- Source folder: `models/ixos-pro-v2`
- Files:
  - `pro_v2.json`
  - `README.md`

> Note: **Pro v2 is composite**. The app downloads Flash v2 + Potion as dependencies.

---

## Tagging / Version Strategy
- Tag Flash v2 as `v2.0.0` (or `v2.0.1` for minor tuning).
- Keep Flash v1 and Pro v1 tagged as `legacy` or `v1.x.x`.
- If publishing Pro v2 metadata repo, tag with the same `v2.x.x` as Flash v2.

---

## Upload Steps (Git LFS)

```bash
# Example: Flash v2
cd models/ixos-flash-v2
huggingface-cli repo create Thunderboltdy10/Ixos-Flash-v2 --type model
huggingface-cli repo clone Thunderboltdy10/Ixos-Flash-v2 hf-ixos-flash-v2

# Copy files
cp config.json model.safetensors tokenizer.json modules.json README.md MODEL_CARD.md hf-ixos-flash-v2/

cd hf-ixos-flash-v2
huggingface-cli lfs enable

git add .
git commit -m "Add Ixos Flash v2 (int8 512d)"
git tag v2.0.0
git push --tags
```

---

## Checksums

Generate SHA256 for `model.safetensors` and record in release notes:
```bash
sha256sum model.safetensors > SHA256SUMS.txt
```

---

## App Integration (Post-Upload)
- Update `src-tauri/src/commands/system.rs` if repo IDs change.
- Ensure `MODEL_INSTALLATION_SYSTEM_REPORT.md` reflects current repo names.
- For Pro v2, ensure download flow still pulls Flash v2 + Potion.

---

## Deprecation Plan
- Keep Flash v1 / Pro v1 repos available but mark as legacy in README.
- Avoid exposing legacy IDs in UI/CLI.
