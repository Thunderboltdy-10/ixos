"""Verify frozen submissions against original actor/wire/source identities."""
import json
from pathlib import Path
import sys
import tiktoken

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root))
from scripts.qasper.contract import sha, canonical
from scripts.qasper.cache_probe import state

base = Path(__file__).resolve().parent
manifest = json.loads((base / 'tasks.json').read_text())
freeze = json.loads((base / 'submission-freeze.json').read_text())
encoding = tiktoken.get_encoding('cl100k_base')
tokens = lambda text: len(encoding.encode(text, disallowed_special=()))
rows = []
for task, binding in zip(manifest['tasks'], freeze['submissions'], strict=True):
    folder = base / task['id']
    raw = (folder / 'receipt.json').read_bytes()
    data = json.loads(raw)
    assert task['id'] == binding['id']
    assert sha(raw) == binding['receipt_sha256']
    assert canonical(data['submission']) == binding['submission_sha256']
    assert data['helper_sha256'] == sha((root / 'scripts/qasper/agent_shell.py').read_bytes())
    assert data['binary_sha256'] == sha((root / 'target/release/ixos.exe').read_bytes())
    assert data['source_preserved'] and state(Path(task['root'])) == data['sources']
    wire = [json.loads(line) for line in (folder / 'wire.jsonl').read_text(encoding='utf-8').splitlines()]
    requests = [json.loads(line['raw']) for line in wire if line['stream'] == 'stdin']
    assert requests == [call['request'] for call in data['calls']]
    stdout = sum(tokens(line['raw']) for line in wire if line['stream'] == 'stdout')
    stderr = sum(tokens(line['raw']) for line in wire if line['stream'] == 'stderr')
    stdin = sum(tokens(line['raw']) for line in wire if line['stream'] == 'stdin')
    assert stdout == data['stdout_tokens']
    assert stderr == data['diagnostic_tokens'] + data['ready_tokens']
    assert stdin == data['request_tokens']
    rows.append({'id': task['id'], 'wire_requests': len(requests), 'stdout_tokens': stdout,
                 'diagnostic_tokens': data['diagnostic_tokens'], 'request_tokens': stdin})
evaluator = canonical({p.relative_to(root).as_posix(): sha(p.read_bytes())
                       for p in sorted((root / 'eval').glob('*.py'))})
assert evaluator == '95afba09dd7c77e0fc56ed4e922d508116f701bb679f52c0844ed7725fc14297'
(base / 'audit.json').write_text(json.dumps({'status': 'passed', 'rows': rows,
    'frozen_evaluator_sha256': evaluator}, indent=2) + '\n', encoding='utf-8')
print('Six immutable submissions, original actor/binary, wire tokens, sources and frozen evaluator passed')
