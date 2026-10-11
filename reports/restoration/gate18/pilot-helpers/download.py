"""Fetch pinned upstream metadata and the official train/dev archive; no test data."""
from pathlib import Path
import hashlib
import json
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'reports/restoration/gate18'
DATA = ROOT/'.tmp/gate18/qasper'


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Ixos-evidence-audit'}), timeout=90) as response:
        return response.read()


def main():
    DATA.mkdir(parents=True, exist_ok=False)
    meta = json.loads(fetch('https://huggingface.co/api/datasets/allenai/qasper'))
    revision = meta['sha']
    rows = []
    for name in ('README.md','qasper.py'):
        url = f'https://huggingface.co/datasets/allenai/qasper/resolve/{revision}/{name}'
        raw = fetch(url)
        (DATA/name).write_bytes(raw)
        rows.append({'url':url,'name':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
    url = 'https://qasper-dataset.s3.us-west-2.amazonaws.com/qasper-train-dev-v0.3.tgz'
    assert url in (DATA/'qasper.py').read_text(encoding='utf-8')
    raw = fetch(url)
    archive = DATA/'qasper-train-dev-v0.3.tgz'
    archive.write_bytes(raw)
    rows.append({'url':url,'name':archive.name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
    with tarfile.open(archive) as stream:
        for name in ('qasper-train-v0.3.json','qasper-dev-v0.3.json'):
            member = stream.getmember(name)
            assert member.isfile() and member.size<=64*1024*1024
            raw = stream.extractfile(member).read()
            (DATA/name).write_bytes(raw)
            rows.append({'name':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
    receipt = {'status':'passed','huggingface_revision':revision,'license_tag':meta.get('cardData',{}).get('license'),
               'files':rows,'test_downloaded':False,'data_directory':str(DATA)}
    (OUT/'downloads.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(receipt,indent=2))


if __name__=='__main__':
    main()
