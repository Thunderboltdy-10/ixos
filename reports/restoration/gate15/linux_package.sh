set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate15-package"
mkdir "$task_receipts"
trap 'cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate15/linux-package' EXIT
python3 scripts/package_cli.py --binary target/release/ixos --output "$IXOS_REVIEW_ROOT/ixos-gate15-local.tar.gz" > "$task_receipts/package.stdout" 2> "$task_receipts/package.stderr"
mkdir "$IXOS_REVIEW_ROOT/package-gate15"
tar -xzf "$IXOS_REVIEW_ROOT/ixos-gate15-local.tar.gz" -C "$IXOS_REVIEW_ROOT/package-gate15"
cd "$IXOS_REVIEW_ROOT/package-gate15"
python3 scripts/setup_models.py --profile all --destination "$IXOS_REVIEW_ROOT/models" > "$task_receipts/setup.stdout" 2> "$task_receipts/setup.stderr"
python3 "$IXOS_REVIEW_ROOT/source/scripts/verify_doctor.py" --binary ./ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/doctor" > "$task_receipts/doctor.stdout" 2> "$task_receipts/doctor.stderr"
python3 "$IXOS_REVIEW_ROOT/source/scripts/verify_restored_cli.py" --binary ./ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/profiles.json" > "$task_receipts/profiles.stdout" 2> "$task_receipts/profiles.stderr"
printf 'Native Linux Gate15 extracted package checks complete\n'
