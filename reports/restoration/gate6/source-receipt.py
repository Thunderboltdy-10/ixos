import hashlib
import json
from pathlib import Path
import subprocess
root=Path.cwd()
linux=Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
def sha(data):return hashlib.sha256(data).hexdigest()
rows={}
for p in sorted((root/'src').rglob('*.rs')):
    relative=p.relative_to(root)
    a,b=p.read_bytes(),(linux/'source'/relative).read_bytes()
    assert a.replace(b'\r\n',b'\n')==b.replace(b'\r\n',b'\n'),relative
    rows[relative.as_posix()]={'windows_bytes_sha256':sha(a),'linux_bytes_sha256':sha(b),
                              'line_ending_normalized_sha256':sha(a.replace(b'\r\n',b'\n'))}
for relative in ['Cargo.toml','Cargo.lock','config/retrieval-models.json']:
    a,b=(root/relative).read_bytes(),(linux/'source'/relative).read_bytes()
    assert a.replace(b'\r\n',b'\n')==b.replace(b'\r\n',b'\n'),relative
    rows[relative]={'windows_bytes_sha256':sha(a),'linux_bytes_sha256':sha(b)}
result={'base_git_commit':subprocess.check_output(['git','rev-parse','298088f'],text=True).strip(),
        'source_archive_sha256':sha(Path('.tmp/gate6/source-298088f.tar').read_bytes()),
        'archive_command':['git','archive','--format=tar','--output=.tmp/gate6/source-298088f.tar','298088f'],
        'linux_root':str(linux),'linux_toolchain':{
            'cargo':(linux/'receipts/cargo.stdout').read_text(),
            'gcc':subprocess.check_output(['wsl','-d','Ubuntu-24.04','--','gcc','--version'],text=True,encoding='utf-8'),
            'filesystem':subprocess.check_output(['wsl','-d','Ubuntu-24.04','--','findmnt','-n','-o','FSTYPE','--target','/home/thunderboltdy/.cache/ixos-review-298088f-20261011'],text=True,encoding='utf-8')},
        'source_condition':'Public tracked archive, then explicit changed Rust/probe copies. All current core Rust/manifests/catalog match across build trees after declared CRLF/LF normalization; actual byte hashes retained. Fresh Linux Cargo registry; task-specific app dirs. Not a clean OS or native Mac proof.',
        'rustup_installer_sha256':sha((linux/'rustup-init').read_bytes()),
        'rustc':(linux/'receipts/rustc.stdout').read_text(),
        'windows_binary_sha256':sha(Path('target/release/ixos.exe').read_bytes()),
        'linux_binary_sha256':sha((linux/'source/target/release/ixos').read_bytes()),
        'sources':rows}
Path('reports/restoration/gate6/native-source.json').write_text(json.dumps(result,indent=2)+'\n')
print(len(rows),'core source/manifest/catalog identities verified')
