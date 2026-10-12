#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
receipt="$root/gate25"
source="$root/gate25-harness-source"
venv="$root/gate25-harness-venv"
uv="$root/gate24-tools/uv"
mkdir -p "$receipt" "$source"
tar -xzf /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate25/data/swesmith-harness.tar.gz -C "$source" --strip-components=1
cp /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate25/requirements-extra.in "$receipt/requirements-extra.in"
"$uv" venv --python /usr/bin/python3 "$venv" > "$receipt/venv.stdout" 2> "$receipt/venv.stderr"
"$uv" pip compile "$source/pyproject.toml" "$receipt/requirements-extra.in" --extra validate --python "$venv/bin/python" --generate-hashes --output-file "$receipt/requirements.lock.txt" > "$receipt/resolve.stdout" 2> "$receipt/resolve.stderr"
"$uv" pip install --python "$venv/bin/python" --require-hashes -r "$receipt/requirements.lock.txt" > "$receipt/install.stdout" 2> "$receipt/install.stderr"
"$uv" pip install --python "$venv/bin/python" --no-deps -e "$source" > "$receipt/harness-install.stdout" 2> "$receipt/harness-install.stderr"
"$uv" pip freeze --python "$venv/bin/python" > "$receipt/installed.txt"
cd "$receipt"
"$venv/bin/python" -m swesmith.harness.eval --help > "$receipt/help.stdout" 2> "$receipt/help.stderr"
