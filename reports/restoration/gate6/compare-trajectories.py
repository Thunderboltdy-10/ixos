import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path.cwd()))
from eval.contract import paired_family_difference
root=Path('reports/restoration/gate6')
methods=['hybrid','lexical','bm25','rg']
inputs={policy:{method:json.loads((root/folder/(method+'.json')).read_text()) for method in methods}
        for policy,folder in [('top3-cue','trajectory-v2'),('top6','trajectory-top6-v1')]}
def rows(value):
    return [{'query_id':r['query_id'],'group':r['group'],**r['final']} for r in value['per_task']]
result={'condition':'Eight inspected development tasks, four initial search methods, two explicit gold-blind deterministic navigation policies. Thirty-two completed trajectories per policy; source/evidence validated, actual model. No default/search-recipe selection, held-out generalization, autonomous coding success or official ContextBench leaderboard.',
        'methods':{},'paired':{}}
for policy,values in inputs.items():
    result['methods'][policy]={method:{key:r[key] for key in ['tasks','families','initial_span_recall_mean','cumulative_span_recall','cumulative_span_precision','mean_calls','mean_stdout_tokens','mean_stderr_tokens','mean_request_tokens','mean_tool_wall_ms','mean_prepare_ms','tasks_with_any_annotated_overlap']} for method,r in values.items()}
    result['paired'][policy]={method:paired_family_difference(rows(values[method]),rows(values['hybrid']),'span_recall',seed=42) for method in ['lexical','bm25','rg']}
result['paired_top6_minus_top3']={method:paired_family_difference(rows(inputs['top3-cue'][method]),rows(inputs['top6'][method]),'span_recall',seed=42) for method in methods}
(root/'trajectory-comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result['paired'],indent=2))
print(json.dumps(result['paired_top6_minus_top3'],indent=2))
