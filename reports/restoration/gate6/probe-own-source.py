import hashlib
import json
from pathlib import Path
import subprocess
root=Path('src')
destination=Path('reports/restoration/gate6/windows')
def identity():
    return {p.relative_to(root).as_posix():{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mtime_ns':p.stat().st_mtime_ns}
            for p in root.rglob('*') if p.is_file()}
before=identity()
binary=Path('target/release/ixos.exe')
model=Path('.tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded')
query='how cache metadata writes preserve the original file modification time'
rows=[]
for label,mode in [('jit','ephemeral'),('native-existing','native-cache'),('native-warm','native-cache')]:
    argv=[str(binary.resolve()),'search',query,'--dir',str(root.resolve()),'--model-path',str(model.resolve()),
          '--cache-mode',mode,'--json','--stats']
    r=subprocess.run(argv,capture_output=True,timeout=120,check=True)
    (destination/('own-'+label+'.stdout')).write_bytes(r.stdout)
    (destination/('own-'+label+'.stderr')).write_bytes(r.stderr)
    stats=json.loads(r.stderr)['diagnostics']
    paths=[row['path'] for row in json.loads(r.stdout)['results']]
    rows.append({'label':label,'argv':argv,'paths':paths,'diagnostics':stats})
assert identity()==before
assert rows[2]['diagnostics']['passagesEmbedded']==0
assert rows[2]['diagnostics']['nativeCacheHits']==rows[2]['diagnostics']['searchableFiles']
argv=[str(binary.resolve()),'grep','--dir',str(root.resolve()),'-F','--limit','3','--','SetFileTime']
r=subprocess.run(argv,capture_output=True,timeout=120,check=True)
(destination/'own-grep.stdout').write_bytes(r.stdout)
(destination/'own-grep.stderr').write_bytes(r.stderr)
assert any(row['path']=='storage/ads_windows.rs' for row in json.loads(r.stdout)['results'])
assert identity()==before
receipt={'condition':'Own-source authored concept and exact-symbol navigation; not independent gold, controlled latency or autonomous task success. First native call can reuse existing records; only final native-warm asserts complete actual hits.',
         'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'source_file_count':len(before),
         'source_identity_sha256':hashlib.sha256(json.dumps(before,sort_keys=True).encode()).hexdigest(),
         'all_primary_bytes_and_mtimes_preserved':True,'calls':rows,'grep_argv':argv}
(destination/'own-source.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'first':rows[0]['paths'][:3],'native_warm_files':rows[2]['diagnostics']['nativeCacheHits'],'primary_bytes_and_mtime_unchanged':True}))
