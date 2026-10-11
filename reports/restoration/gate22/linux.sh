#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
source "$root/environment.sh"
unset IXOS_MODEL_PATH
export PYTHONPATH="$root/source"
mkdir -p "$root/gate22"
cp "$root/source/target/release/ixos" "$root/control-gate22-ixos"
cp /mnt/c/Users/pablo/Downloads/Ixos/src/retrieval/commands.rs "$root/source/src/retrieval/commands.rs"
cp /mnt/c/Users/pablo/Downloads/Ixos/scripts/verify_jsonl_envelopes.py "$root/source/scripts/verify_jsonl_envelopes.py"
cd "$root/source"
cargo test -p ixos-protocol --lib --locked --jobs 2 > "$root/gate22/core-tests.stdout" 2> "$root/gate22/core-tests.stderr"
cargo test -p ixos-protocol --test settings_matrix --locked --jobs 2 > "$root/gate22/settings.stdout" 2> "$root/gate22/settings.stderr"
cargo build --release --locked --bin ixos > "$root/gate22/build.stdout" 2> "$root/gate22/build.stderr"
sha256sum target/release/ixos > "$root/gate22/binary.sha256"
python3 scripts/verify_jsonl_envelopes.py --binary "$root/control-gate22-ixos" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --expect-bug --output "$root/gate22/before" > "$root/gate22/before-probe.stdout" 2> "$root/gate22/before-probe.stderr"
python3 scripts/verify_jsonl_envelopes.py --binary target/release/ixos --control "$root/control-gate22-ixos" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --output "$root/gate22/after" > "$root/gate22/after-probe.stdout" 2> "$root/gate22/after-probe.stderr"
