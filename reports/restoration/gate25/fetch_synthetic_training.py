"""Pin training shard bytes and emit schema/availability, not task references."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import urllib.request

import pyarrow.parquet as pq

base = Path(__file__).resolve().parent
root = base.parents[2]
data_root = root / '.tmp/gate25/data/swesmith-py'
data_root.mkdir(parents=True, exist_ok=True)
protocol = json.loads((base / 'protocol.json').read_text())['new_source']
dataset, revision = protocol['dataset'], protocol['revision']
headers = {'User-Agent': 'Ixos-training-availability'}
url = f'https://huggingface.co/api/datasets/{dataset}/tree/{revision}/data?limit=100'
raw = urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60).read()
entries = json.loads(raw)
files = [row for row in entries if row['path'].endswith('.parquet')]
assert len(files) == 11 and all('/train-' in row['path'] for row in files)
fields = ('test_patch', 'FAIL_TO_PASS', 'PASS_TO_PASS', 'image', 'eval_script', 'log_parser', 'eval_type')
counts = Counter({name: 0 for name in fields})
rows = 0
downloads = []
schema = None
for item in sorted(files, key=lambda row: row['path']):
    target = data_root / Path(item['path']).name
    expected = item['lfs']['oid']
    download_url = f'https://huggingface.co/datasets/{dataset}/resolve/{revision}/{item["path"]}'
    if not target.exists():
        partial = target.with_suffix('.partial')
        with urllib.request.urlopen(urllib.request.Request(download_url, headers=headers), timeout=60) as response, partial.open('wb') as output:
            while block := response.read(1024 * 1024):
                output.write(block)
        assert partial.stat().st_size == item['size']
        assert hashlib.sha256(partial.read_bytes()).hexdigest() == expected
        partial.replace(target)
    assert target.stat().st_size == item['size']
    assert hashlib.sha256(target.read_bytes()).hexdigest() == expected
    current = pq.read_schema(target).names
    assert schema is None or current == schema
    schema = current
    selected = [name for name in fields if name in current]
    table = pq.read_table(target, columns=selected)
    rows += table.num_rows
    for row in table.to_pylist():
        for name in selected:
            value = row[name]
            if isinstance(value, str):
                value = value.strip()
                present = bool(value and value not in ('[]', '{}', 'null'))
            else:
                present = bool(value)
            counts[name] += int(present)
    downloads.append({'file': item['path'], 'sha256': expected, 'bytes': target.stat().st_size,
                      'rows': table.num_rows, 'url': download_url})
    print(json.dumps({'downloaded_shard': target.name, 'bytes': target.stat().st_size, 'rows': table.num_rows}), flush=True)
result = {'dataset': dataset, 'revision': revision, 'split': 'train', 'rows': rows,
          'schema': schema, 'rows_with_nonempty_fields': dict(counts), 'downloads': downloads,
          'tree_metadata_sha256': hashlib.sha256(raw).hexdigest(),
          'task_identities_problem_solution_emitted': False, 'test_split_downloaded': False,
          'boundary': 'Aggregate training availability only. Synthetic tasks, not human resolved-task quality or actor exposure.'}
(base / 'synthetic-training-inputs.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'rows': rows, 'rows_with_nonempty_fields': dict(counts)}))
