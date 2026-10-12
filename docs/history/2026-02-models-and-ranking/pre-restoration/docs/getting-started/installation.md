# INSTALLATION

## SUPPORTED PLATFORMS

- Windows 10/11 (x64)
- macOS 12+
- Linux: developer flow only unless installer is explicitly shipped

## HARDWARE BASELINE

- CPU: modern multi-core processor (AVX2 recommended)
- Memory: 8 GB minimum, 16 GB recommended
- Disk: 500 MB app + model footprint (varies by selected model)

## DESKTOP INSTALL FLOW

1. Download the installer from `/download` or release artifacts.
2. Run installer and complete OS prompts.
3. Launch Ixos and sign in.
4. Open model settings and ensure at least one model is installed.
5. Run your first search in the default directory.

## MODEL INSTALLATION

- Automatic install can be triggered from in-app model controls.
- Manual scripts and artifact details:
  - `scripts/README.md`
  - `models/lab/MODELS_DOWNLOADED.md`
  - `docs/models/HUGGINGFACE_AND_MODELS.md`

## QUICK VALIDATION

After install, validate these:

- App opens and auth completes.
- Search returns results from a local directory.
- Model switcher shows installed/ready state.
- Ask mode respects selected model.

## TROUBLESHOOTING

- Auth issues: check Clerk config and app/site URLs in `.env`.
- Missing models: use model download action in app settings.
- Slow first search: expected for first-load model warmup.
- Blank results: verify scanned directory and file permissions.

