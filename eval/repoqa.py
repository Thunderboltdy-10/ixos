"""Pinned RepoQA supplied-source/function-coordinate adapter.

Metadata chooses repository-family splits before descriptions/targets are read.
Preparation emits a requested split only and refuses any inconsistent needle;
it never shifts ranges, drops difficult queries or reads a solution patch.
"""
import argparse
import gzip
import json
from pathlib import Path
import re

from eval.contract import ContractError, canonical_hash, digest, load_dataset, relative_path
from eval.contextbench import isolate_parent_ignores
from eval.run import bundle_check


REVISION = 'e3a571033de99d0b9dcaccd25577a75d4b1c70b1'
FILE = 'repoqa-2024-06-23.json.gz'
COMPRESSED_SHA = 'c050a2ad90a7df89d9dc1f1c3b3b20683edd20a56293b35fcaae43dec115d681'
GIT_BLOB = 'a0514a1f2c5cd20220c343a152a01db465a15153'
SEED = 'ixos-repoqa-family-v1/'
MAX_FILE = 16 * 1024 * 1024
MAX_CORPUS = 256 * 1024 * 1024
LANGUAGES = {'python', 'cpp', 'java', 'typescript', 'rust', 'go'}
SEEN = {'google/gson', 'expressjs/express', 'axios/axios', 'serde-rs/serde'}


def make_plan(metadata):
    if metadata.get('revision') != REVISION or metadata.get('compressed_sha256') != COMPRESSED_SHA:
        raise ContractError('Metadata does not describe the pinned official source release')
    if set(metadata.get('languages', {})) != LANGUAGES:
        raise ContractError('The pinned six-language release must remain complete')
    rows, excluded, seen = [], [], set()
    for language, value in sorted(metadata['languages'].items()):
        repositories = value['repositories_metadata']
        if len(repositories) != 10:
            raise ContractError('Expected ten upstream repositories per language')
        eligible = []
        for row in repositories:
            name = row['repo']
            if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', name) or name.casefold() in seen:
                raise ContractError('Malformed or repeated repository family')
            seen.add(name.casefold())
            if not re.fullmatch('[0-9a-f]{40}', row['commit_sha']):
                raise ContractError('Source revision must be an exact commit')
            item = {'repository': name, 'source_revision': row['commit_sha'], 'language': language}
            if name.casefold() in SEEN:
                excluded.append({**item, 'reason': 'Repository family already inspected in Semble/ContextBench restoration.'})
            else:
                eligible.append(item)
        if len(eligible) < 7:
            raise ContractError('Not enough fresh families for the declared split')
        eligible.sort(key=lambda row: digest((SEED + row['repository'].casefold()).encode()))
        for index, row in enumerate(eligible):
            rows.append({**row, 'split': 'dev' if index < 3 else 'validation' if index < 5 else 'test'})
    return {'schema': 1, 'dataset': 'RepoQA-supplied-source-function-lines-v1',
            'revision': REVISION, 'file': FILE, 'compressed_sha256': COMPRESSED_SHA,
            'seed': SEED, 'selection': 'Repository metadata only; SHA256(seed+casefold(repository)) per language. First3 dev, next2 validation, remainder held-out. All10 needles per included family.',
            'query': 'Verbatim upstream description only; no target names/paths, source snippet or function coordinates in query construction.',
            'coordinate_policy': 'Strict local UTF-8 bytes and physical LF lines; 0-based start_line/byte and exclusive end_byte, source-verified; no global byte coordinates.',
            'families': rows, 'excluded_previously_seen': excluded}


def checked_data(path):
    raw = path.read_bytes()
    if len(raw) > 16 * 1024 * 1024 or digest(raw) != COMPRESSED_SHA:
        raise ContractError('Compressed artifact differs from pinned SHA256 or size bound')
    with gzip.open(path, 'rb') as stream:
        decoded = stream.read(MAX_CORPUS + 1)
    if len(decoded) > MAX_CORPUS:
        raise ContractError('Decoded artifact exceeds its memory/input bound')
    value = json.loads(decoded)
    if set(value) != LANGUAGES:
        raise ContractError('Missing or unexpected upstream language')
    return value


