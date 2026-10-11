from pathlib import Path
import hashlib, json, os, subprocess, sys, zipfile
root=Path(__file__).resolve().parents[2]; os.chdir(root)
out=root/'reports/restoration/gate13/final'; out.mkdir()
binary=root/'target/release/ixos.exe'; code=root/'.tmp/gate11/package/downloaded-models/potion-code-16M-v2-unbounded'; docs=root/'.tmp/gate11/package/downloaded-models/potion-retrieval-32M-row-int8'
env=dict(os.environ); env.pop('IXOS_MODEL_PATH',None); env.pop('PYTHONPATH',None); commands=[]
def run(label,argv,cwd=root):
 raw=subprocess.run(list(map(str,argv)),cwd=cwd,env=env,capture_output=True,timeout=1200)
 (out/(label+'.stdout')).write_bytes(raw.stdout); (out/(label+'.stderr')).write_bytes(raw.stderr)
 commands.append({'label':label,'argv':list(map(str,argv)),'cwd':str(cwd),'exit_code':raw.returncode})
 (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
 assert raw.returncode==0,label
 print(label+': passed',flush=True)
 return raw
query='where are embedding vectors converted to bytes before writing native cache'
search=run('own-search',[binary,'--config',root/'.tmp/gate13/absent.toml','search',query,'--dir',root/'src','--model-path',code,'--cache-mode','ephemeral','--json','--stats'])
run('own-grep',[binary,'grep','quantize','--dir',root/'src','-F','--limit','10','--max-output-bytes','4000'])
run('own-read',[binary,'read','retrieval/cache.rs','--dir',root/'src','--start','188','--lines','42','--max-output-bytes','4500'])
run('own-read-pipeline',[binary,'read','retrieval/mod.rs','--dir',root/'src','--start','469','--lines','34','--max-output-bytes','4500'])
source=root/'.tmp/gate13/reviewer-source'; source.mkdir()
run('export',['git','checkout-index','--all','--prefix=.tmp/gate13/reviewer-source/'])
assert all((source/p.relative_to(root)).read_bytes()==p.read_bytes() for p in (root/'eval').glob('*.py'))
target=root/'.tmp/gate4/reviewer-target'
run('source-build',['cargo','build','--release','--locked','--bin','ixos','--target-dir',target],source)
run('source-profiles',[sys.executable,source/'scripts/verify_restored_cli.py','--binary',target/'release/ixos.exe','--code-model',code,'--documents-model',docs,'--frozen-binary',root/'models/lab/restoration/test-code-native-warm/ixos.exe','--output',out/'source-profiles.json'],source)
archive=root/'.tmp/gate13/ixos-windows-local.zip'
run('package',[sys.executable,'scripts/package_cli.py','--binary',binary,'--output',archive])
extracted=root/'.tmp/gate13/extracted'; extracted.mkdir()
with zipfile.ZipFile(archive) as package: package.extractall(extracted)
run('package-setup',[sys.executable,extracted/'scripts/setup_models.py','--profile','all','--destination',code.parent],extracted)
run('package-profiles',[sys.executable,root/'scripts/verify_restored_cli.py','--binary',extracted/'ixos.exe','--code-model',code,'--documents-model',docs,'--output',out/'package-profiles.json'],extracted)
rows=json.loads(search.stdout)['results']
receipt={'status':'passed','binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'exported_binary_sha256':hashlib.sha256((target/'release/ixos.exe').read_bytes()).hexdigest(),'archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'own_search_paths':[r['path'] for r in rows],'own_trace_note':'Exploratory navigation after the defect was already understood, not a blind agent-task benchmark. Grep and two bounded reads verify the actual serializer/pipeline. Individual raw outputs retained.','frozen_evaluator_matches':True,'condition':'Fresh source index export with reused dependency/toolchain cache; extracted package reuses Gate11 independently downloaded pinned parents without checkout imports. Not clean OS or new download proof.'}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
