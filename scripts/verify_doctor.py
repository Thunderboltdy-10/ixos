"""Actual current-model doctor contracts, config precedence, failure exits and source preservation.

Authored installation checks, not relevance-quality labels. A before receipt can
capture the legacy diagnostic path without changing model/global configuration.
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
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--expect-legacy', action='store_true')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new receipt directory')
    args.output.mkdir(parents=True)
    binary = args.binary.resolve()
    commands = []
    with tempfile.TemporaryDirectory(prefix='ixos-doctor-contract-') as temporary:
        root = Path(temporary)
        corpus = root / 'corpus'
        corpus.mkdir()
        source = corpus / 'keep.txt'
        source.write_text('Existing user source; do not cache or edit me.\n', encoding='utf-8')
        baseline = {p.name: [hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_mtime_ns] for p in corpus.iterdir()}
        config = root / 'chosen.toml'
        config.write_text('[retrieval]\nprofile="lexical"\nmodel_path="missing-model"\n', encoding='utf-8')
        environment = dict(os.environ)
        environment.pop('IXOS_MODEL_PATH', None)

        def call(name, words, expected_exit=0, env=None, report=True):
            argv = [str(binary), '--config', str(config), *map(str, words)]
            result = subprocess.run(argv, capture_output=True, timeout=120, env=env or environment, cwd=corpus)
            stem = args.output / name
            stem.with_suffix('.stdout').write_bytes(result.stdout)
            stem.with_suffix('.stderr').write_bytes(result.stderr)
            commands.append({'name': name, 'argv': argv, 'cwd': str(corpus), 'exit_code': result.returncode})
            (args.output / 'commands.json').write_text(json.dumps(commands, indent=2)+'\n', encoding='utf-8')
            assert (result.returncode == 0) if expected_exit == 0 else (result.returncode != 0), (name, result.stderr)
            if not report:
                return None
            parsed = json.loads(result.stdout)
            if not args.expect_legacy:
                assert ('path='+str(config)) == next(c for c in parsed['checks'] if c['id']=='config_resolution')['details']
                assert all(c['id'] not in ('flash_model', 'pro_model', 'progressive_event_order') for c in parsed['checks'])
                assert parsed['summary']['fail'] == (0 if expected_exit == 0 else 1), parsed
            return parsed

        if args.expect_legacy:
            legacy = call('legacy-config-override', ['doctor', '--json', '--verbose'])
            assert any(c['id'] == 'flash_model' for c in legacy['checks'])
            assert ('path='+str(config)) != next(c for c in legacy['checks'] if c['id']=='config_resolution')['details']
        else:
            lexical = call('lexical-config', ['doctor', '--json'])
            assert next(c for c in lexical['checks'] if c['id']=='retrieval_model')['status']=='INFO'
            for name, model in [('code', args.code_model), ('documents', args.documents_model)]:
                # Remove the lexical config mode: explicit profile now selects actual hybrid.
                chosen = '[retrieval]\nprofile="'+name+'"\nmodel_path='+json.dumps(str(model.resolve()))+'\n'
                config.write_text(chosen, encoding='utf-8')
                parsed = call(name+'-config', ['doctor', '--dir', corpus, '--json', '--verbose'])
                checks = {c['id']: c for c in parsed['checks']}
                assert checks['retrieval_model']['status']=='PASS' and 'fingerprint=' in checks['retrieval_model']['details']
                assert checks['cache_backend']['status']=='PASS' and any(b in checks['cache_backend']['message'] for b in ('native', 'application-db'))
                assert checks['probe_cleanup']['status']=='PASS'
            config.write_text('[retrieval]\nprofile="lexical"\n', encoding='utf-8')
            explicit = call('explicit-code', ['doctor','--profile','code','--model-path',args.code_model.resolve(),'--json'])
            assert next(c for c in explicit['checks'] if c['id']=='retrieval_model')['status']=='PASS'
            env = {**environment, 'IXOS_MODEL_PATH':str(args.documents_model.resolve())}
            config.write_text('[retrieval]\nprofile="documents"\nmodel_path="missing-config-model"\n', encoding='utf-8')
            call('environment-precedence', ['doctor','--json'], env=env)
            call('explicit-over-environment', ['doctor','--model-path',args.code_model.resolve(),'--json'], env=env)
            call('missing-json', ['doctor','--model-path',root/'missing-model','--json'], expected_exit=1)
            call('missing-human', ['doctor','--model-path',root/'missing-model'], expected_exit=1, report=False)
            config.write_text('[retrieval]\nprofile="lexical"\n', encoding='utf-8')
            call('missing-root', ['doctor','--dir',root/'missing-root','--json'], expected_exit=1)
            config.write_text('[retrieval]\nprofile=not-valid\n', encoding='utf-8')
            invalid = config.read_bytes()
            call('invalid-config', ['doctor','--json'], expected_exit=1, report=False)
            assert config.read_bytes()==invalid
        after = {p.name: [hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_mtime_ns] for p in corpus.iterdir() if p.is_file()}
        assert after == baseline and set(p.name for p in corpus.iterdir()) == set(baseline), 'Source or probe leftovers changed'
        receipt = {'status':'passed', 'expected_legacy':args.expect_legacy, 'quality_benchmark':False,
                   'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),
                   'helper_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                   'source_preserved':True, 'commands':commands}
        (args.output/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'status':'passed','commands':len(commands),'source_preserved':True}))


if __name__ == '__main__':
    main()
