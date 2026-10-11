"""Pinned ContextBench development tasks with coordinate and source-content audits.

This is retrieval-only adaptation, not the upstream agent/symbol/byte leaderboard.
Queries use the issue statement verbatim; patch, hints and gold never reach source
preparation or retrieval. Downloaded sources/annotations remain outside Git.
"""
from __future__ import annotations

import argparse
from collections import Counter
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile
import urllib.request

from eval.contract import ContractError, canonical_hash, digest, interval, load_dataset, relative_path, union
from eval.public import TEXT_EXTENSIONS

REVISION = 'c2855792b006af41c67202d33883fb9d46362853'
DATA_FILE = 'data/contextbench_verified_train.parquet'
DATA_SHA = 'cd1bc4ddefa69271d4f073f31d54bf33a1c5671800211d9db7e6a3c24435a75d'
DATA_BYTES = 15081815
METADATA = ['instance_id', 'original_inst_id', 'repo', 'language', 'base_commit', 'source']
READ_COLUMNS = METADATA + ['problem_statement', 'gold_context']
EXTENSIONS = TEXT_EXTENSIONS | {'.cc', '.cxx', '.hh', '.hxx', '.mjs', '.cjs', '.vue', '.svelte', '.rst', '.proto', '.cmake'}
SKIP = {'node_modules', 'vendor', 'target', 'dist', '__pycache__', 'venv', 'bower_components', 'coverage'}
MAX_FILE = 16 * 1024 * 1024
MAX_CORPUS = 256 * 1024 * 1024
MAX_DOWNLOAD = 128 * 1024 * 1024


def fetch(url: str, maximum: int) -> bytes:
    request = urllib.request.Request(url, headers={'User-Agent': 'Ixos-context-eval/1'})
    with urllib.request.urlopen(request, timeout=120) as response:
        data = response.read(maximum + 1)
    if len(data) > maximum:
        raise ContractError('Download exceeded declared limit')
    return data


def normalize_gold_path(value: str) -> str:
    if not isinstance(value, str):
        raise ContractError('Annotation file must be a string')
    if value.startswith('/testbed/'):
        value = value[len('/testbed/'):]
    elif value.startswith('/workspace/'):
        parts = value[len('/workspace/'):].split('/', 1)
        if len(parts) != 2:
            raise ContractError('Workspace annotation lacks a repository-relative file')
        value = parts[1]
    while value.startswith('./'):
        value = value[2:]
    return relative_path(value)


def source_lines(data: bytes) -> list[str]:
    lines = data.decode('utf-8').split('\n')
    if lines[-1] == '':
        lines.pop()
    return [line.removesuffix('\r') for line in lines]


def gold_rows(raw: str, root: Path, known: set[str], policy: str = 'strict') -> tuple[list[dict], dict]:
    if policy not in {'strict', 'upstream-compatible'}:
        raise ContractError('Unknown annotation coordinate policy')
    annotations = json.loads(raw)
    if not isinstance(annotations, list) or not annotations:
        raise ContractError('Task must have nonempty annotated context')
    merged = {}
    content_checks = Counter()
    for item in annotations:
        if not isinstance(item, dict) or not {'file', 'start_line', 'end_line'} <= item.keys():
            raise ContractError('Missing context coordinates')
        path = normalize_gold_path(item['file'])
        if path not in known:
            raise ContractError('Gold source absent from independent corpus policy: ' + path)
        lines = source_lines((root / path).read_bytes())
        original = [item['start_line'], item['end_line']]
        if policy == 'strict':
            start, end = interval(original, len(lines))
        else:
            # Pinned upstream core/fileio.py clamps start to 1 and end to at
            # least start, then reads to EOF when end exceeds base-file length.
            # This is a declared label interpretation, never a source rewrite.
            if any(type(value) is not int for value in original):
                raise ContractError('Expected integer upstream coordinates')
            start = max(1, original[0])
            end = min(len(lines), max(start, original[1]))
            merged.setdefault(path, [])  # retain file relevance even without a base span
            if start > len(lines):
                content_checks['span_outside_base_source'] += 1
                continue
            if [start, end] != original:
                content_checks['coordinates_normalized_as_upstream'] += 1
        # Preserve coordinates; never infer a replacement span from its content.
        # Upstream tool captures can prefix "LINE\t" and trim indentation. Only
        # exact or per-line whitespace-only presentation differences are allowed.
        if 'content' in item and item['content']:
            if not isinstance(item['content'], str):
                raise ContractError('Annotation content must be text')
            content = item['content'].split('\n')
            if content[-1] == '':
                content.pop()
            normalized = []
            for offset, line in enumerate(content):
                prefix = str(start + offset) + '\t'
                normalized.append(line[len(prefix):] if line.startswith(prefix) else line.removesuffix('\r'))
            expected = lines[start - 1:end]
            if normalized == expected:
                content_checks['exact_or_numbered'] += 1
            elif [line.strip() for line in normalized] == [line.strip() for line in expected]:
                content_checks['line_whitespace_presentation_only'] += 1
            else:
                if policy == 'strict':
                    raise ContractError(f'Annotation content differs from pinned source at {path}:{start}-{end}')
                content_checks['content_differs_from_base_source'] += 1
        else:
            content_checks['content_not_provided'] += 1
        merged.setdefault(path, []).append((start, end))
    return [{'path': path, 'grade': 1, 'spans': [list(span) for span in union(spans)]}
            for path, spans in sorted(merged.items())], dict(content_checks)


