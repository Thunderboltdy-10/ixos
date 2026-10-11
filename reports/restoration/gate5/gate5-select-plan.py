import hashlib
import json
from pathlib import Path
import re
import pyarrow.parquet as pq

rows = pq.read_table('.tmp/gate5/contextbench-verified-train.parquet', columns=[
    'instance_id', 'original_inst_id', 'repo', 'language', 'base_commit', 'source']).to_pylist()
repos = ['pytest-dev/pytest', 'cli', 'clap', 'gson', 'fmt', 'jq', 'coder/code-server', 'express']
selection = []
seed = 'ixos-contextbench-dev-v1/'
for repo in repos:
    matches = [r for r in rows if r['repo'] == repo]
    assert matches, repo
    row = min(matches, key=lambda r: hashlib.sha256((seed + r['instance_id']).encode()).hexdigest())
    match = re.fullmatch(r'([A-Za-z0-9_.-]+)__([A-Za-z0-9_.-]+)-[0-9]+', row['original_inst_id'])
    assert match, row['original_inst_id']
    selection.append({**row, 'repository': match.group(1) + '/' + match.group(2), 'split': 'dev'})
assert len({r['language'] for r in selection}) == 8
spec = {'schema': 1, 'dataset': 'Contextbench/ContextBench',
    'revision': 'c2855792b006af41c67202d33883fb9d46362853',
    'file': 'data/contextbench_verified_train.parquet',
    'sha256': 'cd1bc4ddefa69271d4f073f31d54bf33a1c5671800211d9db7e6a3c24435a75d',
    'bytes': 15081815, 'rows': 450,
    'selection_method': 'Eight explicitly selected distinct-language repositories; lowest SHA256(seed+instance_id) within each, from metadata columns only, before reading issues or gold. Seed=' + seed,
    'query_policy': 'Verbatim problem_statement only. No patch, test_patch, hints_text, f2p/p2p or gold used in query construction. Retrieval-only development diagnostic, not full agent task success or official leaderboard.',
    'instances': selection}
target = Path('eval/contextbench-dev-v1.json')
assert not target.exists()
target.write_text(json.dumps(spec, indent=2) + '\n')
print('Frozen metadata-only plan SHA256 ' + hashlib.sha256(target.read_bytes()).hexdigest())
print(json.dumps(selection, indent=2))
