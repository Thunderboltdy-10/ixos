"""Count usable issue-text inputs without emitting descriptions or references."""
from collections import Counter
import hashlib
import json
from pathlib import Path

import pyarrow.parquet as pq

base = Path(__file__).resolve().parent
root = base.parents[2]
inputs = json.loads((root / 'reports/restoration/gate25/synthetic-training-inputs.json').read_text())
counts = Counter({'usable_nonempty_utf8_le65536': 0, 'blank_or_missing': 0, 'oversized': 0, 'unexpected_type': 0})
for item in inputs['downloads']:
    path = root / '.tmp/gate25/data/swesmith-py' / Path(item['file']).name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256']
    for row in pq.read_table(path, columns=['problem_statement']).to_pylist():
        text = row['problem_statement']
        if text is None or (isinstance(text, str) and not text.strip()):
            counts['blank_or_missing'] += 1
        elif not isinstance(text, str):
            counts['unexpected_type'] += 1
        elif len(text.encode('utf-8')) > 65536:
            counts['oversized'] += 1
        else:
            counts['usable_nonempty_utf8_le65536'] += 1
assert sum(counts.values()) == inputs['rows']
result = {'rows': inputs['rows'], 'aggregate': dict(counts), 'problem_reference_content_emitted': False,
          'boundary': 'Input integrity, not quality-based selection. Empty selected S02 remains preserved; no claim all executable training tasks have usable retrieval prompts.'}
(base / 'query-availability.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
