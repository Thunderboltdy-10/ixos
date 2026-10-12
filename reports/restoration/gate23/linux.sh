#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
source "$root/environment.sh"
cd "$root/source"
export PYTHONPATH="$root/source"
receipt="$root/gate23"
mkdir -p "$receipt" reports/restoration/gate23
if [ ! -f "$root/control-gate23-ixos" ]; then
  cp target/release/ixos "$root/control-gate23-ixos"
fi
cp /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate23/baseline.py reports/restoration/gate23/baseline.py
python3 reports/restoration/gate23/baseline.py --binary "$root/control-gate23-ixos" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --output "$receipt/before" > "$receipt/baseline.stdout" 2> "$receipt/baseline.stderr"
for file in src/retrieval/mod.rs src/retrieval/commands.rs src/retrieval/inspections.rs scripts/verify_inspection_feedback.py; do
  cp "/mnt/c/Users/pablo/Downloads/Ixos/$file" "$file"
done
cargo test --locked -p ixos-protocol --lib --jobs 2 > "$receipt/core-tests.stdout" 2> "$receipt/core-tests.stderr"
cargo test --locked -p ixos-protocol --test settings_matrix --jobs 2 > "$receipt/settings.stdout" 2> "$receipt/settings.stderr"
cargo build --release --locked --bin ixos --jobs 2 > "$receipt/build.stdout" 2> "$receipt/build.stderr"
sha256sum target/release/ixos > "$receipt/binary.sha256"