def prepare_corpus(archive_bytes: bytes, folder: Path) -> tuple[list[dict], dict]:
    """Query/gold-independent inventory; never extract links or remote paths."""
    root = folder / 'corpus'
    if root.exists():
        raise ContractError('Use a fresh corpus; never merge inventories')
    root.mkdir(parents=True)
    sources = []
    skipped = Counter()
    total = 0
    seen = set()
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode='r:gz') as archive:
        for member in sorted(archive.getmembers(), key=lambda item: item.name):
            if not member.isfile():
                skipped['non_regular'] += 1
                continue
            parts = member.name.split('/', 1)
            if len(parts) != 2:
                raise ContractError('Archive has no repository root')
            path = relative_path(parts[1])
            components = Path(path).parts
            if any(part.startswith('.') or part in SKIP for part in components):
                skipped['hidden_or_dependency'] += 1
                continue
            name = Path(path).name
            attribution = len(components) == 1 and name.upper().startswith(('LICENSE', 'COPYING', 'NOTICE'))
            special = name in {'Makefile', 'CMakeLists.txt'} or attribution
            if Path(path).suffix.lower() not in EXTENSIONS and not special:
                skipped['extension_policy'] += 1
                continue
            if member.size > MAX_FILE:
                raise ContractError('Eligible file exceeds engine input limit: ' + path)
            stream = archive.extractfile(member)
            data = stream.read(MAX_FILE + 1) if stream else b''
            if len(data) != member.size:
                raise ContractError('Archive member size differs')
            try:
                text = data.decode('utf-8')
            except UnicodeDecodeError:
                skipped['non_utf8'] += 1
                continue
            if not text.strip() or '\x00' in text:
                skipped['empty_or_binary'] += 1
                continue
            key = path.casefold()
            if key in seen:
                raise ContractError('Duplicate/case-colliding archive source: ' + path)
            seen.add(key)
            total += len(data)
            if total > MAX_CORPUS:
                raise ContractError('Eligible corpus exceeds engine input budget')
            target = root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            sources.append({'path': path, 'sha256': digest(data)})
            if attribution:
                (folder / ('UPSTREAM-' + name)).write_bytes(data)
    if not sources:
        raise ContractError('No eligible text sources')
    return sources, {'source_bytes': total, 'skipped': dict(skipped), 'policy': 'contextbench-code-text-v1',
                     'extensions': sorted(EXTENSIONS), 'excluded_components': sorted(SKIP),
                     'limits': {'file_bytes': MAX_FILE, 'corpus_bytes': MAX_CORPUS}}


def isolate_parent_ignores(destination: Path) -> None:
    """Give only the new evaluation container a Git boundary, outside corpora.

    Otherwise the host checkout's build/dist/fixture ignores can alter a pinned
    foreign corpus. Runtime search still honors parent ignores for real users.
    No Git metadata is created by Ixos in user folders or inside source corpora.
    """
    destination.mkdir(parents=True, exist_ok=False)
    subprocess.run(['git', 'init', '--quiet', str(destination)], capture_output=True, check=True)


def check_plan(plan: dict) -> None:
    if (plan.get('schema'), plan.get('dataset'), plan.get('revision'), plan.get('file'),
        plan.get('sha256'), plan.get('bytes'), plan.get('rows')) != (
            1, 'Contextbench/ContextBench', REVISION, DATA_FILE, DATA_SHA, DATA_BYTES, 450):
        raise ContractError('Unsupported unpinned dataset plan')
    instances = plan.get('instances')
    if not isinstance(instances, list) or not instances:
        raise ContractError('An explicit metadata-only task selection is required')
    ids = set()
    for item in instances:
        if item.get('split') != 'dev':
            raise ContractError('This first adapter supports development diagnostics only')
        if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', item.get('repository', '')):
            raise ContractError('Expected explicit canonical GitHub repository')
        if not re.fullmatch(r'[0-9a-f]{40}', item.get('base_commit', '')):
            raise ContractError('Source revision must be a full commit hash')
        identifier = item.get('instance_id')
        relative_path(identifier)
        if identifier in ids:
            raise ContractError('Repeated task selection')
        ids.add(identifier)


