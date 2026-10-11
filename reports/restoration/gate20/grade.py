"""Check frozen diagnoses and later-revealed original patch locations."""
from collections import Counter
import json
from pathlib import Path
import sys
import tiktoken
import pyarrow.parquet as pq

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root))
from scripts.code_tasks.contract import citation_ranges, line_range
from scripts.code_tasks.patch_reference import old_changed_lines
from scripts.qasper.cache_probe import state
from scripts.qasper.contract import canonical, intersection, union, sha

base = Path(__file__).resolve().parent
manifest = json.loads((base / 'tasks.json').read_text())
freeze = json.loads((base / 'submission-freeze.json').read_text())
assert freeze['task_identity'] == manifest['task_identity'] == canonical(manifest['tasks'])
receipts = {}
for binding in freeze['submissions']:
    raw = (base / binding['id'] / 'receipt.json').read_bytes()
    assert sha(raw) == binding['receipt_sha256']
    data = json.loads(raw)
    assert canonical(data['submission']) == binding['submission_sha256']
    assert data['helper_sha256'] == sha((root / 'scripts/code_tasks/agent_shell.py').read_bytes())
    assert data['binary_sha256'] == sha((root / 'target/release/ixos.exe').read_bytes())
    receipts[binding['id']] = data
# Open reference columns only after all immutable submissions are checked.
source = Path(manifest['reference_input'])
assert sha(source.read_bytes()) == manifest['downloads'][0]['sha256']
table = pq.read_table(source, columns=['instance_id', 'patch', 'test_patch', 'FAIL_TO_PASS'])
wanted = {r['instance_id'] for r in manifest['tasks']}
refs = {row['instance_id']: row for row in table.to_pylist() if row['instance_id'] in wanted}
encoding = tiktoken.get_encoding('cl100k_base')
tokens = lambda raw: len(encoding.encode(raw, disallowed_special=()))
rows = []
for task in manifest['tasks']:
    data = receipts[task['id']]
    source_root = Path(task['root'])
    assert state(source_root) == data['sources'] and data['source_preserved']
    ref = refs[task['instance_id']]
    targets = old_changed_lines(ref['patch'], source_root)
    citations = citation_ranges(data['submission']['citations'], data['calls'], source_root)
    assert {k: [list(x) for x in v] for k, v in citations.items()} == data['submission']['source_ranges']
    initial = data['calls'][0]['exposed_ranges']
    observed = [r for call in data['calls'] for r in call['exposed_ranges']]
    cited = [[name, a, b] for name, ranges in citations.items() for a, b in ranges]
    def localization(ranges):
        paths = {path for path, _, _ in ranges}
        hits, total = 0, 0
        for name, lines in targets.items():
            intervals = union((a, b) for path, a, b in ranges if path == name)
            for line in lines:
                a, b, _ = line_range(source_root, name, line, line)
                hits += bool(intervals) and intersection(intervals, a, b) == b-a
                total += 1
        return {'changed_file_recall': len(paths & targets.keys()) / len(targets),
                'original_changed_or_insertion_anchor_line_recall': hits / total,
                'covered_lines': hits, 'reference_lines': total}
    wire = [json.loads(line) for line in (base / task['id'] / 'wire.jsonl').read_text(encoding='utf-8').splitlines()]
    assert [json.loads(r['raw']) for r in wire if r['stream'] == 'stdin'] == [c['request'] for c in data['calls']]
    assert sum(tokens(r['raw']) for r in wire if r['stream'] == 'stdout') == data['stdout_tokens']
    assert sum(tokens(r['raw']) for r in wire if r['stream'] == 'stderr') == data['diagnostic_tokens'] + data['ready_tokens']
    assert sum(tokens(r['raw']) for r in wire if r['stream'] == 'stdin') == data['request_tokens']
    rows.append({'case': task['id'], 'instance_id': task['instance_id'], 'repo': task['repo'],
                 'submission': data['submission'], 'reference_old_changed_lines': targets,
                 'reference_patch_sha256': sha(ref['patch'].encode()), 'test_patch_bytes': len(ref['test_patch'].encode()),
                 'fail_to_pass': ref['FAIL_TO_PASS'], 'localization': {label: localization(ranges)
                     for label, ranges in [('initial', initial), ('observed', observed), ('cited', cited)]},
                 'calls': len(data['calls']), 'call_types': dict(Counter(c['request']['op'] for c in data['calls'])),
                 'stdout_tokens': data['stdout_tokens'], 'diagnostic_tokens': data['diagnostic_tokens'],
                 'request_tokens': data['request_tokens'], 'ready_tokens': data['ready_tokens'],
                 'startup_ms': data['startup_ms'], 'request_wall_ms': sum(c['wall_ms'] for c in data['calls'])})
result = {'status': 'passed', 'rows': rows, 'total_calls': sum(r['calls'] for r in rows),
          'stdout_tokens': sum(r['stdout_tokens'] for r in rows),
          'diagnostic_tokens': sum(r['diagnostic_tokens'] for r in rows),
          'request_tokens': sum(r['request_tokens'] for r in rows),
          'boundary': 'Three training issue diagnoses; all lack supplied test patches. Localization is not resolution or independent factual grading. Insertion anchors use the next original line, previous at EOF. No thresholds/defaults selected.'}
(base / 'analysis.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: v for k, v in result.items() if k != 'rows'}, indent=2))
for row in rows:
    print(row['case'], row['localization'], row['call_types'])
