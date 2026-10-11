from pathlib import Path
import json
import os
import subprocess
import sys

root = Path(__file__).resolve().parents[3]
os.chdir(root)
out = root/'reports/restoration/gate17'
code = root/'.tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded'
docs = root/'.tmp/gate4/reviewer-models/potion-retrieval-32M-row-int8'
binary = root/'target/release/ixos.exe'
commands = []
def run(label, argv):
    argv = list(map(str,argv))
    raw = subprocess.run(argv,capture_output=True,timeout=900)
    (out/(label+'.stdout')).write_bytes(raw.stdout)
    (out/(label+'.stderr')).write_bytes(raw.stderr)
    commands.append({'label':label,'argv':argv,'exit_code':raw.returncode})
    (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
    assert raw.returncode==0,label
    print(label+': passed',flush=True)
run('stability',[sys.executable,'scripts/verify_session_stability.py','--binary',binary,'--code-model',code,'--documents-model',docs,'--root',root/'.tmp/gate11/reviewer-source/src','--output',out/'after'])
run('precision',[sys.executable,'scripts/verify_cache_precision.py','--binary',binary,'--code-model',code,'--documents-model',docs,'--root',root/'.tmp/gate11/reviewer-source/src','--output',out/'precision'])
run('doctor',[sys.executable,'scripts/verify_doctor.py','--binary',binary,'--code-model',code,'--documents-model',docs,'--output',out/'doctor'])
run('profiles',[sys.executable,'scripts/verify_restored_cli.py','--binary',binary,'--code-model',code,'--documents-model',docs,'--frozen-binary',root/'models/lab/restoration/test-code-native-warm/ixos.exe','--output',out/'profiles.json'])
