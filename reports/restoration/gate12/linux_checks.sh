#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
cd "$IXOS_REVIEW_ROOT/source"
task_receipts="$IXOS_REVIEW_ROOT/receipts-gate12"
mkdir "$task_receipts"
cp target/release/ixos "$IXOS_REVIEW_ROOT/control-gate12-ixos"
sha256sum "$IXOS_REVIEW_ROOT/control-gate12-ixos" > "$task_receipts/control-sha256.txt"
mkdir -p docs/licenses
for relative in Cargo.toml Cargo.lock src/ixos_embed/encoded_model.rs src/ixos_embed/model2vec.rs src/ixos_embed/mod.rs src/retrieval/mod.rs src/bin/ixos-lab-embed.rs scripts/compare_encoded_loader.py scripts/compare_cli_loaders.py scripts/profile_resident.py scripts/package_cli.py docs/licenses/model2vec-rs-MIT.txt; do
    cp "/mnt/c/Users/pablo/Downloads/Ixos/$relative" "$relative"
    sha256sum "$relative" >> "$task_receipts/source-sha256.txt"
done
mkdir "$IXOS_REVIEW_ROOT/frozen-code-gate12"
cp -r /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate11/reviewer-source/src "$IXOS_REVIEW_ROOT/frozen-code-gate12/src"
cargo test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 > "$task_receipts/tests.stdout" 2> "$task_receipts/tests.stderr"
cargo build --release --locked --bin ixos --bin ixos-lab-embed --jobs 2 > "$task_receipts/build.stdout" 2> "$task_receipts/build.stderr"
sha256sum target/release/ixos target/release/ixos-lab-embed > "$task_receipts/binary-sha256.txt"
python3 scripts/verify_query_literals.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/query" > "$task_receipts/query.stdout" 2> "$task_receipts/query.stderr"
python3 scripts/verify_evidence_policy.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/evidence" > "$task_receipts/evidence.stdout" 2> "$task_receipts/evidence.stderr"
python3 scripts/verify_retrieval_engine.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$task_receipts/engine.json" > "$task_receipts/engine.stdout" 2> "$task_receipts/engine.stderr"
python3 scripts/verify_restored_cli.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$task_receipts/profiles.json" > "$task_receipts/profiles.stdout" 2> "$task_receipts/profiles.stderr"
python3 scripts/compare_encoded_loader.py --binary target/release/ixos-lab-embed --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --source-export "$IXOS_REVIEW_ROOT/frozen-code-gate12" --runs 5 --output "$IXOS_REVIEW_ROOT/encoded-loader-gate12-raw" --receipt "$task_receipts/encoded-comparison.json" > "$task_receipts/encoded-comparison.stdout" 2> "$task_receipts/encoded-comparison.stderr"
python3 scripts/compare_cli_loaders.py --binary target/release/ixos --reference-binary "$IXOS_REVIEW_ROOT/control-gate12-ixos" --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --root "$IXOS_REVIEW_ROOT/frozen-code-gate12/src" --runs 5 --warm-runs 10 --output "$task_receipts/cli-costs" > "$task_receipts/cli-costs.stdout" 2> "$task_receipts/cli-costs.stderr"
cp -r "$task_receipts" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate12/linux
printf 'Native Linux gate12 source, model and CLI checks complete\n'
