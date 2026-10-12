#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
receipt="$root/gate24"
work="$root/gate24-smoke"
venv="$root/gate24-harness-venv"
mkdir -p "$work"
cp /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate24/data/control-v5.json "$work/control-v5.json"
image=$("$venv/bin/python" -c 'import json,sys; print(json.load(open(sys.argv[1]))[0]["image"])' "$work/control-v5.json")
docker pull "$image" > "$receipt/image-pull.stdout" 2> "$receipt/image-pull.stderr"
docker image inspect "$image" --format '{"id":{{json .Id}},"digests":{{json .RepoDigests}},"bytes":{{.Size}},"architecture":{{json .Architecture}},"os":{{json .Os}}}' > "$receipt/image.json"
"$venv/bin/python" - "$work" "$receipt" <<'PY'
import hashlib,json,sys
from pathlib import Path
work,receipt=map(Path,sys.argv[1:])
data=json.loads((work/'control-v5.json').read_text())
image=json.loads((receipt/'image.json').read_text())
assert image['digests'] and image['architecture']=='amd64' and image['os']=='linux'
data[0]['image']=image['digests'][0]
target=work/'control-v5-pinned.json'
target.write_text(json.dumps(data,indent=2)+'\n')
patch='diff --git a/ixos_harness_control.txt b/ixos_harness_control.txt\nnew file mode 100644\n--- /dev/null\n+++ b/ixos_harness_control.txt\n@@ -0,0 +1 @@\n+Excluded harness base control; no source behavior change.\n'
base={'instance_id':data[0]['instance_id'],'model_name_or_path':'ixos-harness-base-control','model_patch':patch}
(work/'base.jsonl').write_text(json.dumps(base)+'\n')
record={'control_input_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'instance_id':data[0]['instance_id'],'image_digest':image['digests'][0],'base_patch_sha256':hashlib.sha256(patch.encode()).hexdigest(),'actor_task':False,'boundary':'Nonempty harmless marker lets official harness test unpatched behavior; gold is original excluded reference, not an Ixos-generated patch.'}
(receipt/'smoke-inputs.json').write_text(json.dumps(record,indent=2)+'\n')
PY
cd "$work"
"$venv/bin/python" -m swebench.harness.run_evaluation --dataset_name "$work/control-v5-pinned.json" --split dev --predictions_path "$work/base.jsonl" --max_workers 1 --run_id ixos-g24-base-20261012-v1 --timeout 1200 > "$receipt/base.stdout" 2> "$receipt/base.stderr"
"$venv/bin/python" -m swebench.harness.run_evaluation --dataset_name "$work/control-v5-pinned.json" --split dev --predictions_path gold --max_workers 1 --run_id ixos-g24-gold-20261012-v1 --timeout 1200 > "$receipt/gold.stdout" 2> "$receipt/gold.stderr"
