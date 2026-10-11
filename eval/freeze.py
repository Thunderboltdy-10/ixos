"""Freeze exact production/baseline run identities before held-out scoring."""
import argparse,json
from pathlib import Path
from eval.contract import canonical_hash,digest
from eval.run import artifact_identity

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--binary',type=Path,default=Path('target/release/ixos.exe'))
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    if a.output.exists():p.error('Frozen selection records must not be overwritten')
    code=artifact_identity(Path('models/lab/artifacts/potion-code-16M-v2-unbounded'))
    documents=artifact_identity(Path('models/lab/artifacts/potion-retrieval-32M-row-int8'))
    old=artifact_identity(Path('models/ixos-flash-v2'))
    configurations=[]
    def identity(backend,cache,model=None,retrieval='legacy',representation='intro-uniform',io_workers=1):
        row=dict(backend=backend,cache=cache,limit=10,context=2,output_bytes=6000,model_fingerprint=model['fingerprint'] if model else None,legacy_mode='flash' if model else None)
        if retrieval!='legacy':row.update(retrieval=retrieval,representation=representation,legacy_mode=None,io_workers=io_workers,typo_correction=False,output_contract='bounded-rows-v2')
        configurations.append(dict(sha256=canonical_hash(row),config=row))
    for model,representation in [(code,'intro-uniform'),(documents,'whole-token-centroid')]:
        for cache in ['jit','native-warm']:identity('ixos',cache,model,'hybrid',representation,4)
    identity('ixos','jit',old)
    identity('ixos','jit',None,'lexical','intro-uniform',4)
    for backend in ['bm25','rg']:identity(backend,'jit')
    manifests=[Path(f'dataset/restoration/public/{name}/manifest.json') for name in ['requests','axum']]+[Path('dataset/restoration/scifact/manifest.json')]
    record=dict(schema=1,binary_sha256=digest(a.binary.read_bytes()),models=[code,documents,old],dataset_hashes=[canonical_hash(json.loads(path.read_text(encoding='utf-8'))) for path in manifests],config_hashes=[c['sha256'] for c in configurations],configurations=configurations,reason='Development/validation selected compact normalized code representatives and compressed general centroid. Fixed 10 results, two context lines, 6000-byte output for matched strong baselines. Stateless queries; typo/history remain separate exploratory options. No test-label-driven changes permitted after this record.',evidence=['production-code-validation-coverage','production-doc-validation-v6','validation-code-bm25-final','validation-code-rg-final','validation-doc-bm25-final','validation-doc-rg-final'],scope='Restricted pinned Semble test repositories and SciFact test qrels; not full Semble leaderboard or agent task success.')
    a.output.write_text(json.dumps(record,indent=2),encoding='utf-8')
    print(json.dumps(dict(binary_sha256=record['binary_sha256'],configs=len(configurations),dataset_hashes=record['dataset_hashes']),indent=2))

if __name__=='__main__':main()
