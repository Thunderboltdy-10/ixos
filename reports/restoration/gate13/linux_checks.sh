#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate13"
mkdir "$task_receipts"
cp target/release/ixos "$IXOS_REVIEW_ROOT/control-gate13-ixos"
for relative in src/retrieval/cache.rs src/retrieval/mod.rs src/ixos_embed/model.rs scripts/verify_cache_precision.py docs/ARCHITECTURE.md docs/CLI.md docs/engineering/RELEASE.md; do
 cp "/mnt/c/Users/pablo/Downloads/Ixos/$relative" "$relative"
 sha256sum "$relative" >> "$task_receipts/source-sha256.txt"
done
python3 scripts/verify_cache_precision.py --binary "$IXOS_REVIEW_ROOT/control-gate13-ixos" --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --output "$task_receipts/before" --expect-difference > "$task_receipts/before.stdout" 2> "$task_receipts/before.stderr"
cargo test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 > "$task_receipts/tests.stdout" 2> "$task_receipts/tests.stderr"
cargo build --release --locked --bin ixos --jobs 2 > "$task_receipts/build.stdout" 2> "$task_receipts/build.stderr"
sha256sum target/release/ixos > "$task_receipts/binary-sha256.txt"
python3 scripts/verify_cache_precision.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --output "$task_receipts/after" > "$task_receipts/after.stdout" 2> "$task_receipts/after.stderr"
python3 scripts/verify_evidence_policy.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/evidence" > "$task_receipts/evidence.stdout" 2> "$task_receipts/evidence.stderr"
python3 scripts/verify_query_literals.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/query" > "$task_receipts/query.stdout" 2> "$task_receipts/query.stderr"
python3 scripts/verify_retrieval_engine.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/engine.json" > "$task_receipts/engine.stdout" 2> "$task_receipts/engine.stderr"
python3 scripts/verify_restored_cli.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/profiles.json" > "$task_receipts/profiles.stdout" 2> "$task_receipts/profiles.stderr"
cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate13/linux
printf 'Native Linux Gate13 cache precision and contracts complete\n'
