"""Record a real concept/exact/read path from the exported source installation."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path('.tmp/gate4/clean-source').resolve()
binary = Path('.tmp/gate4/reviewer-target/release/ixos.exe').resolve()
model_root = Path('.tmp/gate4/reviewer-models').resolve()
out = Path('reports/restoration/gate4')
config = Path('.tmp/gate4/reviewer-absent-config.toml').resolve()
assert not config.exists()
environment = __import__('os').environ.copy()
environment.pop('IXOS_MODEL_PATH', None)
commands = []

def run(name, *words):
    argv = [str(binary), '--config', str(config), *map(str, words)]
    raw = subprocess.run(argv, env=environment, capture_output=True, timeout=120)
    (out / ('gate4-reviewer-' + name + '.stdout')).write_bytes(raw.stdout)
    (out / ('gate4-reviewer-' + name + '.stderr')).write_bytes(raw.stderr)
    commands.append({'argv': argv, 'exit_code': raw.returncode, 'stdout_bytes': len(raw.stdout)})
    assert raw.returncode == 0, (argv, raw.stderr.decode(errors='replace'))
    return json.loads(raw.stdout)

search = run('concept', 'search', 'where native cache writes fail and use application database fallback',
             '--dir', root / 'src', '--model-path', model_root / 'potion-code-16M-v2-unbounded',
             '--cache-mode', 'ephemeral', '--json', '--stats', '--limit', 3)
assert search['results'][0]['path'] == 'retrieval/cache.rs'
assert len((out / 'gate4-reviewer-concept.stdout').read_bytes()) <= 6000
run('read', 'read', 'retrieval/cache.rs', '--dir', root / 'src', '--start', 48, '--lines', 100)
run('grep', 'grep', 'is_supported', '--dir', root / 'src/storage', '--fixed')
assert not config.exists(), 'read-only/default calls created a configuration'

receipt = json.loads((out / 'gate4-reviewer-source.json').read_text())
receipt.update({
    'build_exit_code': 0,
    'build_elapsed_seconds_reported_by_cargo': 132,
    'binary_sha256': hashlib.sha256(binary.read_bytes()).hexdigest(),
    'binary_condition': 'Independent fresh target and exported source path; binary hash can differ because embedded build paths differ. Authored-fixture output equivalence was checked against the frozen binary.',
    'code_model': json.loads((model_root / 'potion-code-16M-v2-unbounded/INSTALL_RECEIPT.json').read_text()),
    'documents_model': json.loads((model_root / 'potion-retrieval-32M-row-int8/INSTALL_RECEIPT.json').read_text()),
    'setup_commands': [
        'python -S .tmp/gate4/clean-source/scripts/setup_models.py --profile code --destination .tmp/gate4/reviewer-models',
        'python .tmp/gate4/clean-source/scripts/setup_models.py --profile documents --destination .tmp/gate4/reviewer-models'
    ],
    'profile_check': 'scripts/verify_restored_cli.py from the export: eight passing actual-model checks; explicit temporary config, freshly downloaded models, optional frozen-fixture equality',
    'native_check': 'scripts/verify_retrieval_engine.py from the export: eight passing native/edit/rename/source/fallback/feedback checks; model path explicit, default OS key/application cache facilities reused',
    'commands': commands,
    'quality_benchmark': False,
    'platform': sys.platform,
})
(out / 'gate4-reviewer-source.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'status': 'passed', 'binary_sha256': receipt['binary_sha256'], 'commands': len(commands)}, indent=2))
