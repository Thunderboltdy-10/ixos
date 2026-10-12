"""Check canonical v5 schema with the already excluded control only."""
import json
from pathlib import Path
import sys
import pyarrow.parquet as pq

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from scripts.code_tasks.prepare import download, sha

root = Path(__file__).resolve().parents[3]
base = Path(__file__).resolve().parent
data = root / '.tmp/gate24/data'
metadata = json.loads((base / 'upstream-metadata.json').read_text())
source = next(r for r in metadata['datasets'] if r['dataset'] == 'SWE-bench/SWE-bench')
download_record = download(f'https://huggingface.co/datasets/{source["dataset"]}/resolve/{source["sha"]}/data/dev-00000-of-00001.parquet', data / 'canonical-dev.parquet')
columns = pq.ParquetFile(data / 'canonical-dev.parquet').schema_arrow.names
assert all(name in columns for name in ('image', 'eval_script', 'log_parser', 'eval_type'))
original = json.loads((data / 'control.json').read_text())[0]
row = pq.read_table(data / 'canonical-dev.parquet', filters=[('instance_id', '=', original['instance_id'])]).to_pylist()
assert len(row) == 1
row = row[0]
for name in ('instance_id', 'repo', 'base_commit', 'patch', 'test_patch', 'problem_statement'):
    assert row[name] == original[name], name
assert row['repo'] in json.loads((base / 'selection.json').read_text())['excluded_repositories']
(data / 'control-v5.json').write_text(json.dumps([row], indent=2) + '\n', encoding='utf-8')
result = {'dataset': source['dataset'], 'revision': source['sha'], 'split': 'dev',
    'download': download_record, 'columns': columns, 'control_id': row['instance_id'],
    'control_image': row['image'], 'control_input_sha256': sha((data / 'control-v5.json').read_bytes()),
    'same_original_problem_reference_source': True, 'task_source_base_commit': row['base_commit'],
    'new_actor_references_loaded': False, 'official_test_downloaded': False,
    'boundary': 'Only an already excluded control is materialized. The updated canonical dataset matches the v5 harness schema; original source/problem/reference bytes verified.'}
(base / 'canonical-control.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: result[k] for k in ('dataset', 'revision', 'control_id', 'control_image', 'same_original_problem_reference_source')}, indent=2))
