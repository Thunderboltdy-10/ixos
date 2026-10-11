#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
cd "$IXOS_REVIEW_ROOT/source"
for relative in src/storage/ads_windows.rs src/retrieval/cache.rs src/storage/personal_ranking.rs src/ixos_embed/mmap_model.rs scripts/verify_retrieval_engine.py; do
    cp "/mnt/c/Users/pablo/Downloads/Ixos/$relative" "$relative"
done
cargo test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 > "$IXOS_REVIEW_ROOT/receipts/core-tests-final.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/core-tests-final.stderr"
cargo build --release --locked --bin ixos --jobs 2 > "$IXOS_REVIEW_ROOT/receipts/build-final.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/build-final.stderr"
sha256sum target/release/ixos > "$IXOS_REVIEW_ROOT/receipts/binary-hash-final.stdout"
python3 scripts/verify_retrieval_engine.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$IXOS_REVIEW_ROOT/receipts/native-contract-final.json" > "$IXOS_REVIEW_ROOT/receipts/native-final.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/native-final.stderr"
python3 scripts/verify_restored_cli.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$IXOS_REVIEW_ROOT/receipts/profile-contract-final.json" > "$IXOS_REVIEW_ROOT/receipts/profiles-final.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/profiles-final.stderr"
python3 scripts/package_cli.py --binary target/release/ixos --output "$IXOS_REVIEW_ROOT/ixos-linux.tar.gz" > "$IXOS_REVIEW_ROOT/receipts/package.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/package.stderr"
mkdir "$IXOS_REVIEW_ROOT/package-review"
tar -xf "$IXOS_REVIEW_ROOT/ixos-linux.tar.gz" -C "$IXOS_REVIEW_ROOT/package-review"
"$IXOS_REVIEW_ROOT/package-review/ixos" search 'raw hash after edits' --dir src/retrieval --profile lexical --json > "$IXOS_REVIEW_ROOT/receipts/package-smoke.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/package-smoke.stderr"
printf 'Linux final source/cache/test/package checks complete\n'
