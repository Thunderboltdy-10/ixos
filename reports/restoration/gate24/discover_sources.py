"""Read upstream metadata only, without task descriptions or solution content."""
import json
from pathlib import Path
import urllib.error
import urllib.request


def api(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Ixos-evaluation-audit'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


rows = []
for name in ('SWE-bench/SWE-bench', 'SWE-bench/SWE-bench_Multilingual', 'ScaleAI/SWE-bench_Pro'):
    url = 'https://huggingface.co/api/datasets/' + name
    try:
        record = api(url)
        rows.append({'dataset': name, 'url': url, 'sha': record['sha'],
            'data_files': [p['rfilename'] for p in record.get('siblings', []) if p['rfilename'].endswith(('.parquet', '.json', '.jsonl', '.csv'))]})
    except urllib.error.HTTPError as error:
        rows.append({'dataset': name, 'url': url, 'http_error': error.code})
tags = api('https://api.github.com/repos/SWE-bench/SWE-bench/tags?per_page=100')
result = {'datasets': rows, 'official_harness_tags': [{'name': tag['name'], 'sha': tag['commit']['sha']} for tag in tags],
          'task_content_loaded': False}
output = Path(__file__).resolve().parent / 'upstream-metadata.json'
assert not output.exists()
output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2))
