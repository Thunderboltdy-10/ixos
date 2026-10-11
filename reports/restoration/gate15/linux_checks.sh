#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate15"
mkdir "$task_receipts"
trap 'cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate15/linux' EXIT
cp target/release/ixos "$IXOS_REVIEW_ROOT/control-gate15-ixos"
target/release/ixos doctor --json --verbose > "$task_receipts/doctor-before.stdout" 2> "$task_receipts/doctor-before.stderr"
echo "$?" > "$task_receipts/doctor-before.exit"
mkdir -p src/diagnostics
for relative in src/main.rs src/cli/commands.rs src/diagnostics.rs src/diagnostics/retrieval.rs scripts/verify_doctor.py scripts/package_cli.py docs/CLI.md docs/getting-started/INSTALLATION.md docs/engineering/RESOURCES.md skills/ixos-retrieval/SKILL.md; do
 cp "/mnt/c/Users/pablo/Downloads/Ixos/$relative" "$relative"
 sha256sum "$relative" >> "$task_receipts/source-sha256.txt"
done
cargo test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 > "$task_receipts/tests.stdout" 2> "$task_receipts/tests.stderr"
cargo build --release --locked --bin ixos --jobs 2 > "$task_receipts/build.stdout" 2> "$task_receipts/build.stderr"
sha256sum target/release/ixos > "$task_receipts/binary-sha256.txt"
python3 scripts/verify_doctor.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/doctor" > "$task_receipts/doctor.stdout" 2> "$task_receipts/doctor.stderr"
python3 scripts/verify_cache_precision.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --output "$task_receipts/precision" > "$task_receipts/precision.stdout" 2> "$task_receipts/precision.stderr"
python3 scripts/verify_restored_cli.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/profiles.json" > "$task_receipts/profiles.stdout" 2> "$task_receipts/profiles.stderr"
printf 'Native Linux Gate15 doctor and current-model contracts complete\n'
