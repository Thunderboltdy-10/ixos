"""Prospective metadata-only task selection; references loaded for excluded control only."""
import argparse
import hashlib
import json
from pathlib import Path
import pyarrow.parquet as pq


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


p = argparse.ArgumentParser()
p.add_argument('--data', type=Path, required=True)
p.add_argument('--inputs', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
assert not a.output.exists()
inputs = json.loads(a.inputs.read_text())
assert inputs['split'] == 'dev' and not inputs['official_test_downloaded']
data = a.data / 'dev.parquet'
assert sha(data.read_bytes()) == inputs['downloads'][0]['sha256']
rows = pq.read_table(data, columns=['repo', 'instance_id', 'base_commit']).to_pylist()
excluded = {repo for group in inputs['prospective_exclusions'].values() for repo in group}
repos = sorted({r['repo'] for r in rows} - excluded, key=lambda x: sha(x.encode()))[:3]
selected = [min([r for r in rows if r['repo'] == repo], key=lambda x: sha(x['instance_id'].encode())) for repo in repos]
control = min([r for r in rows if r['repo'] == 'sympy/sympy'], key=lambda x: sha(x['instance_id'].encode()))
assert control['repo'] in excluded and all(r['repo'] not in excluded for r in selected)
# Only the excluded control's reference/test content is materialized. The later
# actor tasks' problem/hint/patch/test fields are not loaded by this selection.
table = pq.read_table(data, filters=[('instance_id', '=', control['instance_id'])])
assert table.num_rows == 1
control_row = table.to_pylist()[0]
assert control_row['test_patch'] and json.loads(control_row['FAIL_TO_PASS'])
(a.data / 'control.json').write_text(json.dumps([control_row], indent=2) + '\n', encoding='utf-8')
result = {'dataset_sha256': sha(data.read_bytes()), 'split': 'dev', 'rows': len(rows),
          'excluded_repositories': sorted(excluded), 'candidate_metadata': selected,
          'control_metadata': control, 'control_reference_loaded': True,
          'candidate_problem_reference_test_content_loaded': False,
          'control_input_sha256': sha((a.data / 'control.json').read_bytes()),
          'selection_rule': 'First3eligible repositories by SHA256 name; first instance per repository by SHA256 ID. No task difficulty/solution inspection.'}
a.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2))
