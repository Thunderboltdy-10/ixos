#!/usr/bin/env bash
set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
test -f "$IXOS_REVIEW_ROOT/source/target/release/ixos"
mkdir -p "$IXOS_REVIEW_ROOT/probes"
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
cd "$IXOS_REVIEW_ROOT/source"
cp /mnt/c/Users/pablo/Downloads/Ixos/scripts/verify_retrieval_engine.py scripts/verify_retrieval_engine.py
python3 - <<'PY' > "$IXOS_REVIEW_ROOT/receipts/model-verification.stdout"
import json
from pathlib import Path
from scripts.setup_models import verify
from eval.artifacts import artifact_identity
import os
root=Path(os.environ['IXOS_REVIEW_ROOT'])
for entry in json.loads(Path('config/retrieval-models.json').read_text())['models']:
    folder=root/'models'/entry['folder']
    verify(folder,entry['expected'])
    assert artifact_identity(folder)['fingerprint']==entry['fingerprint']
    print(entry['profile'],entry['fingerprint'])
PY
python3 scripts/verify_retrieval_engine.py --binary target/release/ixos --model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --output "$IXOS_REVIEW_ROOT/receipts/native-contract.json" > "$IXOS_REVIEW_ROOT/receipts/native.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/native.stderr"
python3 scripts/verify_restored_cli.py --binary target/release/ixos --code-model "$IXOS_REVIEW_ROOT/models/potion-code-16M-v2-unbounded" --documents-model "$IXOS_REVIEW_ROOT/models/potion-retrieval-32M-row-int8" --output "$IXOS_REVIEW_ROOT/receipts/profile-contract.json" > "$IXOS_REVIEW_ROOT/receipts/profiles.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/profiles.stderr"
cargo test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 > "$IXOS_REVIEW_ROOT/receipts/core-tests.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/core-tests.stderr"
python3 scripts/package_cli.py --binary target/release/ixos --output "$IXOS_REVIEW_ROOT/ixos-linux.tar.gz" > "$IXOS_REVIEW_ROOT/receipts/package.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/package.stderr"
mkdir "$IXOS_REVIEW_ROOT/package-review"
tar -xf "$IXOS_REVIEW_ROOT/ixos-linux.tar.gz" -C "$IXOS_REVIEW_ROOT/package-review"
"$IXOS_REVIEW_ROOT/package-review/ixos" search 'raw hash after edits' --dir src/retrieval --profile lexical --json > "$IXOS_REVIEW_ROOT/receipts/package-smoke.stdout" 2> "$IXOS_REVIEW_ROOT/receipts/package-smoke.stderr"
printf 'Linux native checks complete\n'
