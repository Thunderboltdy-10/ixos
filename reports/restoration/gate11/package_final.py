from pathlib import Path
import hashlib,json,os,subprocess,sys,zipfile
root=Path.cwd();work=root/'.tmp/gate11/package';out=root/'reports/restoration/gate11/package-final';out.mkdir()
archive=work/'ixos-windows-final-local-review.zip';env=dict(os.environ);env.pop('PYTHONPATH',None);env.pop('IXOS_MODEL_PATH',None);commands=[]
def call(label,words,cwd=root):
 argv=list(map(str,words));result=subprocess.run(argv,cwd=cwd,env=env,capture_output=True,timeout=120)
 (out/(label+'.stdout')).write_bytes(result.stdout);(out/(label+'.stderr')).write_bytes(result.stderr);commands.append({'label':label,'argv':argv,'cwd':str(cwd),'exit_code':result.returncode});(out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8');assert result.returncode==0,label
call('package',[sys.executable,root/'scripts/package_cli.py','--binary',root/'target/release/ixos.exe','--output',archive])
extracted=work/'extracted-final'
with zipfile.ZipFile(archive) as z:z.extractall(extracted);names=sorted(z.namelist())
for name in names:
 if name not in ['README.md','ixos.exe']:assert (extracted/name).read_bytes()==(root/name).read_bytes(),name
models=work/'downloaded-models';binary=extracted/'ixos.exe'
call('setup',[sys.executable,extracted/'scripts/setup_models.py','--profile','all','--destination',models],cwd=extracted)
call('query',[sys.executable,root/'scripts/verify_query_literals.py','--binary',binary,'--model',models/'potion-code-16M-v2-unbounded','--output',out/'query'],cwd=extracted)
receipt={'status':'passed','archive_name':archive.name,'archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'files':names,'bundled_weights':False,'current_packaged_sources_byte_equal':True,'condition':'Final docs refresh; extracted archive sources match current files byte-for-byte. Reuse only independently downloaded and verified gate11 package models. Fresh setup/download/executable proof retained in package/. No source checkout imports or publication.'}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt,indent=2))
