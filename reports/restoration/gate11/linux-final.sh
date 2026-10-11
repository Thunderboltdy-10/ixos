#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate11-final"
mkdir "$task_receipts"
for relative in scripts/package_cli.py docs/getting-started/INSTALLATION.md; do
 cp "/mnt/c/Users/pablo/Downloads/Ixos/$relative" "$relative"
done
python3 scripts/package_cli.py --binary target/release/ixos --output "$IXOS_REVIEW_ROOT/ixos-gate11-linux-final-local.tar.gz" > "$task_receipts/package.stdout" 2> "$task_receipts/package.stderr"
mkdir "$IXOS_REVIEW_ROOT/package-gate11-final"
tar -xf "$IXOS_REVIEW_ROOT/ixos-gate11-linux-final-local.tar.gz" -C "$IXOS_REVIEW_ROOT/package-gate11-final"
cd "$IXOS_REVIEW_ROOT/package-gate11-final"
python3 -S scripts/setup_models.py --profile code --destination "$IXOS_REVIEW_ROOT/package-gate11-models" > "$task_receipts/setup.stdout" 2> "$task_receipts/setup.stderr"
python3 "$IXOS_REVIEW_ROOT/source/scripts/verify_query_literals.py" --binary "$IXOS_REVIEW_ROOT/package-gate11-final/ixos" --model "$IXOS_REVIEW_ROOT/package-gate11-models/potion-code-16M-v2-unbounded" --output "$task_receipts/query" > "$task_receipts/query.stdout" 2> "$task_receipts/query.stderr"
cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate11/linux-final
printf 'Final Linux documentation/package check complete\n'
