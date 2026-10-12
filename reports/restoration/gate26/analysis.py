"""Separate observed mutation coverage, repair outcomes and open-loop effects."""
import json
from pathlib import Path
import re
import sys

base = Path(__file__).resolve().parent
root = base.parents[2]
sys.path.insert(0, str(root))
from scripts.code_tasks.contract import line_range
from scripts.code_tasks.patch_reference import old_changed_lines
from scripts.qasper.contract import intersection, sha, union

load = lambda path: json.loads(path.read_text(encoding='utf-8'))
binding = load(base / 'grading-inputs.json')
assert sha((base / 'freeze.json').read_bytes()) == binding['freeze_sha256']
data_path = root / '.tmp/gate26/grading/instances.json'
assert sha(data_path.read_bytes()) == binding['instances_sha256']
references = {row['instance_id']: row for row in load(data_path)}
frozen = load(base / 'freeze.json')
native = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
case_rows = []


def reverse_same_file_patch(patch):
    reversed_lines = []
    for line in patch.splitlines(keepends=True):
        if line.startswith('--- a/'):
            reversed_lines.append('+++ b/' + line[6:])
        elif line.startswith('+++ b/'):
            # Keep the standard --- / +++ header order.
            previous = reversed_lines.pop()
            reversed_lines.extend(['--- a/' + line[6:], previous])
        elif line.startswith('@@ '):
            match = re.match(r'@@ -(\d+)(,\d+)? \+(\d+)(,\d+)? @@(.*)', line)
            assert match
            reversed_lines.append(f'@@ -{match[3]}{match[4] or ""} +{match[1]}{match[2] or ""} @@{match[5]}\n')
        elif line.startswith('+'):
            reversed_lines.append('-' + line[1:])
        elif line.startswith('-'):
            reversed_lines.append('+' + line[1:])
        else:
            reversed_lines.append(line)
    return ''.join(reversed_lines)


def mutation_lines(patch, source):
    targets = []
    name = None
    current = None
    for line in patch.splitlines():
        if line.startswith('+++ b/'):
            name = line[6:]
        elif line.startswith('@@ '):
            match = re.match(r'@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@', line)
            assert match and name
            current = int(match[1])
        elif current is not None and line.startswith('+'):
            content = line[1:]
            if content.strip() and not content.lstrip().startswith('#'):
                assert line_range(source, name, current, current)[2] == content
                targets.append((name, current))
            current += 1
        elif current is not None and line.startswith(' '):
            current += 1
    return targets


def coverage(targets, ranges, source):
    total = len(targets)
    hits = 0
    for name, line in targets:
        start, end, _ = line_range(source, name, line, line)
        exposed = union((a, b) for path, a, b in ranges if path == name)
        hits += intersection(exposed, start, end) == end - start
    return {'exposed_mutated_code_lines': hits, 'total_mutated_code_lines': total}


for case in frozen['cases']:
    actor = load(base / case['folder'] / 'receipt.json')
    reference = references[case['instance_id']]
    source = Path(actor['task']['root'])
    patch = reference['patch']
    # The established strict reference reader independently checks all reversed
    # hunk contexts/counts against the actual buggy source before line metrics.
    strict = old_changed_lines(reverse_same_file_patch(patch), source)
    targets = mutation_lines(patch, source)
    initial = actor['calls'][0]['exposed_ranges']
    observed = [span for call in actor['calls'] for span in call['exposed_ranges']]
    case_rows.append({'case': case['case'], 'instance_id': case['instance_id'],
        'mutated_code_lines': targets, 'reverse_changed_and_insertion_anchors': strict,
        'initial': coverage(targets, initial, source), 'observed': coverage(targets, observed, source),
        'note': 'Added nonblank/noncomment corruption lines, not independent bugs or behavioral correctness. All source strings match actual coordinates.'})

replay = load(base / 'replay/receipt.json')
replay_rows = []
for run in replay['runs']:
    entry = {'case': run['case'], 'arm': run['arm'], 'wire_tokens': run['wire_tokens'], 'searches': []}
    for request in run['requests']:
        if request['request']['op'] == 'search':
            entry['searches'].append({'id': request['request']['id'], 'results': [
                {'path': row['path'], 'start_line': row['view']['start_line'], 'end_line': row['view']['end_line']}
                for row in request['response']['results']],
                'feedback_consumed': request['stats']['feedbackConsumed'],
                'inspection': request['stats'].get('inspection'),
                'native_cache_hits': request['stats']['nativeCacheHits'],
                'memory_cache_hits': request['stats']['memoryCacheHits']})
    replay_rows.append(entry)
result = {'case_mutation_coverage': case_rows, 'open_loop': replay_rows,
          'actor_wire_tokens': {kind: sum(row['wire_tokens'][kind] for row in frozen['sessions'])
                                for kind in ('stdin', 'stdout', 'stderr')},
          'actor_attempted_requests': sum(row['attempted_cli_requests'] for row in frozen['sessions']),
          'actor_error_responses': sum(row['error_responses'] for row in frozen['sessions']),
          'boundary': 'Two valid synthetic consumed development cases, one empty-input case retained. Mutation exposure and test fixes are distinct; source visibility does not establish knowing intended defaults/fallback behavior. Replays are fixed observed calls, not independent agents or new samples.'}
(base / 'analysis.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'cases': [{'case': row['case'], 'initial': row['initial'], 'observed': row['observed']} for row in case_rows],
                  'open_loop_processes': len(replay_rows), 'wire_tokens': result['actor_wire_tokens']}))
