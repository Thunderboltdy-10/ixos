"""Verify selected real-model identities in all saved diagnostic cases."""
import hashlib
import json
from pathlib import Path

base = Path(__file__).resolve().parent
expected = {'code': '835fb9be0368efb6a64fd54039d4e79100add78ac50e2dc219daca32a62f5972',
            'documents': '6966e61ba93fe416b36af3190469553e7c5447c8e3675ec034d4ee7ec0223f88'}
rows = []
for directory in ('after', 'linux/doctor'):
    for name, model in [('code-config','code'), ('documents-config','documents'), ('explicit-code','code'),
                        ('environment-precedence','documents'), ('explicit-over-environment','code')]:
        path = base/directory/(name+'.stdout')
        report = json.loads(path.read_text())
        selected = next(c for c in report['checks'] if c['id']=='retrieval_model')
        assert selected['status']=='PASS' and 'fingerprint='+expected[model] in selected['details']
        rows.append({'path':path.relative_to(base).as_posix(), 'expected_model':model,
                     'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
linux_before = json.loads((base/'linux/doctor-before.stdout').read_text())
assert linux_before['summary']['fail'] > 0 and (base/'linux/doctor-before.exit').read_text().strip()=='0'
(base/'identity-audit.json').write_text(json.dumps({'status':'passed','quality_benchmark':False,
    'model_selections':rows,'legacy_json_failure_exited_zero':True},indent=2)+'\n',encoding='utf-8')
print('Ten selected model identities and legacy JSON failure exit verified')