def prepare(plan: dict, parquet: Path, destination: Path, receipt_path: Path, policy: str = 'strict') -> dict:
    check_plan(plan)
    if parquet.stat().st_size != DATA_BYTES or digest(parquet.read_bytes()) != DATA_SHA:
        raise ContractError('Dataset size/hash differs from frozen upstream revision')
    if destination.exists():
        raise ContractError('Use a new destination; preserve previous preparation failures')
    import pyarrow.parquet as pq
    # Reading only these columns keeps solution patches/hints out of the adapter.
    table = pq.read_table(parquet, columns=READ_COLUMNS)
    if len(table) != plan['rows']:
        raise ContractError('Dataset row count differs')
    rows = {row['instance_id']: row for row in table.to_pylist()}
    if len(rows) != len(table):
        raise ContractError('Upstream task IDs are duplicated')
    isolate_parent_ignores(destination)
    receipt = {'schema': 1, 'plan_sha256': canonical_hash(plan), 'dataset_sha256': DATA_SHA,
               'dataset_revision': REVISION, 'selection_before_gold': plan['selection_method'],
               'query_policy': plan['query_policy'], 'planned_tasks': len(plan['instances']),
               'quality_benchmark': False, 'coordinate_policy': policy,
               'upstream_coordinate_reference': 'https://github.com/EuniAI/ContextBench/blob/1436c28a8eb95496da4ea69ad458b9f8a8eb7d61/contextbench/core/fileio.py',
               'ignore_boundary': 'Fresh empty Git boundary on the evaluation container, outside every corpus, isolates host-repository ancestor ignore rules. Global rules remain subject to production coverage checks.',
               'tasks': []}
    for item in plan['instances']:
        result = {'instance_id': item['instance_id'], 'repository': item['repository'], 'language': item['language']}
        receipt['tasks'].append(result)
        try:
            row = rows[item['instance_id']]
            if any(row[field] != item[field] for field in METADATA):
                raise ContractError('Selected task metadata differs from frozen plan')
            folder = destination / item['instance_id']
            url = f"https://codeload.github.com/{item['repository']}/tar.gz/{item['base_commit']}"
            archive = fetch(url, MAX_DOWNLOAD)
            result.update({'archive_url': url, 'archive_sha256': digest(archive), 'source_revision': item['base_commit']})
            sources, corpus_policy = prepare_corpus(archive, folder)
            result.update(corpus_policy)
            gold, content_checks = gold_rows(row['gold_context'], folder / 'corpus', {s['path'] for s in sources}, policy)
            query = {'id': row['instance_id'], 'text': row['problem_statement'], 'group': item['repository'],
                     'split': 'dev', 'workload': 'code-agent', 'kind': item['language'] + '-issue-statement',
                     'answerability': 'answerable', 'gold': gold}
            manifest = {'schema': 1, 'id': 'contextbench-' + row['instance_id'], 'sources': sources, 'queries': [query],
                'provenance': {'origin': f'https://huggingface.co/datasets/Contextbench/ContextBench/resolve/{REVISION}/{DATA_FILE}',
                    'revision': item['base_commit'], 'label_method': 'Upstream verified human context, coordinate policy=' + policy + '; base-source content audits; no patch/hints in query',
                    'license': 'ContextBench upstream Apache-2.0 project; source retains repository license; raw sources/labels not redistributed in Git',
                    'limitations': 'Restricted code-text inventory; verbatim single issue retrieval and line-span metrics, not official byte/symbol/trajectory scores or task success. Inspected development only. Upstream-compatible mode clips base-source ranges like the upstream evaluator; captured annotation content can differ from base source and is audited separately.'}}
            path = folder / 'manifest.json'
            path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
            dataset = load_dataset(path, folder / 'corpus')
            result.update({'status': 'passed', 'manifest': str(path), 'root': str(folder / 'corpus'),
                           'manifest_sha256': dataset.fingerprint, 'sources': len(sources),
                           'gold_files': len(gold), 'annotation_checks': content_checks,
                           'query_sha256': digest(row['problem_statement'].encode('utf-8'))})
        except (ContractError, ValueError, OSError, KeyError, tarfile.TarError) as error:
            result.update({'status': 'failed', 'error': str(error)})
        receipt['status'] = 'failed' if any(r['status'] == 'failed' for r in receipt['tasks']) else 'passed'
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text(json.dumps(receipt, indent=2) + '\n')
        print(f"{result['instance_id']}: {result['status']}" + (': ' + result['error'] if result['status'] == 'failed' else ''), flush=True)
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, default=Path('eval/contextbench-dev-v1.json'))
    parser.add_argument('--parquet', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--coordinate-policy', choices=['strict', 'upstream-compatible'], default='strict')
    args = parser.parse_args()
    receipt = prepare(json.loads(args.plan.read_text()), args.parquet, args.destination, args.receipt, args.coordinate_policy)
    raise SystemExit(0 if receipt['status'] == 'passed' else 1)


if __name__ == '__main__':
    main()
