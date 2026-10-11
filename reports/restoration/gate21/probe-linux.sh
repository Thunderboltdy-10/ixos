#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
source "$root/environment.sh"
unset PYTHONPATH IXOS_MODEL_PATH
cd /mnt/c/Users/pablo/Downloads/Ixos
python3 reports/restoration/gate21/probe.py --binary "$root/source/target/release/ixos" --control "$root/control-gate21-ixos" --source "$root/gate21-real-source" --output "$root/gate21/linux-probe" --no-tokenizer > "$root/gate21/probe.stdout" 2> "$root/gate21/probe.stderr"
python3 "$root/source/scripts/verify_restored_cli.py" --binary "$root/source/target/release/ixos" --code-model "$root/models/potion-code-16M-v2-unbounded" --documents-model "$root/models/potion-retrieval-32M-row-int8" --frozen-binary "$root/control-gate21-ixos" --output "$root/gate21/profiles.json" > "$root/gate21/profiles.stdout" 2> "$root/gate21/profiles.stderr"
