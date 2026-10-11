import hashlib, json, os, shutil, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)
out = ROOT/'reports/restoration/gate12'
code = ROOT/'.tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded'
docs = ROOT/'.tmp/gate4/reviewer-models/potion-retrieval-32M-row-int8'
binary = ROOT/'target/release/ixos.exe'
commands = []
def run(label, argv):
    commands.append({'label': label, 'argv': list(map(str, argv))})
    raw = subprocess.run(list(map(str, argv)), capture_output=True, timeout=1200)
    (out/(label+'.stdout')).write_bytes(raw.stdout)
    (out/(label+'.stderr')).write_bytes(raw.stderr)
    commands[-1]['exit_code'] = raw.returncode
    (out/'windows-commands.json').write_text(json.dumps(commands, indent=2)+'\n', encoding='utf-8')
    assert raw.returncode == 0, label
    print(label+': passed', flush=True)
run('final-bridge-build', ['cargo','build','--release','--locked','--bin','ixos-lab-embed'])
shutil.copy2(ROOT/'target/release/ixos-lab-embed.exe', ROOT/'.tmp/gate12/encoded-final-embed.exe')
paths = ['Cargo.toml','Cargo.lock','src/ixos_embed/encoded_model.rs','src/ixos_embed/model2vec.rs','src/ixos_embed/mod.rs','src/retrieval/mod.rs','src/bin/ixos-lab-embed.rs','scripts/compare_encoded_loader.py','scripts/compare_cli_loaders.py']
snapshot = ROOT/'models/lab/restoration/encoded-loader-final-source'
snapshot.mkdir()
hashes = {}
for relative in paths:
    target = snapshot/relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT/relative, target)
    hashes[relative] = hashlib.sha256(target.read_bytes()).hexdigest()
(out/'final-source.json').write_text(json.dumps({'files': hashes, 'cli_binary': hashlib.sha256(binary.read_bytes()).hexdigest(), 'bridge_binary': hashlib.sha256((ROOT/'.tmp/gate12/encoded-final-embed.exe').read_bytes()).hexdigest(), 'v3_change': 'Only loader attribution/identity comments changed after v3 measurement; current CLI constructor selects encoded. Current exact source snapshot and rebuilt bridge retained here.'}, indent=2)+'\n', encoding='utf-8')
run('query', [sys.executable,'scripts/verify_query_literals.py','--binary',binary,'--model',code,'--output',out/'query'])
run('evidence', [sys.executable,'scripts/verify_evidence_policy.py','--binary',binary,'--model',code,'--output',out/'evidence'])
run('engine', [sys.executable,'scripts/verify_retrieval_engine.py','--binary',binary,'--model',code,'--output',out/'engine.json'])
run('profiles', [sys.executable,'scripts/verify_restored_cli.py','--binary',binary,'--code-model',code,'--documents-model',docs,'--frozen-binary',ROOT/'models/lab/restoration/test-code-native-warm/ixos.exe','--output',out/'profiles.json'])
run('cli-costs', [sys.executable,'scripts/compare_cli_loaders.py','--reference-binary',ROOT/'.tmp/gate12/control-ixos.exe','--binary',binary,'--code-model',code,'--documents-model',docs,'--root',ROOT/'.tmp/gate11/reviewer-source/src','--runs','5','--warm-runs','10','--output',out/'cli-costs'])