def verified_span(needle, text, functions):
    """Cross-check local byte and line coordinates against exact supplied UTF-8."""
    if not isinstance(needle.get('name'), str) or not needle['name'].strip():
        raise ContractError('Missing function catalog name')
    for field in ['start_byte', 'end_byte', 'start_line', 'end_line']:
        if type(needle.get(field)) is not int or needle[field] < 0:
            raise ContractError('Invalid function coordinate')
    raw = text.encode('utf-8')
    start, end = needle['start_byte'], needle['end_byte']
    if not 0 <= start < end <= len(raw):
        raise ContractError('Function byte range is empty or outside supplied source')
    try:
        raw[:start].decode('utf-8')
        raw[start:end].decode('utf-8')
        raw[end:].decode('utf-8')
    except UnicodeDecodeError as error:
        raise ContractError('Function coordinate splits a UTF-8 character') from error
    first, last = raw[:start].count(b'\n') + 1, raw[:end-1].count(b'\n') + 1
    if (needle['start_line'] + 1, needle['end_line']) != (first, last):
        raise ContractError('Function local byte/line coordinates disagree')
    keys = ['name', 'start_byte', 'end_byte', 'start_line', 'end_line']
    if sum(all(row.get(key) == needle.get(key) for key in keys) for row in functions) != 1:
        raise ContractError('Needle does not uniquely match the supplied function catalog')
    description = needle.get('description')
    if not isinstance(description, str) or not description.strip() or len(description.encode()) > 65536:
        raise ContractError('Missing/oversized upstream function description')
    return (first, last), {'function_bytes': end - start, 'function_sha256': digest(raw[start:end]),
                           'description_sha256': digest(description.encode()),
                           'description_mentions_target_name': bool(needle['name'] and needle['name'] in description)}


