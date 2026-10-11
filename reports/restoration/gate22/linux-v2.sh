#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
source "$root/environment.sh"
unset IXOS_MODEL_PATH
export PYTHONPATH="$root/source"
cp /mnt/c/Users/pablo/Downloads/Ixos/scripts/verify_jsonl_envelopes.py "$root/source/scripts/verify_jsonl_envelopes.py"
cd "$root/source"
python3 scripts/verify_jsonl_envelopes.py --binary target/release/ixos --control "$root/control-gate22-ixos" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --output "$root/gate22/after-v2" > "$root/gate22/after-v2-probe.stdout" 2> "$root/gate22/after-v2-probe.stderr"
