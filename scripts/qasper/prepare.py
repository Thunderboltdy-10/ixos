"""Validate original train gold and reserve dev without inspecting its annotations."""
from pathlib import Path
import argparse
import json
from scripts.qasper.contract import render, audit_questions, canonical, sha

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,required=True)
    parser.add_argument('--downloads',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new preparation receipt path')
    DATA = args.data
    downloads = json.loads(args.downloads.read_text())
    assert downloads['status']=='passed'
    for row in downloads['files']:
        assert sha((DATA/row['name']).read_bytes())==row['sha256']
    train = json.loads((DATA/'qasper-train-v0.3.json').read_text())
    dev = json.loads((DATA/'qasper-dev-v0.3.json').read_text())
    assert not set(train)&set(dev)
    # Source metadata only from dev; its questions/answers are neither printed nor scored.
    train_sources = {pid:render(pid,data).fingerprint for pid,data in train.items()}
    dev_sources = {pid:render(pid,data).fingerprint for pid,data in dev.items()}
    assert not set(train_sources.values()) & set(dev_sources.values())
    order = sorted(train,key=lambda pid:sha(('ixos-qasper-pilot-v1:'+pid).encode()))[:32]
    pilot = {pid:train[pid] for pid in order}
    # Corpus bytes do not change when evidence mapping improves. Existing sources
    # must match exactly; never silently overwrite a prior prepared corpus.
    source_rows = []
    for pid in order:
        paper = render(pid,train[pid])
        directory = DATA/'corpus'/pid
        directory.mkdir(parents=True,exist_ok=True)
        path = directory/'paper.txt'
        if path.exists():
            assert path.read_bytes()==paper.raw
        else:
            path.write_bytes(paper.raw)
        source_rows.append({'paper_id':pid,'sha256':paper.fingerprint,'bytes':len(paper.raw),
                            'question_ids':[q['question_id'] for q in train[pid]['qas']]})
    report = {'status':'passed','version':'ixos-qasper-text-v1','task':'known-paper text evidence',
              'train_sha256':sha((DATA/'qasper-train-v0.3.json').read_bytes()),
              'dev_sha256':sha((DATA/'qasper-dev-v0.3.json').read_bytes()),
              'downloads_receipt_sha256':sha(args.downloads.read_bytes()),
              'train_audit':audit_questions(train),'pilot_audit':audit_questions(pilot),
              'dev_reserved':{'papers':len(dev),'source_metadata_hash':canonical(dev_sources),'scored':False,'annotations_inspected':False},
              'train_source_metadata_hash':canonical(train_sources),'paper_id_and_source_hash_overlap':0,
              'pilot':source_rows,'pilot_identity':canonical(source_rows),
              'exclusions':'No papers/questions removed from the pilot. Text-only metric denominators exclude unmappable/float/empty references explicitly; their counts and all query outputs remain.'}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:report[key] for key in ('status','train_audit','pilot_audit','dev_reserved','pilot_identity')},indent=2))


if __name__=='__main__':
    main()
