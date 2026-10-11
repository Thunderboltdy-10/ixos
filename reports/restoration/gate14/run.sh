source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
cp /mnt/c/Users/pablo/Downloads/Ixos/scripts/profile_constrained.py scripts/profile_constrained.py
python3 scripts/profile_constrained.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --protocol /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate14/protocol-v1.json --output "$IXOS_REVIEW_ROOT/receipts-gate14" > "$IXOS_REVIEW_ROOT/gate14.stdout" 2> "$IXOS_REVIEW_ROOT/gate14.stderr"
task_code=$?
cp "$IXOS_REVIEW_ROOT/gate14.stdout" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate14/run.stdout
cp "$IXOS_REVIEW_ROOT/gate14.stderr" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate14/run.stderr
cp -r "$IXOS_REVIEW_ROOT/receipts-gate14" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate14/runtime
exit "$task_code"