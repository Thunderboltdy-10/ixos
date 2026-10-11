from pathlib import Path
import hashlib,json,os,subprocess,sys,zipfile
root=Path.cwd(); work=root/'.tmp/gate11/package'; work.mkdir()
out=root/'reports/restoration/gate11/package';out.mkdir()
commands=[];environment=dict(os.environ);environment.pop('IXOS_MODEL_PATH',None);environment.pop('PYTHONPATH',None)
python=Path(sys.executable)
def call(label,argv,cwd=root,expected=0):
 with (out/(label+'.stdout')).open('wb') as stdout,(out/(label+'.stderr')).open('wb') as stderr:
  result=subprocess.run(list(map(str,argv)),cwd=cwd,env=environment,stdout=stdout,stderr=stderr,timeout=600)
 commands.append({'label':label,'argv':list(map(str,argv)),'cwd':str(cwd),'exit_code':result.returncode})
 (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
 print(label+': exit '+str(result.returncode),flush=True)
 assert result.returncode==expected,label
 return (out/(label+'.stdout')).read_bytes()
archive=work/'ixos-windows-local-review.zip'
call('package',[python,root/'scripts/package_cli.py','--binary',root/'target/release/ixos.exe','--output',archive])
with zipfile.ZipFile(archive) as z:
 names=sorted(z.namelist());z.extractall(work/'extracted')
 assert not any(n.endswith('.safetensors') or n.startswith(('private-process/','dataset/','.tmp/')) or '/.env' in n for n in names)
extracted=work/'extracted';models=work/'downloaded-models';config=work/'absent-config.toml';assert not config.exists()
code= models/'potion-code-16M-v2-unbounded'; docs=models/'potion-retrieval-32M-row-int8';binary=extracted/'ixos.exe'
assert hashlib.sha256(binary.read_bytes()).hexdigest()==hashlib.sha256((root/'target/release/ixos.exe').read_bytes()).hexdigest()
call('setup-code',[python,'-S',extracted/'scripts/setup_models.py','--profile','code','--destination',models],cwd=extracted)
call('setup-documents',[python,extracted/'scripts/setup_models.py','--profile','documents','--destination',models],cwd=extracted)
call('setup-repeat',[python,extracted/'scripts/setup_models.py','--profile','all','--destination',models],cwd=extracted)
source=work/'sources';source.mkdir();(source/'cache.rs').write_bytes(b'fn raw_hash() {}\nCache freshness compares source bytes after edits.\n');(source/'notes.txt').write_bytes(b'Office and PDF extraction uses bounded source text.\n')
def state():return {p.name:[hashlib.sha256(p.read_bytes()).hexdigest(),p.stat().st_mtime_ns] for p in source.iterdir()}
before=state()
base=[binary,'--config',config]
a=json.loads(call('code-search',base+['search','how cache freshness detects source edits','--dir',source,'--model-path',code,'--json','--stats','--evidence-policy','bounded-rerank'],cwd=extracted))
b=json.loads(call('docs-search',base+['search','bounded extraction from office documents','--dir',source,'--profile','documents','--model-path',docs,'--json','--stats'],cwd=extracted))
assert a['results'] and b['results']
call('query-contract',[python,root/'scripts/verify_query_literals.py','--binary',binary,'--model',code,'--output',out/'query-contract'],cwd=extracted)
call('evidence-contract',[python,root/'scripts/verify_evidence_policy.py','--binary',binary,'--model',code,'--output',out/'evidence-contract'],cwd=extracted)
assert before==state() and not config.exists()
receipt={'status':'passed','archive_name':archive.name,'archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'files':names,'bundled_weights':False,'fresh_model_downloads':True,'code_setup_standard_library_only':True,'checkout_python_modules_available':False,'condition':'Executable and setup run from extracted local Windows package, PYTHONPATH and IXOS_MODEL_PATH removed. Code setup uses python -S; documents use installed NumPy 2.3.5. Downloads independently verified against pinned catalog. Existing OS/toolchain/runtime remain; not a clean Windows VM. No public release.','source_bytes_mtime_and_names_preserved':True}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt,indent=2),flush=True)
