#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
work="$root/gate26"
mkdir -p "$work"
cp /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate26/actor-inputs.json "$work/actor-inputs.json"
cp /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate26/export_sources.py "$work/export_sources.py"
cd "$work"
"$root/gate25-harness-venv/bin/python" -u "$work/export_sources.py" "$work/actor-inputs.json" "$work/exports" > "$work/export.stdout" 2> "$work/export.stderr"
