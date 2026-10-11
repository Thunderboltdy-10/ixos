set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate15-package-final"
mkdir "$task_receipts"
trap 'cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate15/linux-package-final' EXIT
cp /mnt/c/Users/pablo/Downloads/Ixos/docs/getting-started/INSTALLATION.md docs/getting-started/INSTALLATION.md
sha256sum docs/getting-started/INSTALLATION.md > "$task_receipts/guide-sha256.txt"
python3 scripts/package_cli.py --binary target/release/ixos --output "$IXOS_REVIEW_ROOT/ixos-gate15-final.tar.gz" > "$task_receipts/package.stdout" 2> "$task_receipts/package.stderr"
mkdir "$IXOS_REVIEW_ROOT/package-gate15-final"
tar -xzf "$IXOS_REVIEW_ROOT/ixos-gate15-final.tar.gz" -C "$IXOS_REVIEW_ROOT/package-gate15-final"
cd "$IXOS_REVIEW_ROOT/package-gate15-final"
python3 "$IXOS_REVIEW_ROOT/source/scripts/verify_doctor.py" --binary ./ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/doctor" > "$task_receipts/doctor.stdout" 2> "$task_receipts/doctor.stderr"
printf 'Native Linux documentation-only final package refresh passed\n'
