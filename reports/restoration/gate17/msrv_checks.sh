set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate17-msrv"
mkdir "$task_receipts"
trap 'cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate17/msrv' EXIT
cargo +1.89.0 test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 --target-dir "$IXOS_REVIEW_ROOT/target-msrv-g16" > "$task_receipts/tests.stdout" 2> "$task_receipts/tests.stderr"
cargo +1.89.0 build --release --locked --bin ixos --jobs 2 --target-dir "$IXOS_REVIEW_ROOT/target-msrv-g16" > "$task_receipts/build.stdout" 2> "$task_receipts/build.stderr"
sha256sum "$IXOS_REVIEW_ROOT/target-msrv-g16/release/ixos" Cargo.lock > "$task_receipts/identity.stdout"
python3 scripts/verify_session_stability.py --binary "$IXOS_REVIEW_ROOT/target-msrv-g16/release/ixos" --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --output "$task_receipts/stability" > "$task_receipts/stability.stdout" 2> "$task_receipts/stability.stderr"
printf 'Current feedback reducer minimum-compiler checks complete\n'
