"""Sequential descriptive own-source inspection costs with frozen controls."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import statistics
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from eval.artifacts import artifact_identity
from scripts.qasper.runtime import Runtime


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def state(root):
    return {p.relative_to(root).as_posix(): [sha(p.read_bytes()), p.stat().st_mtime_ns]
            for p in sorted(root.rglob('*')) if p.is_file()}


p = argparse.ArgumentParser()
p.add_argument('--binary', type=Path, required=True)
p.add_argument('--control', type=Path, required=True)
p.add_argument('--source', type=Path, required=True)
p.add_argument('--code-model', type=Path, required=True)
p.add_argument('--documents-model', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--no-tokenizer', action='store_true')
a = p.parse_args()
assert not a.output.exists()
a.output.mkdir(parents=True)
before = state(a.source)
(a.output / 'source-state.json').write_text(json.dumps(before, indent=2) + '\n', encoding='utf-8')
tokenizer = None
if not a.no_tokenizer:
    import tiktoken
    tokenizer = tiktoken.get_encoding('cl100k_base')
count = lambda raw: len(tokenizer.encode(raw.decode('utf-8'), disallowed_special=())) if tokenizer else None
arms = ['control', 'default', 'silence', 'accepted']
env = dict(os.environ)
env.pop('IXOS_MODEL_PATH', None)
record = {'status': 'running', 'quality_benchmark': False, 'platform': sys.platform,
          'binary_sha256': sha(a.binary.read_bytes()), 'control_sha256': sha(a.control.read_bytes()),
          'helper_sha256': sha(Path(__file__).read_bytes()), 'runs': []}
for profile, model in [('code', a.code_model), ('documents', a.documents_model)]:
    for persist in (False, True):
        for run in range(7):
            for arm in arms[run % 4:] + arms[:run % 4]:
                folder = a.output / profile / ('native' if persist else 'jit') / arm / str(run)
                folder.mkdir(parents=True)
                config = folder / 'config.toml'
                config.write_text(f'[retrieval]\nlimit=5\ncontext=2\noutput_bytes=6000\nsession="feedback"\npersist={str(persist).lower()}\n', encoding='utf-8')
                argv = [str((a.control if arm == 'control' else a.binary).resolve()), '--config', str(config.resolve()),
                        'serve', '--dir', str(a.source.resolve()), '--profile', profile,
                        '--model-path', str(model.resolve()), '--quiet-stats']
                if not persist:
                    argv.append('--jit')
                wire = []
                results = []
                began = time.perf_counter()
                with Runtime(argv, env, wire.append, profile) as session:
                    query = 'cache source freshness validation'
                    values = [
                        {'op': 'search', 'id': 'seed', 'query': query, 'stats': True},
                        {'op': 'grep', 'id': 'inspect', 'pattern': 'doc.source_hash == view.source_hash',
                         'fixed': True, 'stats': True, **({'remember': True} if arm in ('silence', 'accepted') else {})},
                        {'op': 'search', 'id': 'follow', 'query': query, 'stats': True,
                         **({'feedback': {'query_id': 'inspect', 'accepted': [0]}} if arm == 'accepted' else {})},
                    ]
                    for request in values:
                        value, raw, diagnostic, stats, elapsed, encoded = session.call(request)
                        results.append({'value': value, 'stdout_tokens': count(raw), 'diagnostic_tokens': count(diagnostic),
                                        'request_tokens': count(encoded), 'wall_ms': elapsed, 'stats': stats})
                    assert results[1]['value']['results'][0]['path'] == 'retrieval/inspections.rs'
                    assert results[2]['stats']['feedbackConsumed'] == (arm == 'accepted')
                    if arm in ('silence', 'accepted'):
                        assert results[1]['value']['remembered'] == [0]
                        assert results[2]['stats']['inspection']['viewsEmbedded'] == int(arm == 'accepted')
                wall = (time.perf_counter() - began) * 1000
                for stream in ('stdin', 'stdout', 'stderr'):
                    (folder / (stream + '.jsonl')).write_bytes(''.join(item['raw'] for item in wire if item['stream'] == stream).encode())
                assert state(a.source) == before
                record['runs'].append({'profile': profile, 'persist': persist, 'arm': arm, 'run': run,
                    'warmup': run < 2, 'argv': argv, 'model': artifact_identity(model), 'process_wall_ms': wall,
                    'calls': results, 'ready_tokens': count(session.ready_raw), 'source_preserved': True})
                (a.output / 'receipt.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
summary = []
for profile in ('code', 'documents'):
    for persist in (False, True):
        for arm in arms:
            rows = [r for r in record['runs'] if r['profile'] == profile and r['persist'] == persist and r['arm'] == arm and not r['warmup']]
            summary.append({'profile': profile, 'persist': persist, 'arm': arm, 'samples': len(rows),
                'process_ms_median': statistics.median(r['process_wall_ms'] for r in rows),
                'grep_ms_median': statistics.median(r['calls'][1]['wall_ms'] for r in rows),
                'follow_ms_median': statistics.median(r['calls'][2]['wall_ms'] for r in rows),
                'inspection_embed_ms_median': statistics.median(r['calls'][2]['stats'].get('inspection', {}).get('embedMs', 0) for r in rows),
                'stdout_tokens': statistics.mean(sum(c['stdout_tokens'] for c in r['calls']) for r in rows) if tokenizer else None,
                'diagnostic_tokens': statistics.mean(r['ready_tokens'] + sum(c['diagnostic_tokens'] for c in r['calls']) for r in rows) if tokenizer else None,
                'request_tokens': statistics.mean(sum(c['request_tokens'] for c in r['calls']) for r in rows) if tokenizer else None,
                'initial_native_hits': [r['calls'][0]['stats']['nativeCacheHits'] for r in rows],
                'follow_memory_hits': [r['calls'][2]['stats']['memoryCacheHits'] for r in rows]})
record['status'] = 'passed'
record['summary'] = summary
(a.output / 'receipt.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
(a.output / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': 'passed', 'processes': len(record['runs']), 'quality_benchmark': False}))
