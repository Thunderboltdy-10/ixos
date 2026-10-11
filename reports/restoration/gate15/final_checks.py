from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[3]
os.chdir(root)
out = root/'reports/restoration/gate15/final'
out.mkdir()
binary = root/'target/release/ixos.exe'
code = root/'.tmp/gate11/package/downloaded-models/potion-code-16M-v2-unbounded'
docs = root/'.tmp/gate11/package/downloaded-models/potion-retrieval-32M-row-int8'
environment = dict(os.environ)
environment.pop('IXOS_MODEL_PATH', None)
environment.pop('PYTHONPATH', None)
commands = []


def run(label, argv, cwd=root):
    argv = list(map(str, argv))
    raw = subprocess.run(argv, cwd=cwd, env=environment, capture_output=True, timeout=1200)
    (out/(label+'.stdout')).write_bytes(raw.stdout)
    (out/(label+'.stderr')).write_bytes(raw.stderr)
    commands.append({'label':label,'argv':argv,'cwd':str(cwd),'exit_code':raw.returncode})
    (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
    assert raw.returncode == 0, label
    print(label+': passed',flush=True)
    return raw


source = root/'.tmp/gate15/reviewer-source'
source.mkdir()
run('export', ['git','checkout-index','--all','--prefix=.tmp/gate15/reviewer-source/'])
assert all((source/p.relative_to(root)).read_bytes()==p.read_bytes() for p in (root/'eval').glob('*.py'))
for relative in ['src/main.rs','src/cli/commands.rs','src/diagnostics.rs','src/diagnostics/retrieval.rs']:
    assert (source/relative).read_bytes().replace(b'\r\n',b'\n')==(root/relative).read_bytes().replace(b'\r\n',b'\n')
target = root/'.tmp/gate4/reviewer-target'
run('source-build', ['cargo','build','--release','--locked','--bin','ixos','--target-dir',target,'--jobs','2'],source)
run('source-doctor', [sys.executable,source/'scripts/verify_doctor.py','--binary',target/'release/ixos.exe','--code-model',code,'--documents-model',docs,'--output',out/'source-doctor'],source)
run('source-profiles', [sys.executable,source/'scripts/verify_restored_cli.py','--binary',target/'release/ixos.exe','--code-model',code,'--documents-model',docs,'--frozen-binary',root/'models/lab/restoration/test-code-native-warm/ixos.exe','--output',out/'source-profiles.json'],source)
archive = root/'.tmp/gate15/ixos-windows-local.zip'
run('package',[sys.executable,'scripts/package_cli.py','--binary',binary,'--output',archive])
extracted = root/'.tmp/gate15/extracted'
extracted.mkdir()
with zipfile.ZipFile(archive) as package:
    package.extractall(extracted)
assert (extracted/'docs/engineering/RESOURCES.md').read_bytes()==(root/'docs/engineering/RESOURCES.md').read_bytes()
run('package-setup',[sys.executable,extracted/'scripts/setup_models.py','--profile','all','--destination',code.parent],extracted)
run('package-doctor',[sys.executable,root/'scripts/verify_doctor.py','--binary',extracted/'ixos.exe','--code-model',code,'--documents-model',docs,'--output',out/'package-doctor'],extracted)
run('package-profiles',[sys.executable,root/'scripts/verify_restored_cli.py','--binary',extracted/'ixos.exe','--code-model',code,'--documents-model',docs,'--output',out/'package-profiles.json'],extracted)
receipt = {'status':'passed','binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),
    'exported_binary_sha256':hashlib.sha256((target/'release/ixos.exe').read_bytes()).hexdigest(),
    'archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'frozen_evaluator_matches':True,
    'exported_file_count':sum(p.is_file() for p in source.rglob('*')),
    'condition':'Fresh source index export/rebuild with reused dependency/toolchain cache; extracted local package setup verifies existing Gate11 independent downloads, no PYTHONPATH/checkout imports. Not a clean OS or fresh download proof.'}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
