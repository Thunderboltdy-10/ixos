"""Materialize only a prospectively excluded family for environment controls."""
import hashlib
import json
from pathlib import Path

import pyarrow.parquet as pq

base = Path(__file__).resolve().parent
root = base.parents[2]
inputs = json.loads((base / 'synthetic-training-inputs.json').read_text())
data = root / '.tmp/gate25/data'
metadata = []
for item in inputs['downloads']:
    path = data / 'swesmith-py' / Path(item['file']).name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256']
    for row in pq.read_table(path, columns=['repo', 'instance_id', 'image_name']).to_pylist():
        if row['repo'].split('/')[-1].startswith('oauthlib__oauthlib.'):
            metadata.append({**row, 'shard': path.name})
assert metadata, 'Excluded OAuthlib control family absent; no alternative reference opened'
selected = min(metadata, key=lambda row: hashlib.sha256(row['instance_id'].encode()).hexdigest())
table = pq.read_table(data / 'swesmith-py' / selected['shard'], filters=[('instance_id', '=', selected['instance_id'])])
rows = table.to_pylist()
assert len(rows) == 1
target = data / 'control.json'
target.write_text(json.dumps(rows, indent=2) + '\n', encoding='utf-8')
result = {'control_metadata': selected, 'input_sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
          'selection': 'First excluded OAuthlib instance by SHA256 ID across all11pinned training shards.',
          'excluded_control_candidates': len(metadata), 'new_actor_problem_reference_emitted': False,
          'boundary': 'Synthetic corruption patch and tests materialized only for an already excluded environment control; no actor tasks selected.'}
(base / 'control-selection.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