def prepare(plan, data, split, destination, receipt_path, selection=None):
    if destination.exists() or receipt_path.exists():
        raise ContractError('Use fresh corpus and receipt paths; never merge or overwrite')
    if (plan.get('schema'), plan.get('revision'), plan.get('file'), plan.get('compressed_sha256'), plan.get('seed')) != (1, REVISION, FILE, COMPRESSED_SHA, SEED):
        raise ContractError('Plan differs from the pinned protocol')
    selected = [row for row in plan['families'] if row['split'] == split]
    if not selected or split not in {'dev', 'validation', 'test'}:
        raise ContractError('Empty or invalid requested split')
    if len({row['repository'].casefold() for row in plan['families']}) != len(plan['families']):
        raise ContractError('A family may appear in only one split')
    if split == 'test' and (not selection or selection.get('plan_sha256') != canonical_hash(plan)
                            or not selection.get('config_hashes') or not selection.get('model_fingerprints')
                            or not selection.get('binary_sha256')):
        raise ContractError('Freeze exact selected configurations/models/binary before preparing held-out targets')
    # Reconstruct the entire assignment from metadata only. A caller cannot
    # quietly shrink a split or move a difficult repository after inspection.
    metadata = {'revision': REVISION, 'compressed_sha256': COMPRESSED_SHA,
                'languages': {language: {'repositories_metadata': [
                    {key: row[key] for key in ['repo', 'commit_sha', 'topic']} for row in repositories]}
                    for language, repositories in data.items()}}
    if canonical_hash(plan) != canonical_hash(make_plan(metadata)):
        raise ContractError('Family assignment differs from the immutable metadata-derived plan')
    isolate_parent_ignores(destination)
    receipt = {'status': 'running', 'schema': 1, 'split': split, 'plan_sha256': canonical_hash(plan),
               'compressed_sha256': COMPRESSED_SHA, 'revision': REVISION, 'planned_families': len(selected),
               'query_policy': plan['query'], 'coordinate_policy': plan['coordinate_policy'],
               'condition': 'All nonempty supplied content files per repository, not a new full Git checkout; zero-content exclusions recorded before targets. All10 upstream generated-description needles. Source coordinates verified, semantic relevance inherited; not official generated-function syntax scoring.',
               'families': []}
    if split == 'test':
        receipt['selection_sha256'] = canonical_hash(selection)
    datasets = []
    try:
        for item in selected:
            result = dict(item)
            receipt['families'].append(result)
            matches = [row for row in data[item['language']] if row['repo'] == item['repository']]
            if len(matches) != 1 or matches[0]['commit_sha'] != item['source_revision']:
                raise ContractError('Repository metadata differs from frozen split plan')
            repo = matches[0]
            folder = destination / item['repository'].replace('/', '--')
            root = folder / 'corpus'
            root.mkdir(parents=True)
            sources, total, skipped = [], 0, []
            # Inventory is independent of queries/targets. No label-driven file
            # filtering or flattening of paths; preserve exact provided bytes.
            for path, text in sorted(repo['content'].items()):
                relative_path(path)
                if not isinstance(text, str):
                    raise ContractError('Provided source must be UTF-8 text')
                if not text.strip():
                    skipped.append({'path': path, 'reason': 'Zero-content/whitespace text cannot be searched by the engine.'})
                    continue
                raw = text.encode('utf-8')
                total += len(raw)
                if len(raw) > MAX_FILE or total > MAX_CORPUS or b'\0' in raw:
                    raise ContractError('Provided source exceeds engine text/input bounds')
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open('xb') as stream:
                    stream.write(raw)
                sources.append({'path': path, 'sha256': digest(raw)})
            needles = repo['needles']
            if len(needles) != 10:
                raise ContractError('Keep every one of the ten preselected function targets')
            queries, audits = [], []
            for index, needle in enumerate(needles):
                path = relative_path(needle['path'])
                if path not in {source['path'] for source in sources}:
                    raise ContractError('Function target is outside the supplied source inventory')
                span, audit = verified_span(needle, repo['content'][path], repo['functions'].get(path, []))
                qid = 'repoqa-' + digest((item['repository'] + '/' + str(index)).encode())[:20]
                queries.append({'id': qid, 'text': needle['description'], 'group': item['repository'],
                                'split': split, 'workload': 'code-agent', 'kind': 'function-description',
                                'gold': [{'path': path, 'grade': 2, 'spans': [list(span)]}], 'answerability': 'answerable'})
                audits.append({'query_id': qid, **audit})
            manifest = {'schema': 1, 'id': 'repoqa-' + item['repository'].replace('/', '--'),
                        'provenance': {'origin': 'https://github.com/evalplus/repoqa_release/tree/' + REVISION,
                                       'revision': item['source_revision'],
                                       'label_method': 'Upstream generated natural-language function descriptions/TreeSitter function catalog; strict independent local byte/line consistency audit, no semantic reannotation.',
                                       'license': 'Official RepoQA release Apache-2.0; supplied repository content retains original authors/licenses, ignored and not redistributed here.',
                                       'limitations': 'Restricted supplied-source snapshot, not all Git files; generated descriptions can be imperfect or mention target identifiers. Unknown pretraining overlap. Line/rank metrics differ from official generated-function syntax similarity.'},
                        'sources': sources, 'queries': queries}
            path = folder / 'manifest.json'
            path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
            dataset = load_dataset(path, root)
            datasets.append(dataset)
            result.update(status='passed', root=str(root.resolve()), manifest=str(path.resolve()),
                          fingerprint=dataset.fingerprint, source_files=len(sources), source_bytes=total,
                          provided_source_files=len(repo['content']), skipped_source_files=skipped,
                          queries=len(queries), audits=audits)
        bundle_check(datasets)
        receipt.update(status='passed', completed_families=len(datasets), queries=sum(len(d.queries) for d in datasets))
    except Exception as error:
        receipt.update(status='failed', failure=str(error), completed_families=sum(row.get('status') == 'passed' for row in receipt['families']))
        raise
    finally:
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text(json.dumps(receipt, indent=2) + '\n')
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    freeze = commands.add_parser('freeze')
    freeze.add_argument('--metadata', type=Path, required=True)
    freeze.add_argument('--output', type=Path, required=True)
    build = commands.add_parser('prepare')
    build.add_argument('--plan', type=Path, required=True)
    build.add_argument('--archive', type=Path, required=True)
    build.add_argument('--split', choices=['dev', 'validation', 'test'], required=True)
    build.add_argument('--destination', type=Path, required=True)
    build.add_argument('--receipt', type=Path, required=True)
    build.add_argument('--selection', type=Path, help='Exact frozen recipe/model/binary identities; mandatory before test target preparation')
    args = parser.parse_args()
    if args.command == 'freeze':
        if args.output.exists():
            parser.error('Never overwrite an earlier split freeze')
        plan = make_plan(json.loads(args.metadata.read_text()))
        args.output.write_text(json.dumps(plan, indent=2) + '\n')
        print(json.dumps({'plan_sha256': canonical_hash(plan), 'families': len(plan['families']),
                          'splits': {split: sum(row['split'] == split for row in plan['families'])
                                     for split in ['dev', 'validation', 'test']}}, indent=2))
    else:
        selection = json.loads(args.selection.read_text()) if args.selection else None
        result = prepare(json.loads(args.plan.read_text()), checked_data(args.archive), args.split, args.destination, args.receipt, selection)
        print(json.dumps({'status': result['status'], 'families': result['completed_families'], 'queries': result['queries']}, indent=2))


if __name__ == '__main__':
    main()
