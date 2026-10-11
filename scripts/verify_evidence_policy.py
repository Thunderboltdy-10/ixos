"""Actual-model evidence bounds, native-record invariance and override isolation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile


def native_record(path):
    if os.name == 'nt':
        return Path(str(path) + ':ixos_document_v1').read_bytes()
    return os.getxattr(path, 'user.ixos.document-v1')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new receipt folder')
    args.output.mkdir(parents=True)
    checks, commands = [], []
    with tempfile.TemporaryDirectory(prefix='ixos-evidence-probe-') as temporary:
        root = Path(temporary)
        corpus = root / 'corpus'
        corpus.mkdir()
        path = corpus / 'long.txt'
        path.write_text('Introduction.\n' + 'ordinary routine notes 中😀\n' * 14000
                        + 'late unique evidence witness describes cache freshness.\n'
                        + 'other routine notes\n' * 6000, encoding='utf-8')
        (corpus / '.gitignore').write_text('ignored.txt\n', encoding='utf-8')
        (corpus / 'ignored.txt').write_text('late unique evidence witness', encoding='utf-8')
        config = root / 'config.toml'
        config.write_text('[retrieval]\nsession="off"\n', encoding='utf-8')
        def source_state():
            return {p.name: {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'mtime_ns': p.stat().st_mtime_ns}
                    for p in corpus.iterdir()}
        before = source_state()
        def call(*words, stdin=None, expected=0):
            argv = [str(args.binary.resolve()), '--config', str(config), *map(str, words)]
            result = subprocess.run(argv, input=stdin, capture_output=True, timeout=120)
            prefix = args.output / f'{len(commands)+1:02d}'
            prefix.with_suffix('.stdout').write_bytes(result.stdout)
            prefix.with_suffix('.stderr').write_bytes(result.stderr)
            commands.append({'argv': argv, 'exit_code': result.returncode})
            (args.output / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n', encoding='utf-8')
            assert (result.returncode == 0) == (expected == 0), result.stderr.decode(errors='replace')
            return result
        query = 'late unique evidence witness cache freshness'
        words = ['search', query, '--dir', corpus, '--model-path', args.model.resolve(), '--json', '--stats']
        control = call(*words)
        stored = native_record(path)
        assert json.loads(control.stderr)['diagnostics']['passagesEmbedded'] == 8
        candidate = call(*words, '--evidence-policy', 'bounded-rerank')
        work = json.loads(candidate.stderr)['diagnostics']
        assert work['nativeCacheHits'] == 1 and work['passagesEmbedded'] == 0 and work['cacheWrites'] == 0
        evidence = work['evidence']
        assert 1 <= evidence['extraPassagesEmbedded'] <= 8 and evidence['candidatePassages'] <= 16
        assert native_record(path) == stored and len(stored) == 2375
        checks.append('eight cached vectors reused; extra evidence separately counted; native payload unchanged at 2375 bytes')
        jit = call(*words, '--evidence-policy', 'bounded-rerank', '--cache-mode', 'ephemeral')
        assert json.loads(jit.stdout) == json.loads(candidate.stdout)
        assert native_record(path) == stored
        checks.append('JIT and native-warm policy responses agree with the same vector precision')
        a, b = json.loads(control.stdout)['results'], json.loads(candidate.stdout)['results']
        assert [(r['path'], r['score']) for r in a] == [(r['path'], r['score']) for r in b]
        for row in b:
            view = row['view']
            lines = path.read_text(encoding='utf-8').splitlines()
            assert view['text'] == '\n'.join(lines[view['start_line']-1:view['end_line']])
        checks.append('file ranking preserved and displayed text matches exact source coordinates')
        call(*words, '--evidence-policy', 'bounded-rerank', '--limit', '11', expected=1)
        call(*words, '--evidence-policy', 'bounded-rerank', '--retrieval', 'lexical', expected=1)
        checks.append('explicit errors for unbounded result count and model-free lexical mode')
        requests = [
            {'op': 'search', 'id': 'candidate', 'query': query, 'evidence_policy': 'bounded-rerank', 'stats': True},
            {'op': 'search', 'id': 'invalid', 'query': query, 'evidence_policy': 'unknown'},
            {'op': 'search', 'id': 'control', 'query': query, 'stats': True},
        ]
        raw = call('serve', '--dir', corpus, '--model-path', args.model.resolve(), '--quiet-stats',
                   stdin=('\n'.join(json.dumps(row) for row in requests) + '\n').encode())
        rows = [json.loads(line) for line in raw.stdout.splitlines()]
        stats = [json.loads(line)['diagnostics'] for line in raw.stderr.splitlines() if json.loads(line)['type'] == 'stats']
        assert len(rows) == 3 and rows[1]['type'] == 'error'
        assert stats[0]['evidence']['policy'] == 'bounded-rerank' and 'evidence' not in stats[1]
        assert stats[1]['memoryCacheHits'] == 1
        for row, expected in [(rows[0], candidate), (rows[2], control)]:
            row.pop('id')
            assert row == json.loads(expected.stdout)
        checks.append('per-request override resets after success or malformed request; resident default unchanged')
        lexical = call('serve', '--dir', corpus, '--retrieval', 'lexical', '--quiet-stats',
                       stdin=(json.dumps(requests[0]) + '\n' + json.dumps(requests[2]) + '\n').encode())
        rows = [json.loads(line) for line in lexical.stdout.splitlines()]
        assert rows[0]['type'] == 'error' and len(rows[1]['results']) == 1
        checks.append('resident policy validation occurs before refresh; lexical server recovers')
        call('config', '--set', 'retrieval.evidence_policy=bounded-rerank')
        configured = call(*words)
        assert json.loads(configured.stdout) == json.loads(candidate.stdout)
        overridden = call(*words, '--evidence-policy', 'global-line')
        assert json.loads(overridden.stdout) == json.loads(control.stdout)
        checks.append('persistent setting is editable and explicit CLI override wins')
        assert source_state() == before and native_record(path) == stored
        checks.append('all probes preserve source bytes/mtime and create no adjacent files')
    receipt = {'status': 'passed', 'checks': checks, 'binary_sha256': hashlib.sha256(args.binary.read_bytes()).hexdigest(),
               'quality_benchmark': False, 'condition': 'Real CPU model, native ADS/xattr fixture; not fallback-DB or low-end-device proof.'}
    (args.output / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
