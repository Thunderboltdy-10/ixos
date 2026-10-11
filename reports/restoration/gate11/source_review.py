from pathlib import Path
import hashlib,json,os,subprocess,sys
root=Path.cwd();source=root/'.tmp/gate11/reviewer-source'; binary=root/'.tmp/gate4/reviewer-target/release/ixos.exe'; models=root/'.tmp/gate11/package/downloaded-models';out=root/'reports/restoration/gate11/source-runtime';out.mkdir()
env=dict(os.environ);env.pop('IXOS_MODEL_PATH',None);env['PYTHONPATH']=str(root/'private-process/eval-deps'); commands=[]
def call(label,words):
 argv=[str(a) for a in words]
 with (out/(label+'.stdout')).open('wb') as stdout,(out/(label+'.stderr')).open('wb') as stderr:
  result=subprocess.run(argv,cwd=source,env=env,stdout=stdout,stderr=stderr,timeout=120)
 commands.append({'label':label,'argv':argv,'cwd':str(source),'exit_code':result.returncode});(out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
 print(label+': exit '+str(result.returncode),flush=True);assert result.returncode==0,label
code=models/'potion-code-16M-v2-unbounded'; docs=models/'potion-retrieval-32M-row-int8'
call('profiles',[sys.executable,source/'scripts/verify_restored_cli.py','--binary',binary,'--code-model',code,'--documents-model',docs,'--frozen-binary',root/'models/lab/restoration/test-code-native-warm/ixos.exe','--output',out/'profiles.json'])
call('query',[sys.executable,source/'scripts/verify_query_literals.py','--binary',binary,'--model',code,'--output',out/'query'])
call('evidence',[sys.executable,source/'scripts/verify_evidence_policy.py','--binary',binary,'--model',code,'--output',out/'evidence'])
call('engine',[sys.executable,source/'scripts/verify_retrieval_engine.py','--binary',binary,'--model',code,'--output',out/'engine.json'])
receipt={'status':'passed','binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'source_export':json.loads((root/'reports/restoration/gate11/source-export.json').read_text()),'condition':'Actual executable independently rebuilt from staged source export in an existing separate dependency target; exported Python probes use third-party eval dependencies only, not root modules. Independent package-downloaded code/doc artifacts. Not a clean OS or fresh Cargo registry.'}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps({'status':'passed','binary_sha256':receipt['binary_sha256']},indent=2))
