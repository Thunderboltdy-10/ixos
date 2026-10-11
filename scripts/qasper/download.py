"""Fetch pinned upstream metadata and the official train/dev archive; no test data."""
from pathlib import Path
import argparse
import hashlib
import json
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
REVISION = 'fdc9d8214fbab5dd782958601db4d678e6934a54'
EXPECTED = {
    'README.md':'da348d3f8277f8a93ca397941f6a525433e282858b1c0562aed3f667d8e55b05',
    'qasper.py':'381d623d4992118738c0a17b9c8219136f493eda381125716ab32b814d0b3c0a',
    'qasper-train-dev-v0.3.tgz':'a28fdf966db827bcee3d873107d6b6669864fb7ca8fbf73a192f5e39191bdb5a',
    'qasper-train-v0.3.json':'9458bfe76074a8fa8d1685af02bcc73537aa6d338ad20591dfaff1946bc88bf4',
    'qasper-dev-v0.3.json':'2ae7ee62a65b1c4225791c70de80c2aad4e8998cf1fd4f09a53103db4f21af93',
}


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Ixos-evidence-audit'}), timeout=90) as response:
        return response.read()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    if args.data.exists() or args.output.exists():
        parser.error('Use new data and receipt paths')
    DATA = args.data
    DATA.mkdir(parents=True, exist_ok=False)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    revision = REVISION
    rows = []
    def verify(name,raw):
        assert hashlib.sha256(raw).hexdigest()==EXPECTED[name],name+' changed from pinned bytes'
    for name in ('README.md','qasper.py'):
        url = f'https://huggingface.co/datasets/allenai/qasper/resolve/{revision}/{name}'
        raw = fetch(url)
        verify(name,raw)
        (DATA/name).write_bytes(raw)
        rows.append({'url':url,'name':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
    url = 'https://qasper-dataset.s3.us-west-2.amazonaws.com/qasper-train-dev-v0.3.tgz'
    assert url in (DATA/'qasper.py').read_text(encoding='utf-8')
    raw = fetch(url)
    archive = DATA/'qasper-train-dev-v0.3.tgz'
    verify(archive.name,raw)
    archive.write_bytes(raw)
    rows.append({'url':url,'name':archive.name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
    with tarfile.open(archive) as stream:
        for name in ('qasper-train-v0.3.json','qasper-dev-v0.3.json'):
            member = stream.getmember(name)
            assert member.isfile() and member.size<=64*1024*1024
            raw = stream.extractfile(member).read()
            verify(name,raw)
            (DATA/name).write_bytes(raw)
            rows.append({'name':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
    receipt = {'status':'passed','huggingface_revision':revision,'license_tag':['cc-by-4.0'],
               'files':rows,'test_downloaded':False,'data_directory':str(DATA)}
    args.output.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(receipt,indent=2))


if __name__=='__main__':
    main()
