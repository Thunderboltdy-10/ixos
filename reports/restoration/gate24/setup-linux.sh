#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
receipt="$root/gate24"
mkdir -p "$receipt" "$root/gate24-tools"
cp /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate24/data/runtime/uv "$root/gate24-tools/uv"
chmod u+x "$root/gate24-tools/uv"
if [ ! -d "$root/gate24-harness-source" ]; then
  cp -R /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate24/data/harness "$root/gate24-harness-source"
fi
uv="$root/gate24-tools/uv"
venv="$root/gate24-harness-venv"
"$uv" --version > "$receipt/uv-version.stdout"
"$uv" venv --allow-existing --python /usr/bin/python3 "$venv" > "$receipt/uv-venv.stdout" 2> "$receipt/uv-venv.stderr"
"$uv" pip compile "$root/gate24-harness-source/pyproject.toml" --python "$venv/bin/python" --generate-hashes --output-file "$receipt/requirements.lock.txt" > "$receipt/resolve.stdout" 2> "$receipt/resolve.stderr"
"$uv" pip install --python "$venv/bin/python" --require-hashes -r "$receipt/requirements.lock.txt" > "$receipt/install.stdout" 2> "$receipt/install.stderr"
"$uv" pip install --python "$venv/bin/python" --no-deps --editable "$root/gate24-harness-source" > "$receipt/harness-install.stdout" 2> "$receipt/harness-install.stderr"
"$uv" pip freeze --python "$venv/bin/python" > "$receipt/installed.txt"
"$venv/bin/python" -m swebench.harness.run_evaluation --help > "$receipt/harness-help.stdout" 2> "$receipt/harness-help.stderr"
