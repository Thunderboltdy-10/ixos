"""Documentation-only final package refresh; pinned downloads reused explicitly."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[3]
out = root/'reports/restoration/gate15/package-final'
out.mkdir()
environment = dict(os.environ)
environment.pop('PYTHONPATH',None)
environment.pop('IXOS_MODEL_PATH',None)
archive = root/'.tmp/gate15/ixos-windows-final.zip'
code = root/'.tmp/gate11/package/downloaded-models/potion-code-16M-v2-unbounded'
docs = root/'.tmp/gate11/package/downloaded-models/potion-retrieval-32M-row-int8'
commands = []
def run(label, argv, cwd=root):
    argv = list(map(str,argv))
    raw = subprocess.run(argv,cwd=cwd,env=environment,capture_output=True,timeout=120)
    (out/(label+'.stdout')).write_bytes(raw.stdout)
    (out/(label+'.stderr')).write_bytes(raw.stderr)
    commands.append({'label':label,'argv':argv,'cwd':str(cwd),'exit_code':raw.returncode})
    assert raw.returncode==0,label
run('package',[sys.executable,root/'scripts/package_cli.py','--binary',root/'target/release/ixos.exe','--output',archive])
extracted = root/'.tmp/gate15/package-final'
extracted.mkdir()
with zipfile.ZipFile(archive) as package:
    package.extractall(extracted)
for name in ('docs/getting-started/INSTALLATION.md','docs/CLI.md','docs/engineering/RESOURCES.md','skills/ixos-retrieval/SKILL.md'):
    assert (extracted/name).read_bytes()==(root/name).read_bytes()
run('doctor',[sys.executable,root/'scripts/verify_doctor.py','--binary',extracted/'ixos.exe','--code-model',code,'--documents-model',docs,'--output',out/'doctor'],extracted)
(out/'receipt.json').write_text(json.dumps({'status':'passed','archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
    'commands':commands,'condition':'Documentation-only package refresh; unchanged tested executable and Gate11 downloaded parents reused, no fresh download claim.'},indent=2)+'\n',encoding='utf-8')
print('Final package current documentation bytes and ten actual doctor cases passed')
