"""Open references only after exact actor submissions/failures are frozen."""
import hashlib
import json
from pathlib import Path

import pyarrow.parquet as pq

base = Path(__file__).resolve().parent
root = base.parents[2]
sha = lambda raw: hashlib.sha256(raw).hexdigest()
load = lambda path: json.loads(path.read_text(encoding='utf-8'))
frozen = load(base / 'freeze.json')
assert sha((base / 'protocol.json').read_bytes()) == frozen['protocol_sha256']
assert sha((base / 'selection.json').read_bytes()) == frozen['selection_sha256']
assert sha((base / 'S03-format-amendment.json').read_bytes()) == frozen['amendment_sha256']
for session in frozen['sessions']:
    assert sha((base / session['folder'] / 'receipt.json').read_bytes()) == session['receipt_sha256']
    assert sha((base / session['folder'] / 'wire.jsonl').read_bytes()) == session['wire_sha256']
metadata = {row['instance_id']: row for row in load(base / 'selection.json')['selected']}
input_receipt = load(root / 'reports/restoration/gate25/synthetic-training-inputs.json')
shards = {Path(item['file']).name: item for item in input_receipt['downloads']}
dataset, predictions = [], []
for case in frozen['cases']:
    row = metadata[case['instance_id']]
    assert row['role'] == 'development'
    path = root / '.tmp/gate25/data/swesmith-py' / row['shard']
    assert sha(path.read_bytes()) == shards[row['shard']]['sha256']
    # This is the first stage permitted to load complete reference/test fields.
    records = pq.read_table(path, filters=[('instance_id', '=', case['instance_id'])]).to_pylist()
    assert len(records) == 1
    dataset.append(records[0])
    assert sha(case['repair_patch'].encode()) == case['patch_sha256']
    predictions.append({'instance_id': case['instance_id'], 'model_name_or_path': 'ixos-assisted-codex-pilot',
                        'model_patch': case['repair_patch']})
data = root / '.tmp/gate26/grading'
assert not data.exists()
data.mkdir()
for name, value in [('instances.json', dataset), ('predictions.json', predictions)]:
    (data / name).write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
result = {'freeze_sha256': sha((base / 'freeze.json').read_bytes()),
          'instances_sha256': sha((data / 'instances.json').read_bytes()),
          'predictions_sha256': sha((data / 'predictions.json').read_bytes()),
          'cases': [row['case'] for row in frozen['cases']], 'references_opened_after_freeze': True,
          'validation_references_loaded': False, 'unusable_s02_not_scored': True,
          'boundary': 'Actual frozen source-only repair proposals; single actor synthetic exploratory pilot, no independent A/B or official human score.'}
(base / 'grading-inputs.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
