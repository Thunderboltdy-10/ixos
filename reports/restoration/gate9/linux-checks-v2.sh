#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate9"
mkdir "$task_receipts"
for relative in src/retrieval/evidence.rs src/retrieval/mod.rs src/retrieval/commands.rs src/cli/retrieval_config.rs src/cli/commands.rs src/main.rs scripts/verify_evidence_policy.py scripts/verify_anchor_stability.py; do
    cp "/mnt/c/Users/pablo/Downloads/Ixos/$relative" "$relative"
    sha256sum "$relative" >> "$task_receipts/source-sha256.txt"
done
cargo test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 > "$task_receipts/tests.stdout" 2> "$task_receipts/tests.stderr"
cargo build --release --locked --bin ixos --jobs 2 > "$task_receipts/build.stdout" 2> "$task_receipts/build.stderr"
sha256sum target/release/ixos > "$task_receipts/binary-sha256.txt"
python3 scripts/verify_evidence_policy.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/evidence" > "$task_receipts/evidence.stdout" 2> "$task_receipts/evidence.stderr"
python3 scripts/verify_anchor_stability.py --binary target/release/ixos --output "$task_receipts/stability" > "$task_receipts/stability.stdout" 2> "$task_receipts/stability.stderr"
python3 scripts/verify_retrieval_engine.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/engine.json" > "$task_receipts/engine.stdout" 2> "$task_receipts/engine.stderr"
python3 scripts/verify_restored_cli.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/profiles.json" > "$task_receipts/profiles.stdout" 2> "$task_receipts/profiles.stderr"
cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate9/linux
printf 'Native Linux gate9 core and actual-model contracts complete\n'
