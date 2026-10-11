from collections import Counter
import json
from pathlib import Path

base=Path(__file__).resolve().parent
win=json.loads((base/'native-windows/receipt.json').read_text())
linux=json.loads((base/'native-linux/probe/receipt.json').read_text())
summary={'status':'passed','cross_platform_response_equal':True,'platforms':{},
         'boundary':'72processes/144searches per OS, repeated correctness probes on first6pilot papers; no new independent gold or performance estimate. native-fill names the first native case, which may hit a previous evidence policy sharing the same record recipe.'}
assert win['status']==linux['status']=='passed' and win['source_preserved'] and linux['source_preserved']
assert win['model']['fingerprint']==linux['model']['fingerprint']
assert win['pilot_identity']==linux['pilot_identity']
def keyed(data):
    return {(r['paper_id'],r['representation'],r['policy'],r['mode']):r for r in data['cases']}
a,b=keyed(win),keyed(linux)
assert len(a)==len(b)==72 and a.keys()==b.keys()
for key in a:
    assert [r['sha256'] for r in a[key]['responses']]==[r['sha256'] for r in b[key]['responses']]
for platform,data in [('windows',win),('linux',linux)]:
    counters=Counter()
    warm_by_representation={}
    for case in data['cases']:
        first=case['responses'][0]['diagnostics']
        for field in ('nativeCacheHits','applicationCacheHits','cacheWrites','cacheWriteErrors','passagesEmbedded'):
            counters[field]+=first[field]
        if case['mode']=='native-warm':
            group=warm_by_representation.setdefault(case['representation'],Counter())
            group['native_hits']+=first['nativeCacheHits']
            group['application_hits']+=first['applicationCacheHits']
    summary['platforms'][platform]={'source_preserved':True,'cases':len(data['cases']),
                                    'first_response_counters':dict(counters),'native_warm_by_representation':warm_by_representation}
(base/'cache-audit.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2))
