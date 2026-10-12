"""Bind source/helper/binary identities and independently audit captured bytes."""
import json
from pathlib import Path
import statistics
import sys

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root))
from scripts.qasper.contract import canonical, sha
import tiktoken

base = Path(__file__).resolve().parent
native = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
tokenizer = tiktoken.get_encoding('cl100k_base')
tokens = lambda raw: len(tokenizer.encode(raw.decode('utf-8'), disallowed_special=()))
sources = sorted((root / 'src').rglob('*.rs')) + [root / 'Cargo.toml', root / 'Cargo.lock', root / 'config/retrieval-models.json']
for path in sources:
    assert path.read_bytes().replace(b'\r\n', b'\n') == (native / 'source' / path.relative_to(root)).read_bytes().replace(b'\r\n', b'\n'), path
helpers = {name: sha((base / 'helpers' / name).read_bytes()) for name in ('probe-v1.py', 'probe-v2.py', 'probe-v3.py')}
assert helpers['probe-v3.py'] == sha((root / 'scripts/verify_inspection_feedback.py').read_bytes())
win_sha = sha((root / 'target/release/ixos.exe').read_bytes())
linux_sha = sha((native / 'source/target/release/ixos').read_bytes())
baseline_sha = sha((base / 'baseline.py').read_bytes())
for folder in (base / 'before', base / 'linux/before'):
    record = json.loads((folder / 'receipt.json').read_text())
    assert record['status'] == 'reproduced' and record['helper_sha256'] == baseline_sha
assert json.loads((base / 'after/receipt.json').read_text())['helper_sha256'] == helpers['probe-v1.py']
sequences = []
for subdir, helper in [('after-v2', 'probe-v2.py'), ('policies', 'probe-v3.py')]:
    wr = json.loads((base / subdir / 'receipt.json').read_text())
    lr = json.loads((base / 'linux' / subdir / 'receipt.json').read_text())
    assert wr['status'] == lr['status'] == 'passed'
    assert wr['helper_sha256'] == lr['helper_sha256'] == helpers[helper]
    assert wr['binary_sha256'] == win_sha and lr['binary_sha256'] == linux_sha
    for w, l in zip(wr['cases'], lr['cases'], strict=True):
        assert (w['profile'], w['persist'], w['case']) == (l['profile'], l['persist'], l['case'])
        assert w['model']['fingerprint'] == l['model']['fingerprint']
        assert w['source_preserved'] and l['source_preserved']
        relative = Path(w['profile']) / ('native' if w['persist'] else 'jit') / w['case']
        raw = (base / subdir / relative / 'stdout.jsonl').read_bytes()
        assert raw == (base / 'linux' / subdir / relative / 'stdout.jsonl').read_bytes(), relative
        assert all(len(line) + 1 <= w['budget'] for line in raw.splitlines())
        if w['case'] == 'default':
            assert w['control_stdout_equal'] and l['control_stdout_equal']
        sequences.append({'profile': w['profile'], 'persist': w['persist'], 'case': w['case'],
                          'stdout_sha256': sha(raw), 'requests': w['request_count']})
for folder in (base, base / 'linux'):
    assert json.loads((folder / 'profiles.json').read_text())['status'] == 'passed'
    assert json.loads((folder / 'envelopes/receipt.json').read_text())['status'] == 'passed'
cost_summaries = []
cost_identity = sha((base / 'cost.py').read_bytes())
wc = json.loads((base / 'cost-windows/receipt.json').read_text())
lc = json.loads((base / 'linux/cost-linux/receipt.json').read_text())
assert wc['status'] == lc['status'] == 'passed'
assert wc['binary_sha256'] == win_sha and lc['binary_sha256'] == linux_sha
assert wc['helper_sha256'] == lc['helper_sha256'] == cost_identity
wm = json.loads((base / 'cost-windows/source-state.json').read_text())
lm = json.loads((base / 'linux/cost-linux/source-state.json').read_text())
assert {p: v[0] for p, v in wm.items()} == {p: v[0] for p, v in lm.items()}
for w, l in zip(wc['runs'], lc['runs'], strict=True):
    assert (w['profile'], w['persist'], w['arm'], w['run']) == (l['profile'], l['persist'], l['arm'], l['run'])
    assert w['source_preserved'] and l['source_preserved']
    relative = Path(w['profile']) / ('native' if w['persist'] else 'jit') / w['arm'] / str(w['run'])
    assert (base / 'cost-windows' / relative / 'stdout.jsonl').read_bytes() == (base / 'linux/cost-linux' / relative / 'stdout.jsonl').read_bytes(), relative
