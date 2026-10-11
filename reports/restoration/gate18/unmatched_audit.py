from collections import Counter
import json
from pathlib import Path
import re
from scripts.qasper.contract import render, references

root = Path(__file__).resolve().parents[3]
train = json.loads((root/'.tmp/gate18/qasper/qasper-train-v0.3.json').read_text())
counts = Counter()
samples = []
for pid,data in train.items():
    paper = render(pid,data)
    paragraphs = [p['text'] for p in paper.paragraphs]
    for question in data['qas']:
        for ref in references(question,paper):
            for value,matches in ref['matches'].items():
                if matches:
                    continue
                if value==data['abstract']:
                    kind='exact_abstract'
                elif value==data['title']:
                    kind='exact_title'
                elif value.strip() in [p.strip() for p in paragraphs]:
                    kind='edge_whitespace_only'
                elif re.sub(r'\s+',' ',value).strip() in [re.sub(r'\s+',' ',p).strip() for p in paragraphs]:
                    kind='internal_whitespace_only'
                elif value in paper.raw.decode():
                    kind='exact_nonparagraph_substring'
                else:
                    kind='not_exactly_in_rendered_source'
                counts[kind]+=1
                if len(samples)<8:
                    samples.append({'paper_id':pid,'question_id':question['question_id'],'kind':kind,
                                    'evidence_prefix':value[:160],'evidence_characters':len(value)})
out = {'counts':dict(counts),'bounded_training_samples':samples,
       'normalizations_applied':False,'validation_or_test_annotations_inspected':False}
(Path(__file__).resolve().parent/'unmatched-audit.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out,indent=2))
