#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
receipt="$root/gate25"
work="$root/gate25-smoke"
venv="$root/gate25-harness-venv"
mkdir -p "$work"
cp /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate25/data/control.json "$work/control.json"
image=$("$venv/bin/python" -c 'import json,sys; print(json.load(open(sys.argv[1]))[0]["image_name"])' "$work/control.json")
docker pull "$image" > "$receipt/image-pull.stdout" 2> "$receipt/image-pull.stderr"
docker image inspect "$image" --format '{"id":{{json .Id}},"digests":{{json .RepoDigests}},"bytes":{{.Size}},"architecture":{{json .Architecture}},"os":{{json .Os}}}' > "$receipt/image-before.json"
"$venv/bin/python" - "$work" "$receipt" <<'PY'
import hashlib,json,sys
from pathlib import Path
work,receipt=map(Path,sys.argv[1:])
data=json.loads((work/'control.json').read_text())
image=json.loads((receipt/'image-before.json').read_text())
assert image['architecture']=='amd64' and image['os']=='linux' and image['digests']
patch='diff --git a/ixos_harness_control.txt b/ixos_harness_control.txt\nnew file mode 100644\n--- /dev/null\n+++ b/ixos_harness_control.txt\n@@ -0,0 +1 @@\n+Excluded synthetic harness base control; no source behavior change.\n'
base={'instance_id':data[0]['instance_id'],'model_name_or_path':'ixos-harness-base-control','model_patch':patch}
(work/'base.jsonl').write_text(json.dumps(base)+'\n')
record={'input_sha256':hashlib.sha256((work/'control.json').read_bytes()).hexdigest(),'instance_id':data[0]['instance_id'],'image':image,'marker_sha256':hashlib.sha256(patch.encode()).hexdigest(),'actor_task':False,'boundary':'Official SWE-smith runner/profile, immutable image contents verified before/after while profile uses its normal local tag. Gold reverses original corruption patch, not an Ixos-generated fix.'}
(receipt/'smoke-inputs.json').write_text(json.dumps(record,indent=2)+'\n')
PY
cd "$work"
"$venv/bin/python" -m swesmith.harness.eval --dataset_path "$work/control.json" --predictions_path "$work/base.jsonl" --workers 1 --run_id ixos-g25-base-20261012-v1 > "$receipt/base.stdout" 2> "$receipt/base.stderr"
"$venv/bin/python" -m swesmith.harness.eval --dataset_path "$work/control.json" --predictions_path gold --workers 1 --run_id ixos-g25-gold-20261012-v1 > "$receipt/gold.stdout" 2> "$receipt/gold.stderr"
docker image inspect "$image" --format '{"id":{{json .Id}},"digests":{{json .RepoDigests}},"bytes":{{.Size}},"architecture":{{json .Architecture}},"os":{{json .Os}}}' > "$receipt/image-after.json"
cmp "$receipt/image-before.json" "$receipt/image-after.json"
