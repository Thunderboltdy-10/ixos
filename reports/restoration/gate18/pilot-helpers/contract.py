"""Strict full-paper/paragraph coordinates, independent of model outputs.

QASPER asks questions about a known paper. Text evidence is a set of original
paragraph strings, not automatically a set of every byte in a matching line.
Figures/table bodies and answer generation are outside this textual adapter.
"""
from collections import Counter
from dataclasses import dataclass
import hashlib
import json
import re


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return sha(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode())


@dataclass
class Paper:
    paper_id: str
    raw: bytes
    paragraphs: list[dict]
    headings: list[dict]

    @property
    def units(self):
        return self.paragraphs+self.headings

    @property
    def fingerprint(self):
        return sha(self.raw)


def render(paper_id, data):
    if not re.fullmatch(r'[0-9]{4}\.[0-9]{4,5}(v[0-9]+)?',paper_id):
        raise ValueError('Nonportable paper identifier')
    pieces, paragraphs, headings, offset = [], [], [], 0

    def append(text):
        nonlocal offset
        if not isinstance(text,str) or '\r' in text or '\x00' in text:
            raise ValueError('Paper text must be exact UTF-8 LF text without NUL')
        raw = text.encode('utf-8')
        pieces.append(raw)
        offset += len(raw)

    append(data['title']+'\n\n')
    append(data['abstract']+'\n\n')
    for si,section in enumerate(data['full_text']):
        # Upstream uses null for some absent headings; retain every paragraph.
        heading = section['section_name']
        heading = '' if heading is None else heading
        start = offset
        append(heading)
        if heading:
            headings.append({'id':f'{si}:heading','text':heading,'start':start,'end':offset})
        append('\n\n')
        for pi,text in enumerate(section['paragraphs']):
            start = offset
            append(text)
            paragraphs.append({'id':f'{si}:{pi}','text':text,'start':start,'end':offset})
            append('\n\n')
    result = Paper(paper_id,b''.join(pieces),paragraphs,headings)
    for paragraph in result.units:
        assert result.raw[paragraph['start']:paragraph['end']].decode()==paragraph['text']
    return result


def references(question, paper):
    by_text = {}
    for paragraph in paper.units:
        if paragraph['text']:
            by_text.setdefault(paragraph['text'],[]).append(paragraph['id'])
    refs = []
    for annotation in question['answers']:
        answer = annotation['answer']
        if type(answer['unanswerable']) is not bool:
            raise ValueError('Missing explicit answerability')
        evidence = answer['evidence']
        if not isinstance(evidence,list) or any(not isinstance(text,str) for text in evidence):
            raise ValueError('Evidence must contain original strings')
        text = list(dict.fromkeys(value for value in evidence if not value.startswith('FLOAT SELECTED')))
        floats = list(dict.fromkeys(value for value in evidence if value.startswith('FLOAT SELECTED')))
        refs.append({'annotation_id':annotation['annotation_id'],'unanswerable':answer['unanswerable'],
                     'text':text,'floats':floats,'matches':{value:by_text.get(value,[]) for value in text},
                     'unmatched':sum(not by_text.get(value) for value in text),
                     'answer_type':'unanswerable' if answer['unanswerable'] else
                         'extractive' if answer['extractive_spans'] else
                         'abstractive' if answer['free_form_answer'] else
                         'yes' if answer['yes_no'] is True else 'no' if answer['yes_no'] is False else 'invalid'})
    if not refs:
        raise ValueError('A question has no answer annotations')
    return refs


def answerability(refs):
    if all(ref['unanswerable'] for ref in refs):
        return 'unanswerable'
    if any(ref['unanswerable'] for ref in refs):
        return 'mixed'
    return 'answerable'


def union(ranges):
    out = []
    for start,end in sorted(ranges):
        if start<0 or end<start:
            raise ValueError('Invalid byte interval')
        if start==end:
            continue
        if out and start<=out[-1][1]:
            out[-1] = (out[-1][0],max(end,out[-1][1]))
        else:
            out.append((start,end))
    return out


def intersection(ranges, start, end):
    return sum(max(0,min(b,end)-max(a,start)) for a,b in union(ranges))