for platform, record, folder in [('windows', wc, base / 'cost-windows'), ('linux', lc, base / 'linux/cost-linux')]:
    for row in record['runs']:
        relative = Path(row['profile']) / ('native' if row['persist'] else 'jit') / row['arm'] / str(row['run'])
        stdout = (folder / relative / 'stdout.jsonl').read_bytes()
        stderr = (folder / relative / 'stderr.jsonl').read_bytes()
        stdin = (folder / relative / 'stdin.jsonl').read_bytes()
        row['audited_stdout_tokens'] = sum(tokens(line) for line in stdout.splitlines(keepends=True))
        row['audited_diagnostic_tokens'] = sum(tokens(line) for line in stderr.splitlines(keepends=True))
        row['audited_request_tokens'] = sum(tokens(line) for line in stdin.splitlines(keepends=True))
        assert len(stdout.splitlines()) == len(stdin.splitlines()) == 3
        if platform == 'windows':
            assert row['audited_stdout_tokens'] == sum(c['stdout_tokens'] for c in row['calls'])
            assert row['audited_diagnostic_tokens'] == row['ready_tokens'] + sum(c['diagnostic_tokens'] for c in row['calls'])
        # The unchanged default must match the preserved control on every run.
        if row['arm'] in ('default', 'silence'):
            other = relative.parent.parent / 'control' / relative.name
            raw_control = (folder / other / 'stdout.jsonl').read_bytes()
            values = [json.loads(line) for line in stdout.splitlines()]
            expected = [json.loads(line) for line in raw_control.splitlines()]
            if row['arm'] == 'default':
                assert stdout == raw_control
            else:
                del values[1]['remembered']
                assert values == expected
        if not row['warmup'] and row['persist']:
            assert row['calls'][0]['stats']['nativeCacheHits'] == 116
        assert row['calls'][2]['stats']['memoryCacheHits'] == 116
    for summary in record['summary']:
        selected = [r for r in record['runs'] if not r['warmup'] and
                    (r['profile'], r['persist'], r['arm']) == (summary['profile'], summary['persist'], summary['arm'])]
        assert len(selected) == 5
        cost_summaries.append({**summary, 'platform': platform,
            'stdout_tokens': statistics.mean(r['audited_stdout_tokens'] for r in selected),
            'diagnostic_tokens': statistics.mean(r['audited_diagnostic_tokens'] for r in selected),
            'request_tokens': statistics.mean(r['audited_request_tokens'] for r in selected)})
frozen = canonical({p.relative_to(root).as_posix(): sha(p.read_bytes()) for p in sorted((root / 'eval').glob('*.py'))})
assert frozen == '95afba09dd7c77e0fc56ed4e922d508116f701bb679f52c0844ed7725fc14297'
result = {'status': 'passed', 'normalized_source_files': len(sources), 'helpers': helpers,
    'windows_binary_sha256': win_sha, 'linux_binary_sha256': linux_sha,
    'frozen_evaluator_sha256': frozen, 'exact_cross_platform_sequences': sequences,
    'cost_source_files': len(wm), 'exact_cross_platform_cost_stdout_files': len(wc['runs']),
    'cost_summary_with_independent_tokens': cost_summaries,
    'boundary': 'V1 partial wrong-flag failure retained. V2 main108 checks; V3 adds8combined/context checks. Authored informed costs and correctness, no quality labels.'}
(base / 'audit.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': 'passed', 'exact_correctness_sequences': len(sequences),
                  'exact_cost_stdout_files': len(wc['runs']), 'normalized_sources': len(sources)}))
