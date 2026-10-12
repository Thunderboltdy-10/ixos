#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
source "$root/environment.sh"
cd "$root/source"
export PYTHONPATH="$root/source"
receipt="$root/gate23"
cp /mnt/c/Users/pablo/Downloads/Ixos/scripts/verify_inspection_feedback.py scripts/verify_inspection_feedback.py
python3 scripts/verify_inspection_feedback.py --binary target/release/ixos --control "$root/control-gate23-ixos" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --output "$receipt/after-v2" > "$receipt/after-v2-probe.stdout" 2> "$receipt/after-v2-probe.stderr"
python3 -m scripts.verify_jsonl_envelopes --binary target/release/ixos --control "$root/control-gate23-ixos" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --output "$receipt/envelopes" > "$receipt/envelopes.stdout" 2> "$receipt/envelopes.stderr"
python3 scripts/verify_restored_cli.py --binary target/release/ixos --frozen-binary "$root/control-gate23-ixos" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --output "$receipt/profiles.json" > "$receipt/profiles.stdout" 2> "$receipt/profiles.stderr"