def checked_views(message, paper):
    lines = paper.raw.decode().split('\n')
    if lines[-1]=='':
        lines.pop()  # Engine removes one final LF, then splits the normalized text.
    offsets, offset = [], 0
    for line in lines:
        offsets.append(offset)
        offset += len(line.encode())+1
    ranges = []
    for row in message['results']:
        if row['path']!='paper.txt':
            raise ValueError('Result outside the one-paper source inventory')
        view = row.get('view')
        if view is None:
            if not row.get('evidence_omitted'):
                raise ValueError('Unexplained missing evidence')
            continue
        start,end = view['start_line'],view['end_line']
        if type(start) is not int or type(end) is not int or not 1<=start<=end<=len(lines):
            raise ValueError('Out-of-bounds source coordinates')
        expected = '\n'.join(lines[start-1:end])
        if view['path']!='paper.txt' or view['text']!=expected:
            raise ValueError('View is not exact complete claimed source lines')
        ranges.append((offsets[start-1],offsets[start-1]+len(expected.encode())))
    return union(ranges)


def score(refs, paper, ranges):
    ranges = union(ranges)
    paragraph_by_id = {p['id']:p for p in paper.units}
    exposed = {p['text'] for p in paper.units if p['text'] and
               intersection(ranges,p['start'],p['end'])==p['end']-p['start']}
    touched = {p['text'] for p in paper.units if p['text'] and
               intersection(ranges,p['start'],p['end'])>0}
    valid = [ref for ref in refs if not ref['unanswerable'] and ref['text'] and not ref['unmatched'] and not ref['floats']]
    outcomes = []
    for ref in valid:
        gold = set(ref['text'])
        total = sum(len(value.encode()) for value in gold)
        overlap = sum(max(intersection(ranges,paragraph_by_id[pid]['start'],paragraph_by_id[pid]['end'])
                          for pid in ref['matches'][value]) for value in gold)
        correct = len(gold & exposed)
        precision = correct/len(exposed) if exposed else 0.0
        recall = correct/len(gold)
        outcomes.append({'text_unit_f1':2*precision*recall/(precision+recall) if precision+recall else 0.0,
                         'text_unit_recall':recall,'byte_recall':overlap/total,
                         'text_unit_contact':len(gold & touched)/len(gold)})
    return {'answerability':answerability(refs),'strict_text_references':len(valid),
            **{key:max(row[key] for row in outcomes) if outcomes else None
               for key in ('text_unit_f1','text_unit_recall','byte_recall','text_unit_contact')},
            'exposed_text_units':len(exposed),'touched_text_units':len(touched),
            'displayed_source_bytes':sum(end-start for start,end in ranges)}


def audit_questions(data):
    counts = Counter()
    ids = set()
    for paper_id,paper_data in data.items():
        paper = render(paper_id,paper_data)
        counts['papers']+=1
        counts['source_bytes']+=len(paper.raw)
        counts['paragraphs']+=len(paper.paragraphs)
        counts['headings']+=len(paper.headings)
        for question in paper_data['qas']:
            qid = question['question_id']
            if qid in ids or not isinstance(question['question'],str) or not question['question'].strip():
                raise ValueError('Repeated/missing question identity or text')
            ids.add(qid)
            refs = references(question,paper)
            counts['questions']+=1
            counts['answerability_'+answerability(refs)]+=1
            if any(not r['unanswerable'] and r['text'] and not r['unmatched'] and not r['floats'] for r in refs):
                counts['questions_strict_text_reference']+=1
            for ref in refs:
                counts['annotations']+=1
                counts['annotations_'+ref['answer_type']]+=1
                counts['unmatched_text_evidence']+=ref['unmatched']
                counts['float_evidence_strings']+=len(ref['floats'])
                counts['ambiguous_text_evidence']+=sum(len(ids)>1 for ids in ref['matches'].values())
                counts['unanswerable_with_evidence']+=bool(ref['unanswerable'] and (ref['text'] or ref['floats']))
                counts['answerable_without_evidence']+=bool(not ref['unanswerable'] and not ref['text'] and not ref['floats'])
    return dict(counts)
