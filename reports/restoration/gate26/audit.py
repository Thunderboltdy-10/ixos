"""Independently check frozen actor costs, source exposure and official grades."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import tiktoken

base = Path(__file__).resolve().parent
root = base.parents[2]
native = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
sys.path.insert(0, str(root))
from eval.artifacts import artifact_identity
from scripts.code_tasks.contract import citation_ranges, exposed
from scripts.qasper.cache_probe import state
from scripts.qasper.contract import canonical

sha = lambda raw: hashlib.sha256(raw).hexdigest()
load = lambda path: json.loads(path.read_text(encoding='utf-8'))
encoding = tiktoken.get_encoding('cl100k_base')
count = lambda raw: len(encoding.encode(raw, disallowed_special=()))
capture = load(base / 'capture.json')
for name, expected in capture['files'].items():
    raw = (base / name).read_bytes()
    assert sha(raw) == expected['sha256'] and len(raw) == expected['bytes']
    assert raw == Path(expected['source']).read_bytes()

frozen = load(base / 'freeze.json')
for name, field in [('protocol.json', 'protocol_sha256'), ('selection.json', 'selection_sha256'),
                    ('preparation.json', 'preparation_sha256'), ('S03-format-amendment.json', 'amendment_sha256')]:
    assert sha((base / name).read_bytes()) == frozen[field]
assert not frozen['reference_fields_loaded'] and not frozen['validation_problem_reference_fields_loaded']
grading = load(base / 'grading-inputs.json')
assert sha((base / 'freeze.json').read_bytes()) == grading['freeze_sha256']
assert grading['references_opened_after_freeze'] and not grading['validation_references_loaded']
for name in ('instances', 'predictions'):
    raw = (root / '.tmp/gate26/grading' / (name + '.json')).read_bytes()
    assert sha(raw) == grading[name + '_sha256']
    assert raw == (native / 'gate26-grading' / (name + '.json')).read_bytes()
references = {r['instance_id']: r for r in load(root / '.tmp/gate26/grading/instances.json')}
selection = load(base / 'selection.json')
assert not selection['problem_patch_test_fields_loaded']
assert len({r['canonical_repository'] for r in selection['selected']}) == 6
assert [r['role'] for r in selection['selected']] == ['development'] * 3 + ['validation'] * 3
assert set(references) == {r['instance_id'] for r in frozen['cases']}

preparation = load(base / 'preparation.json')
assert sha((root / '.tmp/gate26/task-manifest.json').read_bytes()) == preparation['task_manifest_sha256']
exports = load(base / 'linux/exports.json')
assert sha((base / 'linux/exports.json').read_bytes()) == preparation['export_receipt_sha256']
assert exports['helper_sha256'] == sha((base / 'export_sources.py').read_bytes())
for task, exported in zip(preparation['tasks'], exports['exports'], strict=True):
    assert task['id'] == exported['case'] and task['source_commit'] == exported['source_commit']
    raw = (native / 'gate26/exports' / task['id'] / 'source.tar').read_bytes()
    assert sha(raw) == exported['archive_sha256'] == task['archive_sha256']
    assert len(raw) == exported['archive_bytes']
    assert exported['original_tracked_source_clean'] and exported['container_removed']
    inventory = load(base / f'{task["id"]}-source-inventory.json')
    assert canonical(inventory) == task['inventory_identity'] and len(inventory) == task['source_files']
    assert sum(v['bytes'] for v in inventory.values()) == task['source_bytes']
    corpus = root / '.tmp/gate26/sources' / task['id']
    assert {p.relative_to(corpus).as_posix() for p in corpus.rglob('*') if p.is_file()} == set(inventory)
    for name, item in inventory.items():
        raw = (corpus / name).read_bytes()
        assert sha(raw) == item['sha256'] and len(raw) == item['bytes']

totals = {kind: 0 for kind in ('stdin', 'stdout', 'stderr')}
attempts = errors = successful = 0
for session in frozen['sessions']:
    folder = base / session['folder']
    assert sha((folder / 'receipt.json').read_bytes()) == session['receipt_sha256']
    assert sha((folder / 'wire.jsonl').read_bytes()) == session['wire_sha256']
    actor = load(folder / 'receipt.json')
    source = Path(actor['task']['root'])
    assert actor['source_preserved'] and state(source) == actor['sources']
    assert not actor['references_loaded_by_actor']
    packets = [json.loads(line) for line in (folder / 'wire.jsonl').read_text(encoding='utf-8').splitlines()]
    wire_counts = {kind: sum(count(p['raw']) for p in packets if p['stream'] == kind) for kind in totals}
    assert wire_counts == session['wire_tokens']
    for kind in totals:
        totals[kind] += wire_counts[kind]
    inputs = [json.loads(p['raw']) for p in packets if p['stream'] == 'stdin']
    outputs = [json.loads(p['raw']) for p in packets if p['stream'] == 'stdout']
    assert len(inputs) == len(outputs) == session['attempted_cli_requests']
    assert sum(v.get('type') == 'error' for v in outputs) == session['error_responses']
    attempts += len(inputs)
    errors += session['error_responses']
    for packet in packets:
        if packet['stream'] == 'stdout':
            assert len(packet['raw'].encode('utf-8')) <= 6000
    for call in actor['calls']:
        matching = [v for q, v in zip(inputs, outputs, strict=True) if q == call['request']]
        assert len(matching) == 1 and matching[0].get('type') != 'error'
        assert exposed(matching[0], source) == call['exposed_ranges']
        successful += 1
    if actor.get('submission'):
        assert citation_ranges(actor['submission']['citations'], actor['calls'], source)
assert attempts == 11 and errors == 2 and successful == 9
assert totals == {'stdin': 1143, 'stdout': 4843, 'stderr': 1728}
assert load(base / 'S02/receipt.json')['task']['problem_statement'] == ''
assert len(frozen['unusable_cases']) == 1

exports_by_id = {row['instance_id']: row for row in exports['exports']}
for row in load(base / 'linux/preflight.json'):
    exported = exports_by_id[row['instance_id']]
    assert row['public_mirror'] and row['source_commit'] == exported['source_commit']
    assert row['image_id'] == exported['image_id']
for row in load(base / 'linux/images-after.json'):
    exported = exports_by_id[row['instance_id']]
    assert row['id'] == exported['image_id'] and row['digests'] == exported['repo_digests']
assert load(base / 'linux/grading-source.json')['helper_sha256'] == sha((base / 'grade_native.py').read_bytes())
grades = []
for case in frozen['cases']:
    name, instance = case['case'], case['instance_id']
    assert isinstance(references[instance]['FAIL_TO_PASS'], list)
    assert isinstance(references[instance]['PASS_TO_PASS'], list)
    f2p = set(references[instance]['FAIL_TO_PASS'])
    p2p = set(references[instance]['PASS_TO_PASS'])
    assert sha(case['repair_patch'].encode()) == case['patch_sha256']
    assert (base / 'linux/actor' / name / 'patch.diff').read_bytes() == case['repair_patch'].encode()
    case_grades = {}
    for arm in ('base', 'gold', 'actor'):
        folder = base / 'linux' / arm / name
        report = load(folder / 'report.json')
        assert report['patch_exists'] and report['resolved'] is (arm == 'gold')
        tests = report['tests_status']
        for kind, expected in [('FAIL_TO_PASS', f2p), ('PASS_TO_PASS', p2p)]:
            success, failure = map(set, (tests[kind]['success'], tests[kind]['failure']))
            assert not success & failure and success | failure == expected
        assert not tests['PASS_TO_PASS']['failure']
        assert not tests['FAIL_TO_FAIL']['success'] and not tests['FAIL_TO_FAIL']['failure']
        assert not tests['PASS_TO_FAIL']['success'] and not tests['PASS_TO_FAIL']['failure']
        if arm == 'base':
            assert set(tests['FAIL_TO_PASS']['failure']) == f2p
        elif arm == 'gold':
            assert set(tests['FAIL_TO_PASS']['success']) == f2p
        log = (folder / 'run_instance.log').read_text(encoding='utf-8')
        assert 'cleanly.' in log and 'removed.' in log and 'Grading answer' in log
        assert ' - ERROR - ' not in log and 'timed out' not in log.lower()
        successes = len(tests['FAIL_TO_PASS']['success']) + len(p2p)
        failures = len(tests['FAIL_TO_PASS']['failure'])
        output = (folder / 'test_output.txt').read_text(encoding='utf-8')
        assert (f'{failures} failed, {successes} passed' if failures else f'{successes} passed') in output
        assert (folder / 'eval.sh').read_bytes() == (base / 'linux/base' / name / 'eval.sh').read_bytes()
        case_grades[arm] = {'regressions_pass': len(tests['FAIL_TO_PASS']['success']),
            'regressions_fail': failures, 'other_pass': len(p2p), 'resolved': report['resolved']}
    grades.append({'case': name, 'arms': case_grades})
for arm in ('base', 'gold', 'actor'):
    summary = load(base / 'linux' / arm / 'summary.json')
    assert summary['total'] == 2 and summary['resolved'] == (2 if arm == 'gold' else 0)
    assert set(summary['ids_resolved'] + summary['ids_unresolved']) == set(references)

replay_runs = []
for relative, helper in [('replay', 'replay.py'), ('replay-lexical', 'replay_lexical.py')]:
    master = load(base / relative / 'receipt.json')
    assert master['helper_sha256'] == sha((base / helper).read_bytes())
    assert master['binary_sha256'] == sha((root / 'target/release/ixos.exe').read_bytes())
    for run in master['runs']:
        arm = run['arm']
        folder = base / relative / run['case']
        if relative == 'replay':
            folder /= arm
        assert load(folder / 'receipt.json') == run
        packets = [json.loads(line) for line in (folder / 'wire.jsonl').read_text(encoding='utf-8').splitlines()]
        assert {kind: sum(count(p['raw']) for p in packets if p['stream'] == kind) for kind in totals} == run['wire_tokens']
        actor_folder = 'S01-recovery' if run['case'] == 'S01' else 'S03'
        actor = load(base / actor_folder / 'receipt.json')
        source = Path(actor['task']['root'])
        assert run['source_preserved'] and state(source) == actor['sources']
        control = load(base / 'replay' / run['case'] / 'off/receipt.json')
        for entry, control_entry in zip(run['requests'], control['requests'], strict=True):
            exposed(entry['response'], source)
            if entry['request']['op'] in ('read', 'grep'):
                stripped = dict(entry['response'])
                stripped.pop('remembered', None)
                assert stripped == control_entry['response']
            else:
                stats = entry['stats']
                if arm == 'lexical-off':
                    assert stats['modelFingerprint'] is None and stats['passagesEmbedded'] == 0
                elif entry['request']['id'] == 'q1':
                    assert stats['nativeCacheHits'] == stats['searchableFiles'] and stats['cacheWrites'] == 0
                else:
                    assert stats['memoryCacheHits'] == stats['searchableFiles']
                feedback = entry['request'].get('feedback')
                if feedback:
                    shown = next(r['response'] for r in run['requests'] if r['request']['id'] == feedback['query_id'])
                    eligible = shown.get('remembered', list(range(len(shown.get('results', [])))))
                    assert feedback['accepted'] and all(i in eligible for i in feedback['accepted'])
                    assert stats['feedbackConsumed']
        replay_runs.append({'case': run['case'], 'arm': arm, 'requests': len(run['requests']), 'wire_tokens': run['wire_tokens']})
model = root / '.tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded'
assert artifact_identity(model) == load(base / 'replay/receipt.json')['model']
availability = load(base / 'query-availability.json')
assert availability['rows'] == 50908 and availability['aggregate'] == {
    'usable_nonempty_utf8_le65536': 39471, 'blank_or_missing': 11437, 'oversized': 0, 'unexpected_type': 0}

previous = load(root / 'reports/restoration/gate25/audit.json')
sources = sorted((root / 'src').rglob('*.rs')) + [root / 'Cargo.toml', root / 'Cargo.lock', root / 'config/retrieval-models.json']
for path in sources:
    raw = path.read_bytes().replace(b'\r\n', b'\n')
    assert raw == (native / 'source' / path.relative_to(root)).read_bytes().replace(b'\r\n', b'\n')
    assert raw == subprocess.check_output(['git', 'show', '868876f:' + path.relative_to(root).as_posix()], cwd=root).replace(b'\r\n', b'\n')
for platform, path in [('windows', root / 'target/release/ixos.exe'), ('linux', native / 'source/target/release/ixos')]:
    assert sha(path.read_bytes()) == previous[platform + '_binary_sha256']
evaluator = sha(json.dumps({p.relative_to(root).as_posix(): sha(p.read_bytes()) for p in sorted((root / 'eval').glob('*.py'))}, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode())
assert evaluator == previous['frozen_evaluator_sha256']
result = {'status': 'passed', 'captured_files': len(capture['files']), 'attempted_actor_requests': attempts,
    'actor_errors': errors, 'successful_actor_calls': successful, 'actor_wire_tokens': totals,
    'graded_cases': grades, 'actor_resolved': 0, 'base_resolved': 0, 'gold_resolved': 2,
    'unusable_input_cases': 1, 'replay': replay_runs, 'normalized_unchanged_sources': len(sources),
    'windows_binary_sha256': previous['windows_binary_sha256'], 'linux_binary_sha256': previous['linux_binary_sha256'],
    'frozen_evaluator_sha256': evaluator, 'helpers': {p.name: sha(p.read_bytes()) for p in sorted(base.glob('*.py'))},
    'boundary': 'Two consumed synthetic development cases. Partial test repairs are not complete task resolution; fixed-call replays are not independent agent A/B. Validation content remains unopened.'}
(base / 'audit.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': 'passed', 'actor_resolved': 0, 'gold_resolved': 2,
    'actor_regressions_fixed': sum(r['arms']['actor']['regressions_pass'] for r in grades),
    'other_passing_tests_preserved': sum(r['arms']['actor']['other_pass'] for r in grades),
    'attempts': attempts, 'replay_processes': len(replay_runs)}))
