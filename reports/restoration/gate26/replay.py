"""Open-loop replay of observed calls, with explicit limits on causal claims."""
import argparse
import json
import os
from pathlib import Path
import sys
import tempfile
import threading

base = Path(__file__).resolve().parent
root = base.parents[2]
sys.path.insert(0, str(root))
import tiktoken
from eval.artifacts import artifact_identity
from scripts.qasper.cache_probe import state
from scripts.qasper.contract import sha
from scripts.qasper.runtime import Runtime

parser = argparse.ArgumentParser()
parser.add_argument('--binary', type=Path, required=True)
parser.add_argument('--model', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
assert not args.output.exists()
args.output.mkdir(parents=True)
encoding = tiktoken.get_encoding('cl100k_base')
tokens = lambda raw: len(encoding.encode(raw.decode('utf-8'), disallowed_special=()))
results = []
controls = {}
for case, folder in [('S01', 'S01-recovery'), ('S03', 'S03')]:
    actor = json.loads((base / folder / 'receipt.json').read_text(encoding='utf-8'))
    source = Path(actor['task']['root'])
    original = state(source)
    assert original == actor['sources']
    for arm in ('off', 'search-feedback', 'inspection-silence', 'inspection-feedback'):
        output = args.output / case / arm
        output.mkdir(parents=True)
        lock = threading.Lock()
        record = {'case': case, 'arm': arm, 'requests': [], 'wire_tokens': {},
                  'quality_scope': 'Same observed actor queries/inspections, not independent adaptive agents.'}
        with (output / 'wire.jsonl').open('w', encoding='utf-8', newline='\n') as wire, tempfile.TemporaryDirectory(prefix='ixos-open-loop-') as scratch:
            def sink(value):
                with lock:
                    wire.write(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')
                    wire.flush()
            policy = 'off' if arm == 'off' else 'combined'
            config = Path(scratch) / 'config.toml'
            config.write_text('[retrieval]\ncontext=2\nlimit=5\noutput_bytes=6000\ntypo_correction=false\npersist=true\n', encoding='utf-8')
            argv = [str(args.binary.resolve()), '--config', str(config), 'serve', '--dir', str(source),
                    '--profile', 'code', '--model-path', str(args.model.resolve()), '--representation', 'intro-uniform',
                    '--session', policy, '--evidence-policy', 'bounded-rerank', '--quiet-stats']
            record['argv'] = argv
            env = dict(os.environ)
            env.pop('IXOS_MODEL_PATH', None)
            response_values = []
            with Runtime(argv, env, sink, case) as engine:
                for observed in actor['calls']:
                    request = dict(observed['request'])
                    if arm in ('off', 'search-feedback'):
                        request.pop('remember', None)
                    if request.get('op') == 'search':
                        if arm in ('off', 'inspection-silence'):
                            request.pop('feedback', None)
                        elif arm == 'search-feedback' and 'feedback' in request:
                            # Only accept the matching file if THIS replay showed it.
                            first = response_values[0]
                            wanted = actor['submission']['citations'][0]['path']
                            indices = [i for i, row in enumerate(first.get('results', [])) if row['path'] == wanted]
                            request['feedback'] = {'query_id': first['id'], 'accepted': indices}
                    value, stdout, stderr, stats, wall, encoded = engine.call(request)
                    assert len(stdout) <= 6000
                    response_values.append(value)
                    record['requests'].append({'request': request, 'response': value, 'stdout_tokens': tokens(stdout),
                                               'diagnostic_tokens': tokens(stderr), 'request_tokens': tokens(encoded),
                                               'wall_ms': wall, 'stats': stats})
                    if request.get('op') in ('grep', 'read'):
                        stripped = dict(value)
                        stripped.pop('remembered', None)
                        key = (case, request['id'])
                        if arm == 'off':
                            controls[key] = stripped
                        else:
                            assert stripped == controls[key], 'Different inspection source view'
        assert state(source) == original
        packets = [json.loads(line) for line in (output / 'wire.jsonl').read_text(encoding='utf-8').splitlines()]
        record['wire_tokens'] = {kind: sum(tokens(packet['raw'].encode()) for packet in packets if packet['stream'] == kind)
                                 for kind in ('stdin', 'stdout', 'stderr')}
        record['source_preserved'] = True
        (output / 'receipt.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
        results.append(record)
receipt = {'binary_sha256': sha(args.binary.read_bytes()), 'model': artifact_identity(args.model),
           'helper_sha256': sha(Path(__file__).read_bytes()), 'runs': results,
           'boundary': 'Eight descriptive open-loop processes on two consumed synthetic development tasks. S03 has no follow-up search/feedback. No autonomous A/B, new independent sample, latency optimization, model/default selection or held-out claim.'}
(args.output / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'processes': len(results), 'requests': sum(len(row['requests']) for row in results), 'source_preserved': True}))
