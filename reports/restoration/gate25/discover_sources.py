"""Inspect primary-source dataset metadata/file lists only, never the viewer."""
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.request

base = Path(__file__).resolve().parent
result = {'datasets': [], 'new_exclusion': {
    'repository': 'oauthlib/oauthlib',
    'reason': 'A search result from the SWE-smith dataset viewer exposed an OAuth2 scope solution excerpt. Exclude this canonical family and its benchmark forks before task selection.'},
    'boundaries': 'Metadata/file lists only; no data viewer, task problem/reference rows or official test downloaded. SWE-smith is synthetic training, Live is separately curated human issue data; verify executable/split contracts before use.'}
for dataset in ('SWE-bench-Live/SWE-bench-Live', 'SWE-bench/SWE-smith-py', 'SWE-bench/SWE-smith'):
    url = 'https://huggingface.co/api/datasets/' + dataset
    request = urllib.request.Request(url, headers={'User-Agent': 'Ixos-benchmark-metadata'})
    try:
        raw = urllib.request.urlopen(request, timeout=60).read()
        data = json.loads(raw)
        result['datasets'].append({'dataset': dataset, 'url': url,
            'metadata_sha256': hashlib.sha256(raw).hexdigest(), 'revision': data['sha'],
            'license_metadata': data.get('cardData', {}).get('license'),
            'files': [item['rfilename'] for item in data.get('siblings', [])]})
    except urllib.error.HTTPError as error:
        result['datasets'].append({'dataset': dataset, 'url': url, 'status': error.code})
(base / 'source-metadata.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
