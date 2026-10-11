from collections import Counter
import json
from pathlib import Path

root = Path(__file__).resolve().parents[3]
out = {}
for split in ('train','dev'):
    data = json.loads((root/f'.tmp/gate18/qasper/qasper-{split}-v0.3.json').read_text())
    counts = Counter(papers=len(data))
    for paper in data.values():
        for field in ('title','abstract'):
            counts[field+'_'+type(paper[field]).__name__]+=1
        for section in paper['full_text']:
            counts['section_name_'+type(section['section_name']).__name__]+=1
            for paragraph in section['paragraphs']:
                counts['paragraph_'+type(paragraph).__name__]+=1
                if isinstance(paragraph,str):
                    counts['paragraphs_with_cr']+='\r' in paragraph
                    counts['paragraphs_with_nul']+='\x00' in paragraph
    out[split]=dict(counts)
(Path(__file__).resolve().parent/'schema-audit.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out,indent=2))
