"""Pin metadata-only human issue tasks and complete original source archives."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import tarfile
import urllib.request

import pyarrow.parquet as pq

REV = 'e48e2bd1e9fecd5bbd641e9414ac59da9f2e69f6'
LITE_REV = '6ec7bb89b9342f664a54a6e0a6ea6501d3437cc2'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return sha(json.dumps(value, sort_keys=True, separators=(',', ':')).encode())


def download(url, path):
    if path.exists():
        raise ValueError('Use a new download directory')
    with urllib.request.urlopen(url, timeout=90) as response:
        raw = response.read(512 * 1024 * 1024 + 1)
    if len(raw) > 512 * 1024 * 1024:
        raise ValueError('Archive exceeds explicit download limit')
    path.write_bytes(raw)
    return {'url': url, 'path': str(path), 'sha256': sha(raw), 'bytes': len(raw)}


def archive_files(raw):
    """Validate all members before writing; refuse traversal, duplicates or devices."""
    files, skipped, prefix = {}, [], None
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as archive:
        for member in archive:
            path = PurePosixPath(member.name)
            if path.is_absolute() or '..' in path.parts or '\\' in member.name:
                raise ValueError('Unsafe archive member')
            if not path.parts:
                raise ValueError('Empty archive member')
            prefix = prefix or path.parts[0]
            if path.parts[0] != prefix:
                raise ValueError('Multiple archive roots')
            relative = PurePosixPath(*path.parts[1:]).as_posix()
            if member.isdir():
                continue
            if member.issym() or member.islnk():
                skipped.append({'path': relative, 'type': 'link'})
                continue
            if not member.isfile() or relative == '.' or relative in files:
                raise ValueError('Unexpected or duplicate archive file')
            handle = archive.extractfile(member)
            value = handle.read()
            if len(value) != member.size:
                raise ValueError('Archive file size mismatch')
            files[relative] = value
    if sum(map(len, files.values())) > 512 * 1024 * 1024:
        raise ValueError('Expanded archive exceeds explicit limit')
    return files, skipped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.data.exists() or args.output.exists():
        parser.error('Use new data and receipt paths')
    args.data.mkdir(parents=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    records = []
    train_path = args.data / 'train.parquet'
    lite_path = args.data / 'lite-dev.parquet'
    records.append(download(f'https://huggingface.co/datasets/princeton-nlp/SWE-bench/resolve/{REV}/data/train-00000-of-00001.parquet', train_path))
    records.append(download(f'https://huggingface.co/datasets/princeton-nlp/SWE-bench_Lite/resolve/{LITE_REV}/data/dev-00000-of-00001.parquet', lite_path))
    # Deliberately load only task metadata, never reference/hint/test columns.
    excluded = set(pq.read_table(lite_path, columns=['repo'])['repo'].to_pylist())
    table = pq.read_table(train_path, columns=['repo', 'instance_id', 'base_commit', 'problem_statement'])
    rows = table.to_pylist()
    repos = sorted({r['repo'] for r in rows} - excluded, key=lambda name: sha(name.encode()))[:3]
    tasks = []
    for index, repo in enumerate(repos, 1):
        row = min((r for r in rows if r['repo'] == repo), key=lambda item: sha(item['instance_id'].encode()))
        case = f'C{index:02}'
        archive_path = args.data / (case + '.tar.gz')
        records.append(download(f'https://codeload.github.com/{repo}/tar.gz/{row["base_commit"]}', archive_path))
        files, links = archive_files(archive_path.read_bytes())
        root = args.data / 'sources' / case
        root.mkdir(parents=True)
        for name, raw in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        inventory = {name: {'sha256': sha(raw), 'bytes': len(raw)} for name, raw in sorted(files.items())}
        inventory_path = args.output.parent / (case + '-source-inventory.json')
        inventory_path.write_text(json.dumps(inventory, indent=2) + '\n', encoding='utf-8')
        tasks.append({**row, 'id': case, 'root': str(root.resolve()),
                      'inventory_path': str(inventory_path.resolve()), 'inventory_identity': canonical(inventory),
                      'source_files': len(files), 'source_bytes': sum(map(len, files.values())), 'excluded_links': links})
    result = {'dataset': 'princeton-nlp/SWE-bench', 'revision': REV, 'split': 'train',
              'train_rows': len(rows), 'excluded_lite_dev_repositories': sorted(excluded), 'downloads': records,
              'tasks': tasks, 'task_identity': canonical(tasks), 'references_loaded': False,
              'reference_input': str(train_path.resolve())}
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'prepared', 'train_rows': len(rows), 'cases': [
        {key: row[key] for key in ('id', 'repo', 'instance_id', 'base_commit', 'source_files', 'source_bytes')}
        for row in tasks], 'reference_columns_loaded': False}, indent=2))


if __name__ == '__main__':
    main()
