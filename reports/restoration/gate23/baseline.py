"""Observe current inspection-feedback boundary with actual selected models."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from eval.artifacts import artifact_identity

p = argparse.ArgumentParser()
p.add_argument('--binary', type=Path, required=True)
p.add_argument('--code-model', type=Path, required=True)
p.add_argument('--documents-model', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
assert not a.output.exists()
a.output.mkdir(parents=True)
rows = []
with tempfile.TemporaryDirectory(prefix='ixos-inspection-before-') as folder:
    base = Path(folder)
    root = base / 'sources'
    root.mkdir()
    for name in ('a', 'b', 'c'):
        (root / f'cache_{name}.rs').write_bytes(
            f'fn refresh_{name}() {{}}\nCache freshness validates source bytes.\n'.encode())
    (root / '.gitignore').write_bytes(b'ignored.txt\n')
    (root / 'ignored.txt').write_bytes(b'Cache freshness ignored')
    state = lambda: {x.name: [hashlib.sha256(x.read_bytes()).hexdigest(), x.stat().st_mtime_ns]
                     for x in root.iterdir() if x.is_file()}
    before = state()
    config = base / 'config.toml'
    config.write_bytes(b'[retrieval]\nlimit=5\ncontext=2\noutput_bytes=6000\nsession="feedback"\npersist=false\n')
    requests = [
        {'op': 'search', 'id': 'seed', 'query': 'cache freshness'},
        {'op': 'read', 'id': 'read', 'path': 'cache_a.rs', 'start': 1, 'lines': 2},
        {'op': 'search', 'id': 'after-read', 'query': 'cache freshness', 'stats': True,
         'feedback': {'query_id': 'read', 'accepted': [0]}},
        {'op': 'grep', 'id': 'grep', 'pattern': 'freshness', 'stats': True},
        {'op': 'search', 'id': 'after-grep', 'query': 'cache freshness', 'stats': True,
         'feedback': {'query_id': 'grep', 'accepted': [0]}}
    ]
    encoded = b''.join((json.dumps(r, separators=(',', ':')) + '\n').encode() for r in requests)
    env = dict(os.environ)
    env.pop('IXOS_MODEL_PATH', None)
    for profile, model in [('code', a.code_model), ('documents', a.documents_model)]:
        argv = [str(a.binary.resolve()), '--config', str(config), 'serve', '--dir', str(root),
                '--profile', profile, '--model-path', str(model.resolve()), '--jit', '--quiet-stats']
        process = subprocess.run(argv, input=encoded, capture_output=True, timeout=60, env=env)
        out = a.output / profile
        out.mkdir()
        (out / 'requests.jsonl').write_bytes(encoded)
        (out / 'stdout.jsonl').write_bytes(process.stdout)
        (out / 'stderr.jsonl').write_bytes(process.stderr)
        values = [json.loads(r) for r in process.stdout.splitlines()]
        stats = {r['id']: r['diagnostics'] for r in map(json.loads, process.stderr.splitlines()) if r.get('type') == 'stats'}
        assert process.returncode == 0 and len(values) == 5
        assert not stats['after-read']['feedbackConsumed'] and not stats['after-grep']['feedbackConsumed']
        assert stats['after-read']['sessionEntries'] == 2 and stats['after-grep']['sessionEntries'] == 3
        assert state() == before
        rows.append({'profile': profile, 'model': artifact_identity(model), 'argv': argv,
                     'stats': stats, 'source_preserved': True})
record = {'binary_sha256': hashlib.sha256(a.binary.read_bytes()).hexdigest(),
          'helper_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'status': 'reproduced', 'quality_benchmark': False, 'cases': rows}
(a.output / 'receipt.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print('Both actual parents: read/grep feedback ignored; sources preserved')
