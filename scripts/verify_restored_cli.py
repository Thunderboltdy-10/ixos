"""Actual-model integration checks for profiles/config/cache/quiet JSONL.

Temporary sources are authored contract fixtures, never quality benchmark gold.
An optional frozen binary checks ranking equivalence without reading test labels.
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
    parser.add_argument('--code-model', type=Path, required=True)
    parser.add_argument('--documents-model', type=Path, required=True)
    parser.add_argument('--frozen-binary', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    binary = str(args.binary.resolve())
    checks = []
    with tempfile.TemporaryDirectory(prefix='ixos-profile-contract-') as temporary:
        root = Path(temporary)
        corpus = root / 'sources'
        corpus.mkdir()
        (corpus / 'cache.rs').write_text('fn refresh_raw_hash() {}\n' + 'Cache freshness verifies source bytes after equal-length edits.\n' * 70, encoding='utf-8')
        (corpus / 'parser.rs').write_text('fn decode_utf16() {}\n' + 'Office and PDF extraction uses bounded input and exact text evidence.\n' * 50, encoding='utf-8')
        (corpus / '.gitignore').write_text('ignored.txt\n', encoding='utf-8')
        (corpus / 'ignored.txt').write_text('Cache freshness hidden witness', encoding='utf-8')
        before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in corpus.iterdir()}
        config = root / 'config.toml'
        environment = dict(os.environ)
        environment.pop('IXOS_MODEL_PATH', None)

        def call(*words, expected=0, stdin=None, executable=binary, configured=True):
            argv = [executable] + (['--config', str(config)] if configured else []) + list(map(str, words))
            result = subprocess.run(argv, input=stdin, capture_output=True, env=environment, timeout=120)
            assert (result.returncode == 0) == (expected == 0), (argv, result.stderr.decode(errors='replace'))
            return result

        call('config', '--reset')
        call('config', '--set', 'retrieval.model_path=' + str(args.code_model.resolve()))
        query = 'cache freshness after edits'
        default = call('search', query, '--dir', corpus, '--json', '--cache-mode', 'ephemeral', '--stats')
        explicit = call('search', query, '--dir', corpus, '--json', '--cache-mode', 'ephemeral', '--retrieval', 'hybrid', '--representation', 'intro-uniform', '--model-path', args.code_model.resolve(), '--io-workers', '4')
        assert json.loads(default.stdout) == json.loads(explicit.stdout)
        assert json.loads(default.stderr)['diagnostics']['searchableFiles'] == 2
        if args.frozen_binary:
            frozen = call('search', query, '--dir', corpus, '--json', '--cache-mode', 'ephemeral', '--retrieval', 'hybrid', '--representation', 'intro-uniform', '--model-path', args.code_model.resolve(), '--io-workers', '4', '--max-output-bytes', '6000', executable=str(args.frozen_binary.resolve()))
            assert json.loads(default.stdout) == json.loads(frozen.stdout)
        checks.append('default code profile equals explicit and optional frozen retrieval')

        call('config', '--set', 'retrieval.limit=1')
        call('config', '--set', 'retrieval.context=0')
        call('config', '--set', 'retrieval.output_bytes=900')
        compact = call('search', query, '--dir', corpus, '--json')
        assert len(compact.stdout) <= 900 and len(json.loads(compact.stdout)['results']) == 1
        call('config', '--set', 'retrieval.io_workers=0', expected=1)
        assert call('config', '--get', 'retrieval.io_workers').stdout.strip() == b'4'
        checks.append('persistent settings affect bounded output; invalid update leaves configuration valid')

        lexical = call('search', query, '--dir', corpus, '--profile', 'lexical', '--model-path', root / 'absent', '--json', '--stats')
        assert json.loads(lexical.stderr)['diagnostics']['modelFingerprint'] is None
        missing = call('search', query, '--dir', corpus, '--model-path', root / 'absent', '--json', expected=1)
        assert json.loads(missing.stdout)['type'] == 'error'
        call('search', query, '--dir', corpus, '--progressive', '--json', expected=1)
        call('search', query, '--dir', corpus, '--retrieval', 'legacy', '--profile', 'code', expected=1)
        checks.append('lexical loads no model; missing model and mixed legacy flags fail explicitly')

        call('config', '--reset')
        docs = call('search', 'bounded extraction of office documents', '--dir', corpus, '--profile', 'documents', '--model-path', args.documents_model.resolve(), '--cache-mode', 'ephemeral', '--json', '--stats')
        assert json.loads(docs.stderr)['diagnostics']['representation'] == 'whole-token-centroid'
        checks.append('document profile chooses full-token centroid')

        call('cache', 'clear', '--dir', corpus, '--force')
        warm = call('cache', 'warm', '--dir', corpus, '--model-path', args.code_model.resolve())
        assert json.loads(warm.stdout)['diagnostics']['passagesEmbedded'] > 0
        statistics = json.loads(call('cache', 'stats', '--dir', corpus, '--json').stdout)
        assert statistics['namespace'] == 'document-v1' and statistics['cached_files'] == 2
        call('cache', 'clear', '--dir', corpus, '--force')
        assert json.loads(call('cache', 'stats', '--dir', corpus, '--json').stdout)['cached_files'] == 0
        checks.append('warm/stats/clear share the current document cache namespace')

        requests = '\n'.join(json.dumps(row) for row in [
            {'op': 'search', 'id': 'quiet', 'query': query},
            {'op': 'search', 'id': 'debug', 'query': query, 'stats': True},
            {'op': 'grep', 'id': 'exact', 'pattern': 'refresh_raw_hash', 'fixed': True},
            {'op': 'read', 'id': 'source', 'path': 'cache.rs', 'start': 1, 'lines': 2},
        ]) + '\n'
        resident = call('serve', '--dir', corpus, '--model-path', args.code_model.resolve(), '--quiet-stats', stdin=requests.encode())
        rows = [json.loads(line) for line in resident.stdout.splitlines()]
        diagnostics = [json.loads(line) for line in resident.stderr.splitlines()]
        assert len(rows) == 4 and all(len(line) + 1 <= 6000 for line in resident.stdout.splitlines())
        assert [row.get('id') for row in diagnostics if row['type'] == 'stats'] == ['debug']
        assert diagnostics[-1]['diagnostics']['memoryCacheHits'] == 2
        checks.append('quiet resident calls retain per-request diagnostics and source-read/grep operations')

        after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in corpus.iterdir()}
        assert before == after
        checks.append('all operations preserve primary source bytes and create no adjacent sidecars')
        config.write_text('[retrieval]\nio_workers = 0\n', encoding='utf-8')
        invalid_before = config.read_bytes()
        call('config', '--list', expected=1)
        assert config.read_bytes() == invalid_before
        call('config', '--reset')
        assert call('config', '--get', 'retrieval.io_workers').stdout.strip() == b'4'
        checks.append('malformed configuration is preserved; explicit reset recovers')
    receipt = {'status': 'passed', 'checks': checks, 'binary_sha256': hashlib.sha256(args.binary.read_bytes()).hexdigest(), 'quality_benchmark': False}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
