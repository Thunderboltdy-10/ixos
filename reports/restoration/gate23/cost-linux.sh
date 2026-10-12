#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
source "$root/environment.sh"
cd "$root/source"
export PYTHONPATH="$root/source"
receipt="$root/gate23"
if [ ! -d "$root/gate23-perf-source" ]; then
  cp -R /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate23/perf-source "$root/gate23-perf-source"
fi
cp /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate23/cost.py reports/restoration/gate23/cost.py
python3 reports/restoration/gate23/cost.py --binary target/release/ixos --control "$root/control-gate23-ixos" --source "$root/gate23-perf-source" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --no-tokenizer --output "$receipt/cost-linux" > "$receipt/cost-linux.stdout" 2> "$receipt/cost-linux.stderr"
cp /mnt/c/Users/pablo/Downloads/Ixos/scripts/verify_inspection_feedback.py scripts/verify_inspection_feedback.py
python3 scripts/verify_inspection_feedback.py --binary target/release/ixos --control "$root/control-gate23-ixos" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --policies-only --output "$receipt/policies" > "$receipt/policies.stdout" 2> "$receipt/policies.stderr"
