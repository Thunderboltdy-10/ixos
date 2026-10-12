"""Read selected development problems; leave patches/tests/validation unopened."""
import hashlib
import json
from pathlib import Path

import pyarrow.parquet as pq

base = Path(__file__).resolve().parent
root = base.parents[2]
sha = lambda raw: hashlib.sha256(raw).hexdigest()
selection = json.loads((base / 'selection.json').read_text())
assert sha((base / 'protocol.json').read_bytes()) == selection['protocol_sha256']
inputs = json.loads((root / 'reports/restoration/gate25/synthetic-training-inputs.json').read_text())
assert sha((root / 'reports/restoration/gate25/synthetic-training-inputs.json').read_bytes()) == selection['input_receipt_sha256']
shards = {Path(row['file']).name: row for row in inputs['downloads']}
tasks = []
for meta in selection['selected']:
    if meta['role'] != 'development':
        continue
    path = root / '.tmp/gate25/data/swesmith-py' / meta['shard']
    assert sha(path.read_bytes()) == shards[meta['shard']]['sha256']
    columns = ['repo', 'instance_id', 'image_name', 'problem_statement']
    rows = pq.read_table(path, columns=columns, filters=[('instance_id', '=', meta['instance_id'])]).to_pylist()
    assert len(rows) == 1
    assert all(rows[0][key] == meta[key] for key in ('repo', 'instance_id', 'image_name'))
    tasks.append({**rows[0], 'id': meta['case'], 'canonical_repository': meta['canonical_repository']})
target = root / '.tmp/gate26/actor-inputs.json'
target.parent.mkdir(parents=True, exist_ok=True)
assert not target.exists()
target.write_text(json.dumps(tasks, indent=2) + '\n', encoding='utf-8')
result = {'selection_sha256': sha((base / 'selection.json').read_bytes()),
          'actor_input_sha256': sha(target.read_bytes()), 'cases': [row['id'] for row in tasks],
          'columns_loaded': columns, 'patch_test_validation_fields_loaded': False,
          'boundary': 'Selected dev problems materialized for later actor use; no solution/expected-test labels or validation problems opened.'}
(base / 'actor-inputs.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
