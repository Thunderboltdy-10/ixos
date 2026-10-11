"""Actual-model JSONL envelope visibility/state contracts; no quality labels."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

from eval.artifacts import artifact_identity


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def state(root):
    return {p.relative_to(root).as_posix(): [sha(p.read_bytes()), p.stat().st_mtime_ns]
            for p in sorted(root.rglob('*')) if p.is_file()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--code-model', type=Path, required=True)
    parser.add_argument('--documents-model', type=Path, required=True)
    parser.add_argument('--control', type=Path)
    parser.add_argument('--expect-bug', action='store_true')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert not args.output.exists(), 'Use a new receipt directory'
    args.output.mkdir(parents=True)
    receipt = {'status': 'running', 'binary_sha256': sha(args.binary.read_bytes()),
               'helper_sha256': sha(Path(__file__).read_bytes()), 'quality_benchmark': False, 'cases': []}
    env = dict(os.environ)
    env.pop('IXOS_MODEL_PATH', None)
    nul = '\0' * 256
    search = lambda identity, **extra: {'op': 'search', 'id': identity, 'query': 'cache freshness', 'stats': True, **extra}
    feedback = lambda identity: {'query_id': identity, 'accepted': [0], 'rejected': []}
    cases = [
        ('rejected-search', 512, [search(nul), search('follow', feedback=feedback(nul))]),
        ('rejected-reset', 512, [search('seed'), {'op': 'reset', 'id': nul}, search('follow', feedback=feedback('seed'))]),
        ('rejected-grep', 512, [search('seed'), {'op': 'grep', 'id': nul, 'pattern': 'cache'}, search('follow', feedback=feedback('seed'))]),
        ('rejected-read', 512, [search('seed'), {'op': 'read', 'id': nul, 'path': 'cache_a.rs'}, search('follow', feedback=feedback('seed'))]),
        ('escaped-large', 6000, [search(nul), search('follow', feedback=feedback(nul))]),
        ('quoted-valid', 2000, [search('"' * 256), search('follow', feedback=feedback('"' * 256))]),
        ('unicode-valid', 512, [search('é' * 128), search('follow', feedback=feedback('é' * 128))]),
        ('budget-restored', 6000, [search(nul), search('failure', evidence_policy='not-a-policy'),
                                  {**search('\x01' * 256), 'query': ''}, search('ordinary')]),
        ('escaped-grep-read', 2000, [{'op': 'grep', 'id': nul, 'pattern': 'cache', 'stats': True},
                                     {'op': 'read', 'id': nul, 'path': 'cache_a.rs', 'start': 1, 'lines': 1}]),
    ]
    with tempfile.TemporaryDirectory(prefix='ixos-envelope-contract-') as directory:
        scratch = Path(directory)
        root = scratch / 'sources'
        root.mkdir()
        for name in ('a', 'b', 'c'):
            text = f'fn refresh_{name}() {{}}\nCache freshness validates source bytes. ' + 'word ' * 330 + '\n'
            (root / f'cache_{name}.rs').write_bytes(text.encode())
        (root / '.gitignore').write_bytes(b'ignored.txt\n')
        (root / 'ignored.txt').write_bytes(b'cache freshness hidden witness')
        before = state(root)
        for profile, model in [('code', args.code_model), ('documents', args.documents_model)]:
            model_id = artifact_identity(model)
            for label, budget, requests in cases:
                config = scratch / 'config.toml'
                config.write_text(f'[retrieval]\nlimit=3\ncontext=0\noutput_bytes={budget}\nsession="feedback"\npersist=false\n', encoding='utf-8')
                argv = [str(args.binary.resolve()), '--config', str(config), 'serve', '--dir', str(root),
                        '--profile', profile, '--model-path', str(model.resolve()), '--session', 'feedback', '--jit', '--quiet-stats']
                encoded = ''.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) + '\n' for r in requests).encode()
                result = subprocess.run(argv, input=encoded, env=env, capture_output=True, timeout=60)
                folder = args.output / profile / label
                folder.mkdir(parents=True)
                (folder / 'requests.jsonl').write_bytes(encoded)
                (folder / 'stdout.jsonl').write_bytes(result.stdout)
                (folder / 'stderr.jsonl').write_bytes(result.stderr)
                assert result.returncode == 0, (label, result.stderr)
                values = [json.loads(r) for r in result.stdout.splitlines()]
                packets = [json.loads(r) for r in result.stderr.splitlines()]
                stats = {r['id']: r['diagnostics'] for r in packets if r.get('type') == 'stats'}
                assert packets[0]['type'] == 'ready' and len(values) == len(requests)
                assert all(len(r) + 1 <= budget for r in result.stdout.splitlines())
                if label.startswith('rejected-'):
                    index = 0 if label == 'rejected-search' else 1
                    assert values[index]['type'] == 'error'
                    expected = (args.expect_bug if label == 'rejected-search' else
                                not args.expect_bug if label == 'rejected-reset' else True)
                    assert stats['follow']['feedbackConsumed'] == expected, label
                    if not args.expect_bug:
                        assert nul not in stats and stats['follow']['sessionEntries'] == (1 if index == 0 else 2)
                elif label in ('escaped-large', 'budget-restored'):
                    if args.expect_bug:
                        assert values[0]['type'] == 'error', label
                    else:
                        assert values[0]['id'] == nul and values[0]['results'], label
                        assert stats[nul]['sessionEntries'] == 1
                    if label == 'escaped-large':
                        assert stats['follow']['feedbackConsumed']
                    else:
                        assert values[1]['type'] == 'error'
                        assert values[2]['type'] == 'error'
                        ordinary = [search('ordinary')]
                        raw = ''.join(json.dumps(r) + '\n' for r in ordinary).encode()
                        standalone = subprocess.run(argv, input=raw, env=env, capture_output=True, timeout=60)
                        (folder / 'ordinary-only.stdout').write_bytes(standalone.stdout)
                        assert standalone.returncode == 0 and json.loads(standalone.stdout) == values[-1]
                        if args.control:
                            control_argv = [str(args.control.resolve()), *argv[1:]]
                            control = subprocess.run(control_argv, input=raw, env=env, capture_output=True, timeout=60)
                            (folder / 'control-ordinary.stdout').write_bytes(control.stdout)
                            assert control.returncode == 0 and control.stdout == standalone.stdout
                else:
                    assert all(v.get('type') != 'error' for v in values), label
                    assert [v['id'] for v in values] == [r['id'] for r in requests]
                    if label != 'escaped-grep-read':
                        assert stats['follow']['feedbackConsumed']
                assert state(root) == before
                receipt['cases'].append({'profile': profile, 'model': model_id, 'case': label, 'budget': budget,
                    'argv': argv, 'response_bytes': [len(r) + 1 for r in result.stdout.splitlines()],
                    'stats': stats, 'source_preserved': True})
                (args.output / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
        assert state(root) == before
    receipt['status'] = 'reproduced' if args.expect_bug else 'passed'
    (args.output / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': receipt['status'], 'actual_model_sequences': len(receipt['cases']),
                      'source_preserved': True, 'quality_benchmark': False}, indent=2))


if __name__ == '__main__':
    main()
