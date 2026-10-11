"""Audit complete paired pilot records; bootstrap by whole paper, not commands."""
from collections import Counter
import json
from pathlib import Path
import statistics
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[3]))
sys.stdout.reconfigure(encoding='utf-8')

from eval.contract import cluster_mean_ci, paired_family_difference

base = Path(__file__).resolve().parent
receipt = json.loads((base/'pilot/receipt.json').read_text())
prep = json.loads((base/'preparation.json').read_text())
assert receipt['status']=='passed' and receipt['source_preserved']
assert receipt['pilot_identity']==prep['pilot_identity']
rows = [json.loads(line) for line in (base/'pilot/rows.jsonl').read_text().splitlines()]
assert len(rows)==5*prep['pilot_audit']['questions']==485
expected = {qid for paper in prep['pilot'] for qid in paper['question_ids']}
arms = {}
summary = {'status':'passed','unique_questions':len(expected),'papers':len(prep['pilot']),
           'searches':len(rows),'requests':receipt['requests'],'arms':{},'comparisons':{},
           'limits':'Official train exploratory pilot; best fully mappable float-free text reference, equal-paper bootstrap. No task completion, general answerability confidence or official leaderboard/product score.'}
for arm,_,_ in receipt['arms']:
    selected = [row for row in rows if row['arm']==arm]
    assert len(selected)==len(expected) and {row['query_id'] for row in selected}==expected
    assert len({row['query_id'] for row in selected})==len(expected)
    arms[arm] = [{**row['metrics'],'query_id':row['query_id'],'group':row['paper_id']} for row in selected]
    eligible = [r for r in selected if r['metrics']['strict_text_references'] and r['metrics']['answerability']=='answerable']
    # Primary metric eligibility excludes mixed answerability, explicitly reported
    # separately rather than pretending disagreement is a clean no-answer label.
    for scored in arms[arm]:
        if scored['answerability']!='answerable':
            for metric in ('byte_recall','text_unit_f1','text_unit_recall','text_unit_contact'):
                scored[metric]=None
    counts = Counter(r['metrics']['answerability'] for r in selected)
    no_answer = [r for r in selected if r['metrics']['answerability']=='unanswerable']
    output = {
        'stdout_mean_tokens':statistics.mean(r['stdout_tokens'] for r in selected),
        'diagnostic_mean_tokens':statistics.mean(r['diagnostic_tokens'] for r in selected),
        'search_request_mean_tokens':statistics.mean(r['request_tokens'] for r in selected),
        'complete_study_tokens':sum(r['stdout_tokens']+r['diagnostic_tokens']+r['request_tokens']+
                                   r['reset_stdout_tokens']+r['reset_request_tokens']+r['ready_tokens'] for r in selected),
        'reset_and_ready_tokens':sum(r['reset_stdout_tokens']+r['reset_request_tokens']+r['ready_tokens'] for r in selected),
    }
    summary['arms'][arm] = {
        'quality':{metric:cluster_mean_ci(arms[arm],metric) for metric in ('byte_recall','text_unit_f1','text_unit_recall','text_unit_contact')},
        'annotation_groups':dict(counts),'strict_text_queries':len(eligible),
        'evidence_omitted_or_no_candidate':sum(not r['view_returned'] for r in selected),
        'no_answer':{'questions':len(no_answer),'candidates':sum(r['candidate_returned'] for r in no_answer),
                     'views':sum(r['view_returned'] for r in no_answer),'scores':[r['max_score'] for r in no_answer]},
        'answerable_max_score_range':[min(r['max_score'] for r in selected if r['max_score'] is not None and r['metrics']['answerability']=='answerable'),
                                     max(r['max_score'] for r in selected if r['max_score'] is not None and r['metrics']['answerability']=='answerable')],
        'output':output,
        'timing_ms_descriptive':{
            'startup_wall_median':statistics.median(r['startup_wall_ms'] for r in selected if r['first_in_process']),
            'first_document_fill_median':statistics.median(r['wall_ms'] for r in selected if r['first_in_process']),
            'resident_following_median':statistics.median(r['wall_ms'] for r in selected if not r['first_in_process'])},
    }
for control,candidate in [('documents-global','documents-bounded'),('documents-passages-global','documents-passages-bounded'),
                          ('documents-global','documents-passages-bounded'),('lexical-global','documents-bounded')]:
    summary['comparisons'][control+' → '+candidate] = {
        metric:paired_family_difference(arms[control],arms[candidate],metric) for metric in ('byte_recall','text_unit_f1')}
(base/'analysis.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
for arm,result in summary['arms'].items():
    q = result['quality']
    print(arm, 'byte',q['byte_recall']['mean'],'F1',q['text_unit_f1']['mean'],
          'eligible',result['strict_text_queries'],'tokens',result['output']['stdout_mean_tokens'],
          'no-answer views',result['no_answer']['views'])
print('Paired byte differences:')
for name,row in summary['comparisons'].items():
    print(name,row['byte_recall'])
