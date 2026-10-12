#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
work="$root/gate26-grading"
receipt="$root/gate26"
mkdir -p "$work"
cp /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate26/grading/instances.json "$work/instances.json"
cp /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate26/grading/predictions.json "$work/predictions.json"
cp "$root/gate26/exports/exports.json" "$work/exports.json"
cp /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate26/grade_native.py "$work/grade_native.py"
cd "$work"
"$root/gate25-harness-venv/bin/python" -u "$work/grade_native.py" "$work" "$receipt" > "$receipt/grading.stdout" 2> "$receipt/grading.stderr"
