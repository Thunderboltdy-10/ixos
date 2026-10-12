"""Aggregate test-path availability without emitting new actor references."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shlex

import pyarrow.parquet as pq


def changed_paths(patch):
    paths = set()
    for line in patch.splitlines():
        if not line.startswith('diff --git '):
            continue
        parts = shlex.split(line[11:])
        if len(parts) != 2 or not parts[0].startswith('a/') or not parts[1].startswith('b/'):
            raise ValueError('Unsupported diff header; no code/path content emitted')
        paths.add(parts[1][2:])
    return paths


def is_python_test(path):
    p = PurePosixPath(path)
    return p.suffix == '.py' and (
        'tests' in p.parts or 'test' in p.parts or
        p.name.startswith('test_') or p.name.endswith('_test.py'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Use a new discovery receipt')
    expected = '0ba403a7060af657e1f0476937a703726c07da15b759836694b16e553705a10f'
    digest = hashlib.sha256(args.input.read_bytes()).hexdigest()
    assert digest == expected
    # No instance, repository, problem, hint or expected-test-name column is loaded.
    table = pq.read_table(args.input, columns=['patch'])
    counts = Counter()
    for row in table.to_pylist():
        patch = row['patch'] or ''
        counts['rows'] += 1
        if not patch.strip():
            counts['empty_patch_rows'] += 1
            continue
        counts['nonempty_patch_rows'] += 1
        try:
            paths = changed_paths(patch)
        except ValueError:
            counts['unsupported_header_rows'] += 1
            continue
        tests = {p for p in paths if is_python_test(p)}
        production = {p for p in paths if p.endswith('.py') and not is_python_test(p)}
        if tests:
            counts['rows_with_candidate_python_test_paths'] += 1
            counts['candidate_python_test_paths_occurrences'] += len(tests)
        if production:
            counts['rows_with_other_python_paths'] += 1
        if tests and production:
            counts['rows_with_candidate_tests_and_other_python_paths'] += 1
        if tests and re.search(r'^\+\s*(?:async\s+)?def\s+test_', patch, re.M):
            counts['rows_with_test_path_and_added_test_definition_signal'] += 1
    result = {'input_sha256': digest, 'helper_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'columns_loaded': ['patch'], 'aggregate': dict(counts),
              'individual_task_path_reference_content_emitted': False,
              'boundary': 'Filename/added-definition heuristics only; no verified executable tests, repo selection, actor labels or success score.'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
