"""Prospective source-family-separated selection without opening task references."""
import hashlib
import json
from pathlib import Path

import pyarrow.parquet as pq

base = Path(__file__).resolve().parent
root = base.parents[2]
sha = lambda raw: hashlib.sha256(raw).hexdigest()
load = lambda path: json.loads(path.read_text(encoding='utf-8'))
prior = set(load(root / 'reports/restoration/gate24/selection.json')['excluded_repositories'])
prior.update(('oauthlib/oauthlib', 'fastapi/fastapi'))
repoqa = set()
for folder in (root / 'dataset/restoration').glob('repoqa-*'):
    if folder.is_dir():
        for path in folder.iterdir():
            if path.is_dir() and '--' in path.name:
                owner, repo = path.name.split('--', 1)
                repoqa.add(f'{owner}/{repo}'.lower())
public = {'axios/axios', 'tokio-rs/axum', 'tiangolo/fastapi', 'fastapi/fastapi',
          'psf/requests', 'serde-rs/serde', 'tokio-rs/tokio'}
reserved_human = {'astropy/astropy', 'django/django', 'matplotlib/matplotlib', 'mwaskom/seaborn',
                  'pallets/flask', 'psf/requests', 'pydata/xarray', 'pylint-dev/pylint',
                  'pytest-dev/pytest', 'scikit-learn/scikit-learn', 'sphinx-doc/sphinx', 'sympy/sympy'}
excluded = {name.lower() for name in prior | repoqa | public | reserved_human}
inputs = load(root / 'reports/restoration/gate25/synthetic-training-inputs.json')
metadata = []
unrecognized = 0
for item in inputs['downloads']:
    path = root / '.tmp/gate25/data/swesmith-py' / Path(item['file']).name
    assert sha(path.read_bytes()) == item['sha256']
    rows = pq.read_table(path, columns=['repo', 'instance_id', 'image_name']).to_pylist()
    for row in rows:
        leaf = row['repo'].split('/')[-1]
        name, separator, revision = leaf.rpartition('.')
        if not separator or len(revision) != 8 or '__' not in name:
            unrecognized += 1
            continue
        owner, repo = name.split('__', 1)
        canonical = f'{owner}/{repo}'.lower()
        if canonical not in excluded:
            metadata.append({**row, 'canonical_repository': canonical, 'shard': path.name})
families = sorted({row['canonical_repository'] for row in metadata}, key=lambda name: sha(name.encode()))
assert len(families) >= 6
selected = []
for index, family in enumerate(families[:6]):
    row = min((row for row in metadata if row['canonical_repository'] == family), key=lambda row: sha(row['instance_id'].encode()))
    selected.append({**row, 'case': f'S{index+1:02}', 'role': 'development' if index < 3 else 'validation'})
result = {'dataset': inputs['dataset'], 'revision': inputs['revision'], 'source_split': 'train',
          'input_receipt_sha256': sha((root / 'reports/restoration/gate25/synthetic-training-inputs.json').read_bytes()),
          'protocol_sha256': sha((base / 'protocol.json').read_bytes()),
          'exclusions': {'previous': sorted(prior), 'prepared_repoqa': sorted(repoqa),
                         'prepared_public': sorted(public), 'reserved_human': sorted(reserved_human)},
          'eligible_rows': len(metadata), 'eligible_canonical_families': len(families),
          'unrecognized_metadata_rows': unrecognized, 'selected': selected,
          'problem_patch_test_fields_loaded': False,
          'boundary': 'Machine metadata-only family/task selection. Three prospective dev and three reserved validation cases; synthetic, unknown pretraining overlap. Directory-based prepared RepoQA exclusions do not read labels.'}
target = base / 'selection.json'
assert not target.exists(), 'Do not replace prospective selection after seeing tasks'
target.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'selected': selected, 'eligible_families': len(families), 'reference_fields_loaded': False}))
