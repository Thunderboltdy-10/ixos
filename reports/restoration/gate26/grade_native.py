"""Run official baseline/gold/actor tests on source-verified public mirrors."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

from swesmith.harness.eval import main
from swesmith.profiles import registry

work = Path(sys.argv[1])
receipt = Path(sys.argv[2])
data = json.loads((work / 'instances.json').read_text())
exports = json.loads((work / 'exports.json').read_text())
by_id = {row['instance_id']: row for row in exports['exports']}
preflight = []
for task in data:
    profile = registry.get_from_inst(task)
    assert task['repo'].startswith('swesmith/')
    # Use official public-mirror detection before invoking any private-repo path.
    assert profile._is_repo_private() is False, 'Expected public benchmark mirror is unavailable'
    container = profile.get_container(task)
    try:
        commit = container.exec_run('git rev-parse HEAD', workdir='/testbed')
        assert commit.exit_code == 0
        source_commit = commit.output.decode().strip()
        assert source_commit == by_id[task['instance_id']]['source_commit']
        assert container.attrs['Image'] == by_id[task['instance_id']]['image_id']
        preflight.append({'instance_id': task['instance_id'], 'source_commit': source_commit,
                          'image_id': container.attrs['Image'], 'public_mirror': True})
    finally:
        container.remove(force=True)
(receipt / 'preflight.json').write_text(json.dumps(preflight, indent=2) + '\n')
marker='diff --git a/ixos_harness_control.txt b/ixos_harness_control.txt\nnew file mode 100644\n--- /dev/null\n+++ b/ixos_harness_control.txt\n@@ -0,0 +1 @@\n+Frozen benchmark base control; no source behavior change.\n'
base = [{'instance_id': task['instance_id'], 'model_name_or_path': 'ixos-harness-base-control',
         'model_patch': marker} for task in data]
(work / 'base.jsonl').write_text(''.join(json.dumps(row) + '\n' for row in base))
actor = json.loads((work / 'predictions.json').read_text())
(work / 'predictions.jsonl').write_text(''.join(json.dumps(row) + '\n' for row in actor))
for arm, predictions in [('base', str(work / 'base.jsonl')), ('gold', 'gold'),
                         ('actor', str(work / 'predictions.jsonl'))]:
    main(run_id=f'ixos-g26-{arm}-20261012-v2', workers=1, dataset_path=str(work / 'instances.json'),
         predictions_path=predictions)
    print(json.dumps({'completed_arm': arm}), flush=True)
after = []
for task in data:
    image = json.loads(subprocess.check_output(['docker', 'image', 'inspect', task['image_name']]))[0]
    assert image['Id'] == by_id[task['instance_id']]['image_id']
    after.append({'instance_id': task['instance_id'], 'id': image['Id'], 'digests': image['RepoDigests']})
(receipt / 'images-after.json').write_text(json.dumps(after, indent=2) + '\n')
(receipt / 'grading-source.json').write_text(json.dumps({'helper_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'boundary': 'Upstream main runner and normal profiles. Public-mirror/source/image preflight, baseline/gold controls and actual frozen actor patches. No source corpus edits.'}, indent=2) + '\n')
