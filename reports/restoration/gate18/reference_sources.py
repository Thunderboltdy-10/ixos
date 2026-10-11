"""Pin upstream scoring reference; save locally without executing fetched code."""
import hashlib
import json
from pathlib import Path
import urllib.request

root = Path(__file__).resolve().parents[3]
data = root/'.tmp/gate18/qasper/upstream-scoring'
data.mkdir(exist_ok=False)

def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Ixos-evidence-audit'}),timeout=60) as response:
        return response.read()

meta = json.loads(fetch('https://api.github.com/repos/allenai/qasper-led-baseline/commits/main'))
revision = meta['sha']
rows = []
for name in ('scripts/evaluator.py','scripts/evidence_retrieval_heuristic_baselines.py','LICENSE','README.md'):
    url = f'https://raw.githubusercontent.com/allenai/qasper-led-baseline/{revision}/{name}'
    raw = fetch(url)
    (data/Path(name).name).write_bytes(raw)
    rows.append({'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
receipt = {'upstream_revision':revision,'files':rows,'executed':False,
           'paper_url':'https://aclanthology.org/2021.naacl-main.365/',
           'dataset_card_url':'https://huggingface.co/datasets/allenai/qasper',
           'dataset_license':'CC BY 4.0','baseline_source_license':'Apache 2.0',
           'scope':'Reference only. Our train pilot exact text-unit/byte metrics are not the official full-dev/test Answer/Evidence F1 leaderboard.'}
(Path(__file__).resolve().parent/'references.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,indent=2))
