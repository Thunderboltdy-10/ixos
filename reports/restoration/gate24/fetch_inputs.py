"""Pin development metadata, upstream harness source and isolated uv runtime."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from scripts.code_tasks.prepare import archive_files, download, sha


def api(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Ixos-evaluation-audit'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


p = argparse.ArgumentParser()
p.add_argument('--data', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
assert not a.data.exists() and not a.output.exists()
a.data.mkdir(parents=True)
revision = 'e48e2bd1e9fecd5bbd641e9414ac59da9f2e69f6'
records = []
records.append(download(f'https://huggingface.co/datasets/princeton-nlp/SWE-bench/resolve/{revision}/data/dev-00000-of-00001.parquet', a.data / 'dev.parquet'))
commit = api('https://api.github.com/repos/SWE-bench/SWE-bench/commits/main')['sha']
records.append(download(f'https://codeload.github.com/SWE-bench/SWE-bench/tar.gz/{commit}', a.data / 'harness.tar.gz'))
files, links = archive_files((a.data / 'harness.tar.gz').read_bytes())
for name, raw in files.items():
    path = a.data / 'harness' / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
release = api('https://api.github.com/repos/astral-sh/uv/releases/latest')
assets = [x for x in release['assets'] if x['name'] == 'uv-x86_64-unknown-linux-musl.tar.gz']
assert len(assets) == 1
asset = assets[0]
uv_record = download(asset['browser_download_url'], a.data / 'uv.tar.gz')
assert asset.get('digest') == 'sha256:' + uv_record['sha256'], 'Verify upstream runtime digest before extraction'
records.append(uv_record)
uv_files, uv_links = archive_files((a.data / 'uv.tar.gz').read_bytes())
assert set(uv_files) == {'uv', 'uvx'} and not uv_links
for name, raw in uv_files.items():
    path = a.data / 'runtime' / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
result = {'dataset_revision': revision, 'split': 'dev', 'official_test_downloaded': False,
    'harness_commit': commit, 'harness_archive_sha256': records[1]['sha256'],
    'harness_source_files': len(files), 'harness_excluded_links': links,
    'uv_version': release['tag_name'], 'uv_vendor_digest': asset['digest'], 'downloads': records,
    'benchmark_task_content_loaded': False,
    'prospective_exclusions': {'lite_dev': ['marshmallow-code/marshmallow', 'pvlib/pvlib-python', 'pydicom/pydicom',
        'pylint-dev/astroid', 'pyvista/pyvista', 'sqlfluff/sqlfluff'],
        'official_guide_solution_example': ['sympy/sympy'],
        'previous_live_tasks': ['docker/compose', 'tiangolo/fastapi', 'pypa/pip']},
    'boundary': 'Official evaluation guide displayed a sympy solution example; exclude that entire repository from future task selection. No task solution/data-viewer research.'}
a.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: result[k] for k in ('dataset_revision', 'split', 'harness_commit', 'uv_version', 'benchmark_task_content_loaded')}, indent=2))
