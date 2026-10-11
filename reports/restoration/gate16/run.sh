#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate16"
task_target="$IXOS_REVIEW_ROOT/target-msrv-g16"
mkdir "$task_receipts"
test ! -e "$task_target"
trap 'cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate16/linux' EXIT
sha256sum Cargo.lock Cargo.toml target/release/ixos > "$task_receipts/control-sha256.txt"
rustup toolchain install 1.89.0 --profile minimal --no-self-update > "$task_receipts/toolchain.stdout" 2> "$task_receipts/toolchain.stderr"
rustc +1.89.0 --version --verbose > "$task_receipts/rustc-version.stdout"
cargo +1.89.0 --version > "$task_receipts/cargo-version.stdout"
cargo +1.89.0 build --release --locked --bin ixos --jobs 2 --target-dir "$task_target" > "$task_receipts/build.stdout" 2> "$task_receipts/build.stderr"
cargo +1.89.0 test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 --target-dir "$task_target" > "$task_receipts/tests.stdout" 2> "$task_receipts/tests.stderr"
sha256sum Cargo.lock Cargo.toml "$task_target/release/ixos" > "$task_receipts/final-sha256.txt"
python3 scripts/verify_doctor.py --binary "$task_target/release/ixos" --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/doctor" > "$task_receipts/doctor.stdout" 2> "$task_receipts/doctor.stderr"
python3 scripts/verify_cache_precision.py --binary "$task_target/release/ixos" --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --output "$task_receipts/precision" > "$task_receipts/precision.stdout" 2> "$task_receipts/precision.stderr"
python3 scripts/verify_restored_cli.py --binary "$task_target/release/ixos" --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/profiles.json" > "$task_receipts/profiles.stdout" 2> "$task_receipts/profiles.stderr"
python3 /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate16/compare.py > "$task_receipts/comparison.stdout" 2> "$task_receipts/comparison.stderr"
printf 'Rust1.89 minimum source build and actual-model checks complete\n'
