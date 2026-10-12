"""Independently verify captured executable controls and unchanged Ixos inputs."""
import hashlib
import json
from pathlib import Path
import subprocess

base = Path(__file__).resolve().parent
root = base.parents[2]
native = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
sha = lambda raw: hashlib.sha256(raw).hexdigest()
load = lambda path: json.loads(path.read_text(encoding='utf-8'))
capture = load(base / 'capture.json')
for relative, expected in capture['files'].items():
    raw = (base / relative).read_bytes()
    assert sha(raw) == expected['sha256'] and len(raw) == expected['bytes'], relative

identity = 'marshmallow-code__marshmallow-2123'
reports = {}
for arm, resolved, expected_failures in [('base', False, 23), ('gold', True, 0)]:
    directory = base / 'linux' / arm
    result = load(directory / 'results.json')
    assert result['total_instances'] == result['completed_instances'] == 1
    assert result['resolved_instances'] == int(resolved)
    assert result['unresolved_instances'] == int(not resolved)
    assert all(result[key] == 0 for key in ('empty_patch_instances', 'error_instances',
               'infra_failure_instances', 'ambiguous_failure_instances', 'unstopped_instances'))
    report = load(directory / 'report.json')[identity]
    assert report['resolved'] is resolved
    assert report['patch_exists'] and report['patch_successfully_applied']
    assert not report['infra_failure']
    tests = report['tests_status']
    assert len(tests['FAIL_TO_PASS']['failure']) == expected_failures
    assert len(tests['FAIL_TO_PASS']['success']) == 23 - expected_failures
    assert len(tests['PASS_TO_PASS']['success']) == 145
    assert not tests['PASS_TO_PASS']['failure']
    output = (directory / 'test_output.txt').read_text(encoding='utf-8')
    assert f'>>>>> Test Exit Code: {int(not resolved)}' in output
    assert ('23 failed, 145 passed' if not resolved else '168 passed') in output
    reports[arm] = {'resolved': resolved, 'test_counts': {
        key: {kind: len(items) for kind, items in values.items()}
        for key, values in tests.items()}}
bt = load(base / 'linux/base/report.json')[identity]['tests_status']
gt = load(base / 'linux/gold/report.json')[identity]['tests_status']
assert set(bt['FAIL_TO_PASS']['failure']) == set(gt['FAIL_TO_PASS']['success'])
assert set(bt['PASS_TO_PASS']['success']) == set(gt['PASS_TO_PASS']['success'])
assert (base / 'linux/base/eval.sh').read_bytes() == (base / 'linux/gold/eval.sh').read_bytes()

smoke = load(base / 'linux/smoke-inputs.json')
image = load(base / 'linux/image.json')
control = native / 'gate24-smoke/control-v5-pinned.json'
assert sha(control.read_bytes()) == smoke['control_input_sha256']
assert smoke['instance_id'] == identity and smoke['actor_task'] is False
assert smoke['image_digest'] in image['digests']
assert smoke['image_digest'].endswith('@' + image['id'])
assert image['architecture'] == 'amd64' and image['os'] == 'linux'
base_patch = json.loads((native / 'gate24-smoke/base.jsonl').read_text())['model_patch']
assert sha(base_patch.encode()) == smoke['base_patch_sha256']
assert 'a/ixos_harness_control.txt b/ixos_harness_control.txt' in base_patch
assert 'no source behavior change' in base_patch

train = load(base / 'train-test-availability.json')
dev = load(base / 'dev-test-availability.json')
selection = load(base / 'selection.json')
assert train['rows'] == 19008 and dev['rows'] == 225
assert all(value == 0 for value in train['nonempty'].values())
assert selection['eligible_repositories_remaining'] == 0 and selection['candidate_metadata'] == []
assert selection['control_metadata']['instance_id'] == identity
assert not selection['candidate_problem_reference_test_content_loaded']
canonical = load(base / 'canonical-control.json')
assert canonical['same_original_problem_reference_source']
assert not canonical['official_test_downloaded'] and not canonical['new_actor_references_loaded']
assert sha((root / '.tmp/gate24/data/canonical-dev.parquet').read_bytes()) == canonical['download']['sha256']

previous = load(root / 'reports/restoration/gate23/audit.json')
sources = sorted((root / 'src').rglob('*.rs')) + [root / 'Cargo.toml', root / 'Cargo.lock', root / 'config/retrieval-models.json']
for path in sources:
    assert path.read_bytes().replace(b'\r\n', b'\n') == (native / 'source' / path.relative_to(root)).read_bytes().replace(b'\r\n', b'\n')
    before = subprocess.check_output(['git', 'show', 'ae336e4:' + path.relative_to(root).as_posix()], cwd=root)
    assert before.replace(b'\r\n', b'\n') == path.read_bytes().replace(b'\r\n', b'\n')
for platform, path in [('windows', root / 'target/release/ixos.exe'),
                       ('linux', native / 'source/target/release/ixos')]:
    assert sha(path.read_bytes()) == previous[platform + '_binary_sha256']
frozen_files = {p.relative_to(root).as_posix(): sha(p.read_bytes()) for p in sorted((root / 'eval').glob('*.py'))}
frozen = sha(json.dumps(frozen_files, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode())
assert frozen == previous['frozen_evaluator_sha256']
result = {'status': 'passed', 'captured_files': len(capture['files']), 'controls': reports,
          'same_regression_and_passing_test_sets': True, 'same_eval_script': True,
          'image': image, 'harness_commit': load(base / 'inputs.json')['harness_commit'],
          'normalized_unchanged_source_files': len(sources),
          'windows_binary_sha256': previous['windows_binary_sha256'],
          'linux_binary_sha256': previous['linux_binary_sha256'],
          'frozen_evaluator_sha256': frozen, 'new_actor_tasks': 0,
          'helpers': {p.name: sha(p.read_bytes()) for p in sorted(base.glob('*.py'))},
          'boundary': 'Harness environment controls, not an Ixos retrieval or patch-resolution score. No production/default/model changes.'}
(base / 'audit.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': 'passed', 'base_failures': 23, 'gold_failures': 0,
                  'unchanged_passing_tests': 145, 'new_actor_tasks': 0}))
