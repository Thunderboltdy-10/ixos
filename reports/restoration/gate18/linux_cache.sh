set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_data="$IXOS_REVIEW_ROOT/qasper-gate18"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate18-cache"
mkdir "$task_data" "$task_receipts"
trap 'cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate18/native-linux' EXIT
mkdir -p scripts/qasper
cp /mnt/c/Users/pablo/Downloads/Ixos/scripts/qasper/*.py scripts/qasper/
cp /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate18/qasper/qasper-train-v0.3.json "$task_data/"
cp -r /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate18/qasper/corpus "$task_data/"
cp /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate18/preparation.json "$task_data/"
sha256sum target/release/ixos "$task_data/qasper-train-v0.3.json" > "$task_receipts/identity.stdout"
python3 -m unittest discover -s scripts/qasper -p 'test_*.py' > "$task_receipts/tests.stdout" 2> "$task_receipts/tests.stderr"
python3 -m scripts.qasper.cache_probe --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --data "$task_data" --preparation "$task_data/preparation.json" --output "$task_receipts/probe" > "$task_receipts/probe.stdout" 2> "$task_receipts/probe.stderr"
printf 'Linux full-paper native/cache equivalence complete\n'
