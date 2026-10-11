"""Exact grep compatibility/cap/budget proof and descriptive paired process cost."""
import argparse
from collections import Counter
import json
import os
from pathlib import Path
import statistics
import subprocess
import sys
import tempfile
import time

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root))
from scripts.qasper.cache_probe import state
from scripts.qasper.contract import sha
from scripts.code_tasks.contract import exposed

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--binary', type=Path, required=True)
parser.add_argument('--control', type=Path, required=True)
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--no-tokenizer', action='store_true', help='Record raw bytes; score token counts separately from preserved wire files')
args = parser.parse_args()
assert not args.output.exists(), 'Use a new result directory'
args.output.mkdir(parents=True)
config = args.output.resolve() / 'isolated-config.toml'
config.write_text('', encoding='utf-8')  # Explicit defaults, outside searched roots.
before = state(args.source)
if args.no_tokenizer:
    tokens = lambda data: None
else:
    import tiktoken
    enc = tiktoken.get_encoding('cl100k_base')
    tokens = lambda data: len(enc.encode(data.decode(), disallowed_special=()))
environment = dict(os.environ)
environment.pop('IXOS_MODEL_PATH', None)
cases = []
for repetition in range(7):
    arms = [('control', args.control, None), ('default', args.binary, None),
            ('cap1', args.binary, 1), ('cap2', args.binary, 2)]
    if repetition % 2:
        arms.reverse()
    for label, binary, cap in arms:
        argv = [str(binary.resolve()), '--config', str(config), '-v', 'grep', 'tty|attach_socket', '--dir', str(args.source.resolve()),
                '-C', '2', '--limit', '5', '--max-output-bytes', '6000']
        if cap is not None:
            argv.extend(['--max-matches-per-file', str(cap)])
        began = time.perf_counter()
        process = subprocess.run(argv, env=environment, capture_output=True, timeout=30)
        wall = (time.perf_counter() - began) * 1000
        assert process.returncode == 0, process.stderr
        name = f'{repetition}-{label}'
        (args.output / (name + '.stdout')).write_bytes(process.stdout)
        (args.output / (name + '.stderr')).write_bytes(process.stderr)
        value, stats = json.loads(process.stdout), json.loads(process.stderr.splitlines()[-1])
        exposed(value, args.source)
        assert len(process.stdout) <= 6000 and stats['matchingLines'] == 19 and not stats['modelLoaded']
        cases.append({'arm': label, 'repetition': repetition, 'argv': argv, 'wall_ms': wall,
                      'stdout_sha256': sha(process.stdout), 'stdout_tokens': tokens(process.stdout),
                      'diagnostic_tokens': tokens(process.stderr), 'output_bytes': len(process.stdout),
                      'distinct_files': len({r['path'] for r in value['results']}), 'paths': [r['path'] for r in value['results']],
                      'stats': stats})
by_arm = {label: [row for row in cases if row['arm'] == label] for label in ('control', 'default', 'cap1', 'cap2')}
assert {r['stdout_sha256'] for r in by_arm['control']} == {r['stdout_sha256'] for r in by_arm['default']}
for label, rows in by_arm.items():
    assert len({r['stdout_sha256'] for r in rows}) == 1, label
summary = {label: {'distinct_files': rows[0]['distinct_files'], 'stdout_tokens': rows[0]['stdout_tokens'],
                  'output_bytes': rows[0]['output_bytes'],
                  'median_wall_ms_after_two_warmups': statistics.median(r['wall_ms'] for r in rows[2:]),
                  'median_grep_ms_after_two_warmups': statistics.median(r['stats']['requestMs'] for r in rows[2:]),
                  'matching_lines': rows[0]['stats']['matchingLines'],
                  'suppressed_by_file_cap': rows[0]['stats'].get('matchesSuppressedByFileCap', 0)}
           for label, rows in by_arm.items()}
