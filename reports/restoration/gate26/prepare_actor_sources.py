"""Bind complete exported source bytes for the existing observed-only actor shell."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

base = Path(__file__).resolve().parent
root = base.parents[2]
sys.path.insert(0, str(root))
from scripts.code_tasks.prepare import archive_files
from scripts.qasper.contract import canonical

native = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
sha = lambda raw: hashlib.sha256(raw).hexdigest()
load = lambda path: json.loads(path.read_text(encoding='utf-8'))
input_path = root / '.tmp/gate26/actor-inputs.json'
binding = load(base / 'actor-inputs.json')
assert sha(input_path.read_bytes()) == binding['actor_input_sha256']
exports = load(native / 'gate26/exports/exports.json')
assert exports['actor_input_sha256'] == binding['actor_input_sha256']
assert exports['helper_sha256'] == sha((base / 'export_sources.py').read_bytes())
inputs = {row['id']: row for row in load(input_path)}
tasks = []
for record in exports['exports']:
    assert record['status'] == 'exported' and record['container_removed']
    task = inputs[record['case']]
    raw = (native / 'gate26/exports' / task['id'] / 'source.tar').read_bytes()
    assert sha(raw) == record['archive_sha256'] and len(raw) == record['archive_bytes']
    # Reuse the validated gzip-archive reader without changing the original tar.
    files, links = archive_files(gzip.compress(raw, mtime=0))
    corpus = root / '.tmp/gate26/sources' / task['id']
    assert not corpus.exists()
    corpus.mkdir(parents=True)
    assert all(not name.startswith('.git/') and name != '.git' for name in files)
    for name, content in files.items():
        path = corpus / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        assert path.read_bytes() == content
    inventory = {name: {'sha256': sha(content), 'bytes': len(content)} for name, content in sorted(files.items())}
    inventory_path = base / f'{task["id"]}-source-inventory.json'
    assert not inventory_path.exists()
    inventory_path.write_text(json.dumps(inventory, indent=2) + '\n', encoding='utf-8')
    tasks.append({**task, 'root': str(corpus.resolve()), 'inventory_path': str(inventory_path.resolve()),
                  'inventory_identity': canonical(inventory), 'source_commit': record['source_commit'],
                  'source_files': len(files), 'source_bytes': sum(map(len, files.values())),
                  'excluded_links': links, 'archive_sha256': record['archive_sha256']})
assert len(tasks) == 3
manifest = {'tasks': tasks, 'task_identity': canonical(tasks), 'synthetic': True,
            'references_loaded': False, 'validation_fields_loaded': False}
target = root / '.tmp/gate26/task-manifest.json'
assert not target.exists()
target.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
receipt = {'task_manifest_sha256': sha(target.read_bytes()), 'task_identity': manifest['task_identity'],
           'export_receipt_sha256': sha((native / 'gate26/exports/exports.json').read_bytes()),
           'tasks': [{key: task[key] for key in ('id', 'repo', 'instance_id', 'source_commit',
                    'inventory_identity', 'source_files', 'source_bytes', 'excluded_links', 'archive_sha256')}
                    for task in tasks], 'references_loaded': False, 'validation_fields_loaded': False,
           'boundary': 'Original tracked source bytes preserved except explicitly recorded links, no Git history. References/tests remain hidden; actor may submit a repair_patch alongside original diagnosis/citations, frozen before grading.'}
(base / 'preparation.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'prepared': receipt['tasks'], 'references_loaded': False}))
