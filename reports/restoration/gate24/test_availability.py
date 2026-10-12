"""Aggregate only executable-test metadata; never emit task or test identities."""
import argparse
import hashlib
import json
from pathlib import Path
import pyarrow.parquet as pq

p = argparse.ArgumentParser()
p.add_argument('--data', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
assert not a.output.exists()
columns = pq.ParquetFile(a.data).schema_arrow.names
wanted = [c for c in ('test_patch', 'FAIL_TO_PASS', 'PASS_TO_PASS') if c in columns]
table = pq.read_table(a.data, columns=wanted)
counts = {}
for name in wanted:
    values = table[name].to_pylist()
    if name == 'test_patch':
        counts[name] = sum(bool(v and v.strip()) for v in values)
    else:
        counts[name] = sum(bool(json.loads(v)) if isinstance(v, str) else bool(v) for v in values)
record = {'file_sha256': hashlib.sha256(a.data.read_bytes()).hexdigest(),
          'rows': table.num_rows, 'available_test_columns': wanted,
          'rows_with_nonempty': counts, 'reference_content_emitted': False,
          'task_identities_loaded': False,
          'boundary': 'Aggregate availability only; no patch solution/hints/source/test names are output or assigned to actor tasks.'}
a.output.write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print(json.dumps(record, indent=2))
