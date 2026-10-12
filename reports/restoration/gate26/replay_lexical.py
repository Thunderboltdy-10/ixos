"""Model-free fixed-call lexical control, not an independent adaptive actor."""
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
from scripts.qasper.cache_probe import state
from scripts.qasper.contract import sha
from scripts.qasper.runtime import Runtime

binary = root / 'target/release/ixos.exe'
output = base / 'replay-lexical'
assert not output.exists()
output.mkdir()
encoding = tiktoken.get_encoding('cl100k_base')
tokens = lambda raw: len(encoding.encode(raw.decode('utf-8'), disallowed_special=()))
runs = []
for case, folder in [('S01', 'S01-recovery'), ('S03', 'S03')]:
    actor = json.loads((base / folder / 'receipt.json').read_text(encoding='utf-8'))
    control = json.loads((base / 'replay' / case / 'off/receipt.json').read_text())
    source = Path(actor['task']['root'])
    before = state(source)
    assert before == actor['sources']
    case_output = output / case
    case_output.mkdir()
    lock = threading.Lock()
    record = {'case': case, 'arm': 'lexical-off', 'requests': [], 'wire_tokens': {}}
    with (case_output / 'wire.jsonl').open('w', encoding='utf-8', newline='\n') as wire, tempfile.TemporaryDirectory(prefix='ixos-lexical-control-') as scratch:
        def sink(value):
            with lock:
                wire.write(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')
                wire.flush()
        config = Path(scratch) / 'config.toml'
        config.write_text('[retrieval]\ncontext=2\nlimit=5\noutput_bytes=6000\ntypo_correction=false\npersist=true\n', encoding='utf-8')
        argv = [str(binary.resolve()), '--config', str(config), 'serve', '--dir', str(source),
                '--profile', 'lexical', '--session', 'off', '--evidence-policy', 'global-line', '--quiet-stats']
        record['argv'] = argv
        env = dict(os.environ)
        env.pop('IXOS_MODEL_PATH', None)
        with Runtime(argv, env, sink, case) as engine:
            for observed, hybrid in zip(actor['calls'], control['requests'], strict=True):
                request = dict(observed['request'])
                request.pop('remember', None)
                request.pop('feedback', None)
                value, stdout, stderr, stats, wall, encoded = engine.call(request)
                assert len(stdout) <= 6000
                if request['op'] in ('grep', 'read'):
                    assert value == hybrid['response'], 'Different inspection source view'
                record['requests'].append({'request': request, 'response': value,
                    'stdout_tokens': tokens(stdout), 'diagnostic_tokens': tokens(stderr),
                    'request_tokens': tokens(encoded), 'wall_ms': wall, 'stats': stats})
    assert state(source) == before
    packets = [json.loads(line) for line in (case_output / 'wire.jsonl').read_text(encoding='utf-8').splitlines()]
    record['wire_tokens'] = {kind: sum(tokens(p['raw'].encode()) for p in packets if p['stream'] == kind)
                             for kind in ('stdin', 'stdout', 'stderr')}
    record['source_preserved'] = True
    (case_output / 'receipt.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
    runs.append(record)
(output / 'receipt.json').write_text(json.dumps({'binary_sha256': sha(binary.read_bytes()),
    'helper_sha256': sha(Path(__file__).read_bytes()), 'runs': runs,
    'boundary': 'Two model-free lexical processes replay hybrid-observed calls after actor freeze. Identical explicit inspections, global-line previews; not a lexical agent or causal task-success comparison.'}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'processes': len(runs), 'requests': sum(len(r['requests']) for r in runs), 'source_preserved': True}))
