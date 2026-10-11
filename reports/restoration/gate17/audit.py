import hashlib
import json
from pathlib import Path

base = Path(__file__).resolve().parent
summary = {'status':'passed','quality_benchmark':False,'rows':[],'cross_platform_follow_equal':True}
expected = {}
for platform, prefix in [('windows',base),('linux',base/'linux')]:
    before = json.loads((prefix/'before/receipt.json').read_text())
    after = json.loads((prefix/'after/receipt.json').read_text())
    assert before['status']=='reproduced' and after['status']=='passed'
    assert before['source_preserved'] and after['source_preserved']
    assert before['sources']==after['sources']
    for control,candidate in zip(before['runs'],after['runs']):
        key = (Path(control['model']['path']).name,control['condition'])
        assert control['model']['fingerprint']==candidate['model']['fingerprint']
        assert candidate['distinct_follow_outputs']==1
        signature = candidate['follows'][0]['sha256']
        if key in expected:
            assert signature == expected[key], key
        else:
            expected[key]=signature
        first = dict(control['follows'][0]['scores'])
        delta = max(abs(score-first.get(path,score)) for follow in control['follows'] for path,score in follow['scores'])
        orders = set(tuple(path for path,_ in follow['scores']) for follow in control['follows'])
        summary['rows'].append({'platform':platform,'model':key[0],'condition':key[1],
            'before_distinct_outputs':control['distinct_follow_outputs'],'after_distinct_outputs':1,
            'before_distinct_path_orders':len(orders),'maximum_observed_score_delta':delta,'candidate_follow_sha256':signature})
minimum = json.loads((base/'msrv/stability/receipt.json').read_text())
assert minimum['status']=='passed' and minimum['source_preserved']
assert minimum['sources']==json.loads((base/'linux/after/receipt.json').read_text())['sources']
for run in minimum['runs']:
    key = (Path(run['model']['path']).name, run['condition'])
    assert run['distinct_follow_outputs']==1
    assert run['follows'][0]['sha256']==expected[key]
summary['minimum_compiler_follow_equal']=True
summary['minimum_compiler_binary_sha256']=minimum['binary_sha256']
(base/'audit.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2))
