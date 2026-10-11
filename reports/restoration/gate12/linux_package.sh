#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate12-package"
mkdir "$task_receipts"
for relative in scripts/package_cli.py scripts/setup_models.py docs/README.md docs/ARCHITECTURE.md docs/models/README.md docs/licenses/model2vec-rs-MIT.txt; do
    cp "/mnt/c/Users/pablo/Downloads/Ixos/$relative" "$relative"
    sha256sum "$relative" >> "$task_receipts/source-sha256.txt"
done
python3 scripts/package_cli.py --binary target/release/ixos --output "$IXOS_REVIEW_ROOT/ixos-gate12-local.tar.gz" > "$task_receipts/package.stdout" 2> "$task_receipts/package.stderr"
mkdir "$IXOS_REVIEW_ROOT/package-gate12"
tar -xf "$IXOS_REVIEW_ROOT/ixos-gate12-local.tar.gz" -C "$IXOS_REVIEW_ROOT/package-gate12"
cd "$IXOS_REVIEW_ROOT/package-gate12"
cmp docs/licenses/model2vec-rs-MIT.txt "$IXOS_REVIEW_ROOT/source/docs/licenses/model2vec-rs-MIT.txt"
python3 -S scripts/setup_models.py --profile all --destination "$IXOS_REVIEW_ROOT/models" > "$task_receipts/setup.stdout" 2> "$task_receipts/setup.stderr"
python3 "$IXOS_REVIEW_ROOT/source/scripts/verify_restored_cli.py" --binary "$IXOS_REVIEW_ROOT/package-gate12/ixos" --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/profiles.json" > "$task_receipts/profiles.stdout" 2> "$task_receipts/profiles.stderr"
cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate12/linux-package
printf 'Native Linux extracted gate12 package passed\n'
