"""Freeze real Ixos Rust source and authored maintenance-question sequences.

This is a developer-authored source-grounded diagnostic, not a held-out public
benchmark or autonomous task-success evaluation. Gold is fixed before replay.
"""
import argparse,json,shutil
from pathlib import Path
from eval.contract import digest,load_dataset

def prepare(folder):
    if folder.exists():raise ValueError('Use a new source snapshot directory')
    root=folder/'corpus';root.mkdir(parents=True)
    for path in sorted(Path('src').rglob('*.rs')):
        dest=root/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,dest)
    sources=[dict(path=p.relative_to(root).as_posix(),sha256=digest(p.read_bytes())) for p in sorted(root.rglob('*.rs'))]
    questions=[
        ('refresh',0,'How are cached vectors refreshed when file contents change?','src/retrieval/mod.rs','let raw_hash = sha256(&bytes);',14),
        ('refresh',1,'Does it still detect an edit with exactly the same file length?','src/retrieval/mod.rs','let raw_hash = sha256(&bytes);',14),
        ('refresh',2,'Which stored fields prove that it belongs to this model and source?','src/retrieval/cache.rs','"Stale document recipe/source"',3),
        ('refresh',3,'How is the record removed from disk?','src/retrieval/cache.rs','pub fn remove(',21),
        ('output',0,'How is the amount of displayed search output bounded?','src/retrieval/commands.rs','pub(super) struct BoundedRows',38),
        ('output',1,'What happens if it contains a very long matching line?','src/retrieval/mod.rs','row.evidence_omitted = true;',3),
        ('output',2,'How can an agent read only a character slice of it?','src/retrieval/commands.rs','if let Some(characters) = characters',33),
        ('output',3,'Where are malformed JSONL requests handled?','src/retrieval/commands.rs','let value = match outcome',20),
        ('ignore',0,'How does source traversal respect gitignore outside a git repository?','src/ixos_rank/candidate_generator/path_engine.rs','.require_git(false)',5),
        ('ignore',1,'Does it also exclude node_modules and build dependencies?','src/ixos_rank/candidate_generator/path_engine.rs','pub const HARDCODED_SKIP_DIRS',24),
        ('ignore',2,'Where are Office XML containers rejected when they expand too much?','src/parsers/mod.rs','let mut expanded = 0u64;',13),
        ('ignore',3,'How does it reject malformed UTF-16 or binary data?','src/parsers/mod.rs','pub(crate) fn decode_text',36),
    ]
    queries=[]
    for topic,turn,text,path,witness,count in questions:
        lines=(root/path).read_text(encoding='utf-8').split('\n')
        start=next(i+1 for i,line in enumerate(lines) if witness in line)
        queries.append(dict(id=f'own-{topic}-{turn}',text=text,group=f'own-{topic}',split='dev',workload='code-agent',kind='maintenance-followup' if turn else 'maintenance-explicit',answerability='answerable',gold=[dict(path=path,grade=3,spans=[[start,min(len(lines),start+count-1)]])],sequence=topic,turn=turn))
    manifest=folder/'sessions.json'
    manifest.write_text(json.dumps(dict(schema=1,id='ixos-own-maintenance-sessions',sources=sources,queries=queries,provenance=dict(origin='Frozen Ixos Rust source plus developer-authored maintenance questions',revision='own-source-v1',label_method='Source implementation witnesses fixed before retrieval replay; broad line ranges are diagnostic',license='MIT OR Apache-2.0',limitations='Three authored sequences; author knows this repository. Source retrieval only, not autonomous coding success or independent public quality.')),indent=2),encoding='utf-8')
    dataset=load_dataset(manifest,root)
    return dict(manifest=str(manifest),sha256=dataset.fingerprint,queries=len(queries),sources=len(sources))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);a=p.parse_args();print(json.dumps(prepare(a.output),indent=2))
