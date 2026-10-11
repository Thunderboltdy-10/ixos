#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
cd "$IXOS_REVIEW_ROOT/source"
for relative in docs/CLI.md docs/ARCHITECTURE.md skills/ixos-retrieval/SKILL.md; do
    cp "/mnt/c/Users/pablo/Downloads/Ixos/$relative" "$relative"
done
python3 scripts/package_cli.py --binary target/release/ixos --output "$IXOS_REVIEW_ROOT/ixos-linux-reviewed.tar.gz" > "$IXOS_REVIEW_ROOT/receipts/package-reviewed.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/package-reviewed.stderr"
mkdir "$IXOS_REVIEW_ROOT/package-reviewed"
tar -xf "$IXOS_REVIEW_ROOT/ixos-linux-reviewed.tar.gz" -C "$IXOS_REVIEW_ROOT/package-reviewed"
"$IXOS_REVIEW_ROOT/package-reviewed/ixos" grep --dir src/storage -F --limit 2 -- --literal-option > "$IXOS_REVIEW_ROOT/receipts/package-reviewed-grep.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/package-reviewed-grep.stderr"
"$IXOS_REVIEW_ROOT/package-reviewed/ixos" search 'native metadata fallback' --dir src/retrieval --model-path "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --cache-mode ephemeral --json > "$IXOS_REVIEW_ROOT/receipts/package-reviewed-model.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/package-reviewed-model.stderr"
