"""Use official task containers to export tracked buggy code without Git history."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

from swesmith.profiles import registry

task_input = Path(sys.argv[1])
output = Path(sys.argv[2])
assert not output.exists(), 'Use a fresh export receipt directory'
output.mkdir(parents=True)
sha = lambda raw: hashlib.sha256(raw).hexdigest()
results = []
try:
    for task in json.loads(task_input.read_text()):
        assert re.fullmatch(r'[A-Za-z0-9_.-]+', task['instance_id'])
        case = output / task['id']
        case.mkdir()
        profile = registry.get_from_inst(task)
        assert profile.image_name == task['image_name']
        container = None
        record = {'case': task['id'], 'instance_id': task['instance_id'], 'status': 'started'}
        results.append(record)
        try:
            container = profile.get_container(task)
            inspected = container.attrs
            image_raw = subprocess.check_output(['docker', 'image', 'inspect', task['image_name']])
            image = json.loads(image_raw)[0]
            assert image['Id'] == inspected['Image']
            record['image_id'] = image['Id']
            record['repo_digests'] = image['RepoDigests']
            record['image_bytes'] = image['Size']
            commit = container.exec_run('git rev-parse HEAD', workdir='/testbed')
            assert commit.exit_code == 0
            record['source_commit'] = commit.output.decode().strip()
            status = container.exec_run('git status --porcelain --untracked-files=no', workdir='/testbed')
            assert status.exit_code == 0 and not status.output.strip()
            archive = container.exec_run('git archive --prefix=source/ HEAD', workdir='/testbed')
            assert archive.exit_code == 0 and len(archive.output) <= 512 * 1024 * 1024
            target = case / 'source.tar'
            target.write_bytes(archive.output)
            record.update({'status': 'exported', 'archive_sha256': sha(archive.output),
                           'archive_bytes': len(archive.output), 'original_tracked_source_clean': True})
        finally:
            if container is not None:
                container.remove(force=True)
                record['container_removed'] = True
        print(json.dumps(record), flush=True)
finally:
    receipt = {'actor_input_sha256': sha(task_input.read_bytes()), 'exports': results,
               'helper_sha256': sha(Path(__file__).read_bytes()), 'reference_fields_loaded': False,
               'boundary': 'Complete tracked task-branch source archives, no Git history, reference patch or expected-test labels. Preserve every export failure; actor validation problems remain unopened.'}
    (output / 'exports.json').write_text(json.dumps(receipt, indent=2) + '\n')
