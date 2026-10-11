"""CLI/JSONL identifier notation and whitespace checks on authored sources.

This is a correctness probe, not independent retrieval-quality benchmark gold.
The optional model exercises the same rules through actual hybrid inference.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--model', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new receipt directory')
    args.output.mkdir(parents=True)
    commands, checks = [], []
    environment = dict(os.environ)
    environment.pop('IXOS_MODEL_PATH', None)
    queries = [('bare', 'raw_hash', True), ('double', '"raw_hash"', True),
               ('single', "'raw_hash'", True), ('spaces', 'raw_hash cache_key', False),
               ('tabs', 'raw_hash\tcache_key', False), ('lines', 'raw_hash\ncache_key', False),
               ('unicode-space', 'raw_hash\u2003cache_key', False)]
    with tempfile.TemporaryDirectory(prefix='ixos-query-contract-') as temporary:
        root = Path(temporary)
        corpus = root / 'sources'
        corpus.mkdir()
        (corpus / 'implementation.rs').write_bytes(b'fn raw_hash() {}\nfn cache_key() {}\n')
        (corpus / 'literal.rs').write_bytes(b'const FIELD: &str = "raw_hash";\n')
        config = root / 'config.toml'
        config.write_text('[retrieval]\nsession="off"\ntypo_correction=false\n', encoding='utf-8')

        def source_state():
            return {p.name: [hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_mtime_ns]
                    for p in corpus.iterdir()}

        before = source_state()

        def call(words, stdin=None):
            argv = [str(args.binary.resolve()), '--config', str(config), *map(str, words)]
            raw = subprocess.run(argv, input=stdin, capture_output=True, timeout=120, env=environment)
            prefix = args.output / f'{len(commands)+1:02d}'
            prefix.with_suffix('.stdout').write_bytes(raw.stdout)
            prefix.with_suffix('.stderr').write_bytes(raw.stderr)
            commands.append({'argv': argv, 'stdin': stdin.decode('utf-8') if stdin else None,
                             'exit_code': raw.returncode})
            (args.output / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n', encoding='utf-8')
            assert raw.returncode == 0, raw.stderr.decode(errors='replace')
            return raw

        modes = [('lexical', ['--profile', 'lexical'])]
        if args.model:
            modes.append(('hybrid', ['--retrieval', 'hybrid', '--model-path', args.model.resolve()]))
        for mode, flags in modes:
            responses = {}
            for label, query, guarded in queries:
                raw = call(['search', query, '--dir', corpus, '--json', '--stats',
                            '--cache-mode', 'ephemeral', *flags])
                value = json.loads(raw.stdout)
                stats = json.loads(raw.stderr)['diagnostics']
                assert stats['literalGuard'] == guarded
                assert 'implementation.rs' in {row['path'] for row in value['results']}
                responses[label] = value
            if mode == 'lexical':
                assert responses['bare'] == responses['double'] == responses['single']
                assert responses['spaces'] == responses['tabs'] == responses['lines'] == responses['unicode-space']
            checks.append(mode + ': quoted identifiers find code; every whitespace separator remains a multi-term query')
            requests = [{'op': 'search', 'id': label, 'query': query, 'stats': True}
                        for label, query, _ in queries]
            requests.append({'op': 'search', 'id': 'absent', 'query': 'definitely_absent_symbol', 'stats': True})
            stdin = ('\n'.join(json.dumps(row) for row in requests) + '\n').encode('utf-8')
            raw = call(['serve', '--dir', corpus, '--jit', '--quiet-stats', *flags], stdin)
            rows = [json.loads(line) for line in raw.stdout.splitlines()]
            stats = [json.loads(line)['diagnostics'] for line in raw.stderr.splitlines()
                     if json.loads(line)['type'] == 'stats']
            assert len(rows) == len(stats) == len(requests)
            assert rows[-1]['results'] == [] and stats[-1]['literalGuard']
            for row, (label, _, guarded), diagnostic in zip(rows, queries, stats):
                row.pop('id')
                assert row == responses[label] and diagnostic['literalGuard'] == guarded
            checks.append(mode + ': JSONL agrees with fresh CLI; absent literal yields no results')
        assert before == source_state()
        checks.append('source bytes/mtime unchanged; no adjacent cache files')
    receipt = {'status': 'passed', 'checks': checks,
               'binary_sha256': hashlib.sha256(args.binary.read_bytes()).hexdigest(),
               'actual_model': bool(args.model), 'quality_benchmark': False}
    (args.output / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
