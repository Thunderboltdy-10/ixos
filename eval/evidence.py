"""A/B displayed evidence using a frozen development file ranking.

Window scoring uses the words in the actual displayed window, never relevance
spans. Ranking/context budgets remain fixed; changed visible text is rescored.
"""
import argparse
import gzip
import json
from pathlib import Path
import statistics
from eval.contract import cluster_mean_ci,load_dataset,score_query
from eval.lexical import BM25,compact_response,tokens,view_at
from eval.retrieval import lexical_scores


def window_anchor(lines,idfs,context,center_tiebreak=False):
    line_terms=[set(tokens(line)) for line in lines]
    best=None
    maximum=(0,0)
    for i in range(len(lines)):
        seen=set().union(*line_terms[max(0,i-context):min(len(lines),i+context+1)])
        score=(sum(idfs.get(t,0) for t in seen),sum(idfs.get(t,0) for t in line_terms[i]) if center_tiebreak else 0)
        if score>maximum:maximum=score;best=i+1
    return best


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--screen',type=Path,required=True)
    parser.add_argument('--manifest',type=Path,action='append',required=True)
    parser.add_argument('--root',type=Path,action='append',required=True)
    parser.add_argument('--model',required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists() or len(args.root)!=len(args.manifest):parser.error('New output and matching manifest/root counts required')
    import tiktoken
    encoding=tiktoken.get_encoding('cl100k_base')
    args.output.mkdir(parents=True)
    summaries=[json.loads(line) for line in (args.screen/'summaries.jsonl').read_text().split('\n') if line]
    records=[]
    for manifest,root in zip(args.manifest,args.root):
        dataset=load_dataset(manifest,root)
        queries={q.id:q for q in dataset.queries if q.split=='dev' and q.sequence is None}
        selected=next(s for s in summaries if s['config']['dataset']==dataset.id and s['config']['model_label']==args.model and s['config']['representation']=='intro-uniform' and s['config']['precision']=='int8' and s['config']['mode']=='hybrid-normalized' and s['config']['semantic_threshold']==.25)
        file=args.screen/args.model/(selected['run_sha256']+'.records.jsonl.gz')
        index=BM25(dataset)
        with gzip.open(file,'rt',encoding='utf-8') as stream:
            for line in stream:
                record=json.loads(line)
                query=queries[record['query_id']]
                original=json.loads(record['raw_stdout'])['results']
                _,idfs=lexical_scores(index,query.text)
                for style in ['line','window','window-center']:
                    rows=[]
                    for result in original:
                        row=dict(result)
                        if style!='line':
                            anchor=window_anchor(dataset.sources[row['path']].lines,idfs,selected['config']['context'],style=='window-center')
                            if anchor is not None:row['view']=view_at(dataset,row['path'],anchor,selected['config']['context'])
                        rows.append(row)
                    raw,retained=compact_response(rows,selected['config']['output_bytes'])
                    metric=score_query(query,[r['view'] for r in retained if r.get('view') is not None],dataset,paths=[r['path'] for r in retained])
                    records.append({'style':style,'query_id':query.id,'group':query.group,'dataset':dataset.id,'workload':query.workload,**metric,'stdout_tokens':len(encoding.encode(raw.decode('utf-8'),disallowed_special=())),'raw_stdout':raw.decode('utf-8')})
    with gzip.open(args.output/'records.jsonl.gz','wt',encoding='utf-8') as stream:
        for row in records:stream.write(json.dumps(row,ensure_ascii=False)+'\n')
    summary=[]
    for dataset in sorted({r['dataset'] for r in records}):
        for style in ['line','window','window-center']:
            rows=[r for r in records if r['dataset']==dataset and r['style']==style]
            summary.append({'dataset':dataset,'style':style,'metrics':{m:cluster_mean_ci(rows,m,seed=42) for m in ['ndcg','span_recall','span_precision','false_positive']},'stdout_tokens':statistics.mean(r['stdout_tokens'] for r in rows)})
    (args.output/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
    print(json.dumps(summary,indent=2))


if __name__=='__main__':main()
