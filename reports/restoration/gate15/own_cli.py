"""Informed current-code navigation, explicitly not a blind agent benchmark."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent/'own-cli'
out.mkdir()
binary = root/'target/release/ixos.exe'
source = root/'src'


def snapshot():
    return {p.relative_to(source).as_posix():[hashlib.sha256(p.read_bytes()).hexdigest(),p.stat().st_mtime_ns]
            for p in source.rglob('*') if p.is_file()}


before = snapshot()
environment = dict(os.environ)
environment.pop('IXOS_MODEL_PATH', None)
commands = []
for label, words in [
    ('doctor', ['doctor','--dir',source,'--json']),
    ('search', ['search','where does the CLI choose which model to diagnose','--dir',source,'--json','--cache-mode','ephemeral']),
    ('grep', ['grep','run_cli_doctor','--dir',source,'-F','--limit','5']),
    ('read', ['read','diagnostics/retrieval.rs','--dir',source,'--start','67','--lines','64','--max-output-bytes','5000'])]:
    argv = [str(binary),'--config',str(root/'.tmp/gate15/absent.toml'),*map(str,words)]
    raw = subprocess.run(argv,capture_output=True,env=environment,timeout=120)
    (out/(label+'.stdout')).write_bytes(raw.stdout)
    (out/(label+'.stderr')).write_bytes(raw.stderr)
    commands.append({'label':label,'argv':argv,'exit_code':raw.returncode})
    assert raw.returncode == 0, label
assert snapshot() == before
search = json.loads((out/'search.stdout').read_bytes())
(out/'receipt.json').write_text(json.dumps({'status':'passed','quality_benchmark':False,
    'note':'Already-informed exploratory navigation after implementing the doctor fix; no task-completion or quality score.',
    'source_preserved':True,'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),
    'search_paths':[r['path'] for r in search['results']], 'commands':commands},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'passed','search_paths':[r['path'] for r in search['results']]}))
