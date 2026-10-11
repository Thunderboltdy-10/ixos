"""Capture replayable source state, excluding credentials and private records."""
from pathlib import Path
import shutil
import subprocess
from eval.contract import digest


def snapshot(output:Path,binary:Path|None=None):
    destination=output/'source-snapshot'
    destination.mkdir()
    files=[Path('Cargo.toml'),Path('Cargo.lock'),Path('ixos-search/src-tauri/Cargo.toml')]+list(Path('src').rglob('*.rs'))+list(Path('ixos-search/src-tauri').rglob('*.rs'))+list(Path('eval').glob('*.py'))+list(Path('eval').glob('*.json'))
    files=[p for p in files if 'target' not in p.parts]
    hashes={}
    for path in sorted(files):
        target=destination/path
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(path,target)
        hashes[path.as_posix()]=digest(target.read_bytes())
    # Limit the diff to active Rust/evaluator files: no local env values or
    # contribution records can enter a benchmark source snapshot.
    diff=subprocess.check_output(['git','diff','HEAD','--','src','eval','Cargo.toml','Cargo.lock'])
    (destination/'tracked.patch').write_bytes(diff)
    if binary is not None:
        shutil.copyfile(binary,output/binary.name)
    return {'files':hashes,'tracked_patch_sha256':digest(diff),'binary_captured':binary is not None,'scope':'Rust source/manifests and public evaluator only; no credentials, searched source documents or private contribution notes'}
