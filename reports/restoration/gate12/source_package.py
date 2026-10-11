from pathlib import Path
import hashlib, json, os, subprocess, sys, zipfile
root = Path(__file__).resolve().parents[2]
os.chdir(root)
out = root/'reports/restoration/gate12/source-package'
out.mkdir()
source = root/'.tmp/gate12/reviewer-source'
target = root/'.tmp/gate4/reviewer-target'
models = root/'.tmp/gate11/package/downloaded-models'
code = models/'potion-code-16M-v2-unbounded'
docs = models/'potion-retrieval-32M-row-int8'
environment = dict(os.environ)
environment.pop('IXOS_MODEL_PATH', None)
environment.pop('PYTHONPATH', None)
commands = []
def run(label, argv, cwd):
    raw = subprocess.run(list(map(str, argv)), cwd=cwd, env=environment, capture_output=True, timeout=1200)
    (out/(label+'.stdout')).write_bytes(raw.stdout)
    (out/(label+'.stderr')).write_bytes(raw.stderr)
    commands.append({'label':label,'argv':list(map(str,argv)),'cwd':str(cwd),'exit_code':raw.returncode})
    (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
    assert raw.returncode == 0, label
    print(label+': passed',flush=True)
names = subprocess.check_output(['git','ls-files','-z']).decode('utf-8').strip('\0').split('\0')
assert len(names) == len([p for p in source.rglob('*') if p.is_file()])
assert not any(n.startswith(('private-process/','.tmp/','target/')) or n.endswith('.safetensors') or (Path(n).name.startswith('.env') and Path(n).name!='.env.example') for n in names)
source_hashes = {n:hashlib.sha256((source/n).read_bytes()).hexdigest() for n in names if n.endswith('.rs') or n in ['Cargo.toml','Cargo.lock','config/retrieval-models.json']}
assert all((source/p.relative_to(root)).read_bytes()==p.read_bytes() for p in (root/'eval').glob('*.py'))
run('build',['cargo','build','--release','--locked','--bin','ixos','--target-dir',target],source)
binary = target/'release/ixos.exe'
run('profiles',[sys.executable,source/'scripts/verify_restored_cli.py','--binary',binary,'--code-model',code,'--documents-model',docs,'--frozen-binary',root/'models/lab/restoration/test-code-native-warm/ixos.exe','--output',out/'profiles.json'],source)
run('query',[sys.executable,source/'scripts/verify_query_literals.py','--binary',binary,'--model',code,'--output',out/'query'],source)
package = root/'.tmp/gate12/ixos-windows-local-review.zip'
run('package',[sys.executable,root/'scripts/package_cli.py','--binary',root/'target/release/ixos.exe','--output',package],root)
extracted = root/'.tmp/gate12/extracted'
extracted.mkdir()
with zipfile.ZipFile(package) as archive:
    archive.extractall(extracted)
for name in ['docs/licenses/model2vec-rs-MIT.txt','scripts/setup_models.py','docs/ARCHITECTURE.md','docs/models/README.md']:
    assert (extracted/name).read_bytes()==(root/name).read_bytes()
run('setup',[sys.executable,extracted/'scripts/setup_models.py','--profile','all','--destination',models],extracted)
run('package-query',[sys.executable,root/'scripts/verify_query_literals.py','--binary',extracted/'ixos.exe','--model',code,'--output',out/'package-query'],extracted)
run('package-profiles',[sys.executable,root/'scripts/verify_restored_cli.py','--binary',extracted/'ixos.exe','--code-model',code,'--documents-model',docs,'--output',out/'package-profiles.json'],extracted)
receipt = {'status':'passed','exported_files':len(names),'source_hashes':source_hashes,'export_binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'package_binary_sha256':hashlib.sha256((extracted/'ixos.exe').read_bytes()).hexdigest(),'archive_sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'frozen_evaluator_bytes_match':True,'upstream_notice_bundled':True,'no_private_weights_envs':True,'condition':'Fresh Git-index source export; existing separate Cargo target/toolchain cache reused. Extracted package has no PYTHONPATH or source dependency; pinned parent downloads independently verified at Gate11 are reused. Not a clean OS or new download proof.'}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