with tempfile.TemporaryDirectory(prefix='ixos-grep-cap-') as directory:
    fixture = Path(directory)
    (fixture / 'a.txt').write_text('needle\n' * 5, encoding='utf-8')
    (fixture / 'b.txt').write_text('🙂 needle\n', encoding='utf-8')
    (fixture / 'c.txt').write_text('needle\n', encoding='utf-8')
    (fixture / '.gitignore').write_text('ignored.txt\n', encoding='utf-8')
    (fixture / 'ignored.txt').write_text('needle\n', encoding='utf-8')
    initial = state(fixture)
    serve_config = args.output.resolve() / 'serve-config.toml'
    serve_config.write_text('[retrieval]\nlimit=3\ncontext=0\noutput_bytes=1000\n', encoding='utf-8')
    requests = [{'op': 'grep', 'id': 'capped', 'pattern': 'needle', 'fixed': True, 'max_matches_per_file': 1, 'stats': True},
                {'op': 'grep', 'id': 'invalid-zero', 'pattern': 'needle', 'max_matches_per_file': 0},
                {'op': 'grep', 'id': 'invalid-large', 'pattern': 'needle', 'max_matches_per_file': 10001},
                {'op': 'grep', 'id': 'invalid-type', 'pattern': 'needle', 'max_matches_per_file': 'one'},
                {'op': 'grep', 'id': 'default', 'pattern': 'needle', 'fixed': True, 'stats': True},
                {'op': 'grep', 'id': 'explicit-null', 'pattern': 'needle', 'fixed': True, 'max_matches_per_file': None},
                {'op': 'grep', 'id': 'no-match', 'pattern': 'absent', 'max_matches_per_file': 1, 'stats': True}]
    argv = [str(args.binary.resolve()), '--config', str(serve_config), 'serve', '--profile', 'lexical', '--dir', str(fixture),
            '--session', 'off', '--max-output-bytes', '1000', '--quiet-stats']
    data = ''.join(json.dumps(request) + '\n' for request in requests).encode()
    process = subprocess.run(argv, input=data, env=environment, capture_output=True, timeout=30)
    (args.output / 'serve.requests').write_bytes(data)
    (args.output / 'serve.stdout').write_bytes(process.stdout)
    (args.output / 'serve.stderr').write_bytes(process.stderr)
    assert process.returncode == 0, process.stderr
    values = [json.loads(line) for line in process.stdout.splitlines()]
    assert len(values) == len(requests)
    assert [r['path'] for r in values[0]['results']] == ['a.txt', 'b.txt', 'c.txt']
    assert all(values[index]['type'] == 'error' for index in (1, 2, 3))
    assert [r['path'] for r in values[4]['results']] == ['a.txt'] * 3
    assert values[4]['results'] == values[5]['results']
    assert values[6]['results'] == []
    assert all(len(line) + 1 <= 1000 for line in process.stdout.splitlines())
    for value in (values[0], values[4], values[5], values[6]):
        exposed(value, fixture)
    packets = [json.loads(line) for line in process.stderr.splitlines()]
    assert packets[0]['type'] == 'ready'
    assert packets[1]['diagnostics']['matchingLines'] == packets[2]['diagnostics']['matchingLines'] == 7
    assert packets[1]['diagnostics']['matchesSuppressedByFileCap'] == 4
    assert packets[3]['diagnostics']['matchesSuppressedByFileCap'] == 0
    assert state(fixture) == initial
    for cap in ('0', '10001'):
        argv = [str(args.binary.resolve()), '--config', str(config), 'grep', 'needle', '--dir', str(fixture), '--max-matches-per-file', cap]
        failed = subprocess.run(argv, env=environment, capture_output=True, timeout=30)
        assert failed.returncode != 0 and not failed.stdout
        (args.output / ('invalid-' + cap + '.stderr')).write_bytes(failed.stderr)
assert state(args.source) == before
assert config.read_bytes() == b''
record = {'status': 'passed', 'binary_sha256': sha(args.binary.read_bytes()),
          'control_sha256': sha(args.control.read_bytes()), 'source_preserved': True,
          'cases': cases, 'summary': summary, 'boundary': 'Saved-task diagnostic and authored contracts, no new relevance/agent-success labels. Seven fresh processes/arm, two warmups excluded. No compiler/embedding process overlaps.'}
(args.output / 'receipt.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print(json.dumps(summary, indent=2))
