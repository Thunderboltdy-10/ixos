# MARKDOWN ORGANIZATION

This project has a high markdown count across product docs, reports, specs, lab notes, and archived context.

## SINGLE-SOURCE CATALOG

- Full inventory is maintained in `docs/MARKDOWN_INVENTORY.md`.
- Regenerate after adding/moving docs:

```powershell
$files = rg --files -g '*.md' | Sort-Object
$groups = $files | Group-Object { if($_ -match '[\\/]'){ ($_ -split '[\\/]',2)[0] } else { 'ROOT' } } | Sort-Object Name
# then rewrite docs/MARKDOWN_INVENTORY.md from grouped output
```

## RECOMMENDED DOC TAXONOMY

- `docs/getting-started/*`: onboarding and install
- `docs/product/*`: user-facing feature behavior
- `docs/models/*`: model naming, variants, publishing
- `docs/engineering/*`: performance, profiling, architecture, process
- `docs/agents/*`: agent workflow and operational contracts
- `reports/*`: dated evidence and writeups

## FILE OWNERSHIP RULES

- Keep canonical evergreen docs under `docs/`.
- Keep dated experiment notes under `reports/`.
- Keep operational snapshots (`PLAN.md`, `RUNLOG.md`, `DECISIONS.md`) at repo root.
- Avoid duplicating the same policy across multiple files; link instead.

## CHANGE CHECKLIST FOR NEW DOCS

1. Place file in the right taxonomy folder.
2. Add/refresh links in `docs/README.md`.
3. Regenerate or update `docs/MARKDOWN_INVENTORY.md`.
4. If it changes behavior, update landing docs page and runbook references.

