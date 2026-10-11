set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate17"
mkdir "$task_receipts"
trap 'cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate17/linux' EXIT
cp target/release/ixos "$IXOS_REVIEW_ROOT/control-gate17-ixos"
cp /mnt/c/Users/pablo/Downloads/Ixos/scripts/verify_session_stability.py scripts/verify_session_stability.py
python3 scripts/verify_session_stability.py --binary "$IXOS_REVIEW_ROOT/control-gate17-ixos" --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --output "$task_receipts/before" --expect-variation > "$task_receipts/before.stdout" 2> "$task_receipts/before.stderr"
cp /mnt/c/Users/pablo/Downloads/Ixos/src/retrieval/mod.rs src/retrieval/mod.rs
sha256sum src/retrieval/mod.rs > "$task_receipts/source-sha256.txt"
cargo test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 > "$task_receipts/tests.stdout" 2> "$task_receipts/tests.stderr"
cargo build --release --locked --bin ixos --jobs 2 > "$task_receipts/build.stdout" 2> "$task_receipts/build.stderr"
sha256sum target/release/ixos > "$task_receipts/binary-sha256.txt"
python3 scripts/verify_session_stability.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --output "$task_receipts/after" > "$task_receipts/after.stdout" 2> "$task_receipts/after.stderr"
python3 scripts/verify_cache_precision.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --output "$task_receipts/precision" > "$task_receipts/precision.stdout" 2> "$task_receipts/precision.stderr"
python3 scripts/verify_doctor.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/doctor" > "$task_receipts/doctor.stdout" 2> "$task_receipts/doctor.stderr"
python3 scripts/verify_restored_cli.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/profiles.json" > "$task_receipts/profiles.stdout" 2> "$task_receipts/profiles.stderr"
printf 'Native Linux multi-feedback stability and current contracts complete\n'
