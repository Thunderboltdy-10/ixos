"""Compare exact configurations across independent repository families."""
from __future__ import annotations
import argparse
from collections import defaultdict
import gzip
import json
from pathlib import Path
import statistics
from eval.contract import cluster_mean_ci,paired_family_difference


def records(screen,summary):
    path=screen/summary['config']['model_label']/(summary['run_sha256']+'.records.jsonl.gz')
    with gzip.open(path,'rt',encoding='utf-8') as stream: return [json.loads(line) for line in stream]


def baseline_rows(path,workload):
    grouped=defaultdict(list)
    for line in path.read_text(encoding='utf-8').split('\n'):
        if not line: continue
        row=json.loads(line)
        if workload=='code-agent' and not row['dataset'].startswith('semble-'): continue
        if workload=='document-agent' and 'scifact' not in row['dataset']: continue
        grouped[row['query_id']].append(row)
    return [{'query_id':qid,'group':rows[0]['group'],**{m:statistics.mean(r['metrics'][m] for r in rows) if rows[0]['metrics'][m] is not None else None for m in ['ndcg','mrr','recall','span_recall','span_precision','false_positive']},'stdout_tokens':statistics.mean(r['stdout_tokens'] for r in rows)} for qid,rows in grouped.items()]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--screen',type=Path,required=True)
    parser.add_argument('--baseline',type=Path,action='append',default=[])
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    grouped=defaultdict(list)
    for line in (args.screen/'summaries.jsonl').read_text(encoding='utf-8').split('\n'):
        if not line: continue
        summary=json.loads(line)
        for workload in summary['workloads']:
            if summary['config']['dataset'].startswith('ixos-controlled'): continue
            grouped[(summary['config_sha256'],workload)].append(summary)
    report=[]
    for (config_hash,workload),summaries in grouped.items():
        rows=[r for s in summaries for r in records(args.screen,s)]
        metrics={m:cluster_mean_ci(rows,m,seed=42) for m in ['ndcg','mrr','recall','span_recall','span_precision']}
        entry={'recipe_sha256':config_hash,'config':{k:v for k,v in summaries[0]['config'].items() if k not in {'dataset','split'}},'workload':workload,'metrics':metrics,'stdout_tokens':statistics.mean(r['stdout_tokens'] for r in rows),'vector_payload_bytes':sum(s['vector_payload_bytes'] for s in summaries),'selected_passages':sum(s['selected_passages'] for s in summaries),'paired_differences':{}}
        for baseline in args.baseline:
            left=baseline_rows(baseline,workload)
            if {r['query_id'] for r in left}!={r['query_id'] for r in rows}: continue
            entry['paired_differences'][baseline.parent.name]=paired_family_difference(left,rows,'ndcg',seed=42)
        report.append(entry)
    report.sort(key=lambda r:(r['workload'],-r['metrics']['ndcg']['mean']))
    args.output.write_text(json.dumps({'condition':'Development/validation quality comparison; two code families give wide uncertainty. No latency comparisons with memoized matrix math.','screen':str(args.screen),'results':report},indent=2),encoding='utf-8')
    for workload in sorted({r['workload'] for r in report}):
        print(workload)
        for row in [r for r in report if r['workload']==workload][:8]:
            c=row['config']
            print(f"{row['metrics']['ndcg']['mean']:.6f} {c['model_label']} {c['representation']} {c['precision']} {c['mode']} floor={c['semantic_threshold']} tokens={row['stdout_tokens']:.1f}")


if __name__=='__main__': main()
