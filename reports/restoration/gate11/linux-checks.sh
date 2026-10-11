#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate11"
mkdir "$task_receipts"
for relative in src/retrieval/mod.rs scripts/verify_query_literals.py scripts/verify_evidence_policy.py scripts/package_cli.py scripts/setup_models.py skills/ixos-retrieval/SKILL.md docs/CLI.md docs/ARCHITECTURE.md docs/getting-started/INSTALLATION.md docs/models/README.md docs/models/PUBLISHING.md; do
    cp "/mnt/c/Users/pablo/Downloads/Ixos/$relative" "$relative"
    sha256sum "$relative" >> "$task_receipts/source-sha256.txt"
done
cargo test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 > "$task_receipts/tests.stdout" 2> "$task_receipts/tests.stderr"
cargo build --release --locked --bin ixos --jobs 2 > "$task_receipts/build.stdout" 2> "$task_receipts/build.stderr"
sha256sum target/release/ixos > "$task_receipts/binary-sha256.txt"
python3 scripts/verify_query_literals.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/query" > "$task_receipts/query.stdout" 2> "$task_receipts/query.stderr"
python3 scripts/verify_evidence_policy.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/evidence" > "$task_receipts/evidence.stdout" 2> "$task_receipts/evidence.stderr"
python3 scripts/verify_retrieval_engine.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/engine.json" > "$task_receipts/engine.stdout" 2> "$task_receipts/engine.stderr"
python3 scripts/verify_restored_cli.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/profiles.json" > "$task_receipts/profiles.stdout" 2> "$task_receipts/profiles.stderr"
python3 scripts/package_cli.py --binary target/release/ixos --output "$IXOS_REVIEW_ROOT/ixos-gate11-linux-local.tar.gz" > "$task_receipts/package.stdout" 2> "$task_receipts/package.stderr"
mkdir "$IXOS_REVIEW_ROOT/package-gate11"
tar -xf "$IXOS_REVIEW_ROOT/ixos-gate11-linux-local.tar.gz" -C "$IXOS_REVIEW_ROOT/package-gate11"
cd "$IXOS_REVIEW_ROOT/package-gate11"
python3 -S scripts/setup_models.py --profile code --destination "$IXOS_REVIEW_ROOT/package-gate11-models" > "$task_receipts/package-setup.stdout" 2> "$task_receipts/package-setup.stderr"
"$IXOS_REVIEW_ROOT/package-gate11/ixos" --config "$IXOS_REVIEW_ROOT/package-gate11-absent.toml" search 'quoted identifier raw hash' --dir "$IXOS_REVIEW_ROOT/source/src/retrieval" --model-path "$IXOS_REVIEW_ROOT/package-gate11-models/potion-code-16M-v2-unbounded" --cache-mode ephemeral --json --stats > "$task_receipts/package-search.stdout" 2> "$task_receipts/package-search.stderr"
python3 "$IXOS_REVIEW_ROOT/source/scripts/verify_query_literals.py" --binary "$IXOS_REVIEW_ROOT/package-gate11/ixos" --model "$IXOS_REVIEW_ROOT/package-gate11-models/potion-code-16M-v2-unbounded" --output "$task_receipts/package-query" > "$task_receipts/package-query.stdout" 2> "$task_receipts/package-query.stderr"
cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate11/linux
printf 'Native Linux gate11 tests, source contracts and extracted package checks complete\n'
