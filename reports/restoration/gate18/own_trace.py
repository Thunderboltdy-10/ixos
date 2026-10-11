"""Already-informed Ixos self-navigation, retained as usability evidence only."""
import json
from pathlib import Path
import subprocess
import sys

root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root))
from scripts.qasper.contract import sha
from scripts.qasper.cache_probe import state
import tiktoken

out=Path(__file__).resolve().parent/'own-trace'
out.mkdir(exist_ok=False)
before=state(root/'src')
config=root/'.tmp/gate18/own-trace-config.toml'
config.write_text('[retrieval]\ncontext=1\nlimit=5\noutput_bytes=3500\ntypo_correction=false\n',encoding='utf-8')
encoding=tiktoken.get_encoding('cl100k_base')
rows=[]

def run(label,args):
    argv=[str(root/'target/release/ixos.exe'),'--config',str(config),*args]
    raw=subprocess.run(argv,capture_output=True,timeout=120,cwd=root)
    (out/(label+'.stdout')).write_bytes(raw.stdout)
    (out/(label+'.stderr')).write_bytes(raw.stderr)
    rows.append({'label':label,'argv':argv,'exit_code':raw.returncode,
                 'stdout_tokens':len(encoding.encode(raw.stdout.decode(),disallowed_special=())),
                 'stderr_tokens':len(encoding.encode(raw.stderr.decode(),disallowed_special=()))})
    assert raw.returncode==0
    return json.loads(raw.stdout)

search=run('search',['search','What happens when one long source line exceeds the JSON output budget?',
           '--dir','src','--model-path','.tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded','--json','--stats'])
grep=run('grep',['grep','row.view = None','--dir','src','-F','--limit','3','--max-output-bytes','2500'])
hit=grep['results'][0]['view']
assert hit['path']=='retrieval/mod.rs'
read=run('read',['read',hit['path'],'--dir','src','--start',str(max(1,hit['start_line']-16)),
                 '--lines','30','--max-output-bytes','3500'])
assert state(root/'src')==before
receipt={'status':'passed','informed_trace_not_blind_benchmark':True,'binary_sha256':sha((root/'target/release/ixos.exe').read_bytes()),
         'source_preserved':True,'commands':rows,'search_paths':[r['path'] for r in search['results']],
         'total_stdout_tokens':sum(r['stdout_tokens'] for r in rows),'total_diagnostic_tokens':sum(r['stderr_tokens'] for r in rows),
         'finding':'Search supplies candidate code; exact grep/read verifies whole-view -> anchor-line -> explicit file-only fallback. No invented/truncated line is returned.'}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,indent=2))
