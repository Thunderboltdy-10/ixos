"""Verify source/data availability and executable controls independently."""
import hashlib
import json
from pathlib import Path
import subprocess

import pyarrow.parquet as pq

base = Path(__file__).resolve().parent
root = base.parents[2]
native = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
sha = lambda raw: hashlib.sha256(raw).hexdigest()
load = lambda path: json.loads(path.read_text(encoding='utf-8'))
capture = load(base / 'capture.json')
for relative, expected in capture['files'].items():
    raw = (base / relative).read_bytes()
    assert sha(raw) == expected['sha256'] and len(raw) == expected['bytes']

inputs = load(base / 'synthetic-training-inputs.json')
image_rows = 0
for item in inputs['downloads']:
    path = root / '.tmp/gate25/data/swesmith-py' / Path(item['file']).name
    assert sha(path.read_bytes()) == item['sha256'] and path.stat().st_size == item['bytes']
    table = pq.read_table(path, columns=['image_name'])
    assert table.num_rows == item['rows']
    image_rows += sum(bool(row['image_name']) for row in table.to_pylist())
assert image_rows == inputs['rows'] == 50908
assert inputs['rows_with_nonempty_fields']['FAIL_TO_PASS'] == 50908
assert inputs['rows_with_nonempty_fields']['PASS_TO_PASS'] == 50432
assert not inputs['test_split_downloaded'] and not inputs['task_identities_problem_solution_emitted']

selection = load(base / 'control-selection.json')
instance = selection['control_metadata']['instance_id']
smoke = load(base / 'linux/smoke-inputs.json')
assert smoke['input_sha256'] == selection['input_sha256']
assert sha((root / '.tmp/gate25/data/control.json').read_bytes()) == selection['input_sha256']
assert sha((native / 'gate25-smoke/control.json').read_bytes()) == selection['input_sha256']
assert smoke['actor_task'] is False and not selection['new_actor_problem_reference_emitted']
assert (base / 'linux/image-before.json').read_bytes() == (base / 'linux/image-after.json').read_bytes()
image = load(base / 'linux/image-before.json')
assert image == smoke['image'] and image['os'] == 'linux' and image['architecture'] == 'amd64'
assert image['digests'] and image['digests'][0].endswith('@' + image['id'])
base_tests = load(base / 'linux/base/report.json')['tests_status']
gold_tests = load(base / 'linux/gold/report.json')['tests_status']
assert len(base_tests['FAIL_TO_PASS']['failure']) == len(gold_tests['FAIL_TO_PASS']['success']) == 2
assert set(base_tests['FAIL_TO_PASS']['failure']) == set(gold_tests['FAIL_TO_PASS']['success'])
assert not base_tests['FAIL_TO_PASS']['success'] and not gold_tests['FAIL_TO_PASS']['failure']
assert len(base_tests['PASS_TO_PASS']['success']) == len(gold_tests['PASS_TO_PASS']['success']) == 671
assert set(base_tests['PASS_TO_PASS']['success']) == set(gold_tests['PASS_TO_PASS']['success'])
assert not base_tests['PASS_TO_PASS']['failure'] and not gold_tests['PASS_TO_PASS']['failure']
for arm, resolved in [('base', False), ('gold', True)]:
    summary = load(base / 'linux' / arm / 'summary.json')
    report = load(base / 'linux' / arm / 'report.json')
    assert summary == {'resolved': int(resolved), 'unresolved': int(not resolved), 'total': 1,
                       'ids_resolved': [instance] if resolved else [],
                       'ids_unresolved': [] if resolved else [instance]}
    assert report['resolved'] is resolved and report['patch_exists']
    output = (base / 'linux' / arm / 'test_output.txt').read_text(encoding='utf-8')
    assert ('673 passed, 2 skipped' if resolved else '2 failed, 671 passed, 2 skipped') in output
    log = (base / 'linux' / arm / 'run_instance.log').read_text(encoding='utf-8')
    assert 'removed.' in log and 'Grading answer' in log
assert (base / 'linux/base/eval.sh').read_bytes() == (base / 'linux/gold/eval.sh').read_bytes()
vendor = load(base / 'harness-source.json')
assert sha((root / '.tmp/gate25/data/swesmith-harness.tar.gz').read_bytes()) == vendor['archive_sha256']
installed = (base / 'linux/installed.txt').read_text()
assert 'swebench==4.1.0' in installed and (base / 'linux/help.stderr').stat().st_size == 0
assert b'--predictions_path' in (base / 'linux/help.stdout').read_bytes()

previous = load(root / 'reports/restoration/gate24/audit.json')
sources = sorted((root / 'src').rglob('*.rs')) + [root / 'Cargo.toml', root / 'Cargo.lock', root / 'config/retrieval-models.json']
for path in sources:
    raw = path.read_bytes().replace(b'\r\n', b'\n')
    assert raw == (native / 'source' / path.relative_to(root)).read_bytes().replace(b'\r\n', b'\n')
    assert raw == subprocess.check_output(['git', 'show', 'a7e4b1c:' + path.relative_to(root).as_posix()], cwd=root).replace(b'\r\n', b'\n')
for platform, path in [('windows', root / 'target/release/ixos.exe'), ('linux', native / 'source/target/release/ixos')]:
    assert sha(path.read_bytes()) == previous[platform + '_binary_sha256']
frozen = sha(json.dumps({p.relative_to(root).as_posix(): sha(p.read_bytes()) for p in sorted((root / 'eval').glob('*.py'))}, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode())
assert frozen == previous['frozen_evaluator_sha256']
result = {'status': 'passed', 'captured_files': len(capture['files']), 'training_rows': 50908,
          'verified_nonempty_image_name_rows': image_rows, 'base_regression_failures': 2,
          'gold_regression_passes': 2, 'unchanged_passing_tests': 671, 'skipped_tests_each_arm': 2,
          'image_contents_stable': True, 'image': image, 'harness_commit': vendor['commit'],
          'normalized_unchanged_sources': len(sources), 'new_actor_tasks': 0,
          'windows_binary_sha256': previous['windows_binary_sha256'], 'linux_binary_sha256': previous['linux_binary_sha256'],
          'frozen_evaluator_sha256': frozen,
          'helpers': {p.name: sha(p.read_bytes()) for p in sorted(base.glob('*.py'))},
          'boundary': 'Synthetic development data/environment proof, not an Ixos-generated fix, human task score or retrieval gain.'}
(base / 'audit.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': 'passed', 'training_rows': image_rows, 'base_failed_gold_passed': 2,
                  'unchanged_passed': 671, 'new_actor_tasks': 0}))
