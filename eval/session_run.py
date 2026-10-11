"""Replay controlled ordered queries through real CLI, rg, or BM25 baselines."""
from __future__ import annotations
import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile
from contextlib import ExitStack
from eval.backends import run_ixos
from eval.contract import ContractError, canonical_hash, digest, load_dataset
from eval.lexical import BM25, run_rg
from eval.run import artifact_identity
from eval.sessions import replay
from eval.serve_backend import ServeBackend
from eval.provenance import snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest",type=Path,required=True)
    parser.add_argument("--root",type=Path,required=True)
    parser.add_argument("--backend",choices=["ixos","serve","rg","bm25"],required=True)
    parser.add_argument('--session',choices=['off','related','feedback','combined','context'],default='off')
    parser.add_argument("--binary",type=Path,default=Path("target/release/ixos.exe" if os.name=="nt" else "target/release/ixos"))
    parser.add_argument("--model-path",type=Path,default=Path("models/ixos-flash-v2"))
    parser.add_argument("--split",choices=["dev","validation"],default="dev")
    parser.add_argument("--repetitions",type=int,default=3)
    parser.add_argument("--limit",type=int,default=5)
    parser.add_argument("--context",type=int,default=2)
    parser.add_argument("--output-bytes",type=int,default=6000)
    parser.add_argument("--output",type=Path,required=True)
    args = parser.parse_args()
    if args.output.exists() or args.repetitions<1:
        parser.error("Use a new output folder and positive repetitions")
    dataset = load_dataset(args.manifest,args.root)
    selected = [q for q in dataset.queries if q.split==args.split]
    if not selected:
        parser.error("No queries in selected split")
    import tiktoken
    encoding = tiktoken.get_encoding("cl100k_base")
    model = artifact_identity(args.model_path) if args.backend in {'ixos','serve'} else None
    args.output.mkdir(parents=True)
    def write(name,value):
        (args.output/name).write_text(json.dumps(value,indent=2,ensure_ascii=False),encoding="utf-8")
    provenance = {"argv":__import__("sys").argv,"dataset_sha256":dataset.fingerprint,"model":model,"binary_sha256":digest(args.binary.read_bytes()) if model else None,"git_head":subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(),"harness_sha256":canonical_hash({p.as_posix():digest(p.read_bytes()) for p in sorted(Path("eval").glob("*.py"))}),"platform":platform.platform(),"tokenizer":{"name":"cl100k_base","version":importlib.metadata.version("tiktoken")},"session_policy":"off; these existing baselines ignore feedback", "cache":"JIT for Ixos; persistent in-memory BM25; fresh rg process", "status":"running"}
    write("provenance.json",provenance)
    if args.backend=='serve':provenance.update(session_policy=args.session,cache='native document records; persistent process refreshes/validates source snapshots each request')
    provenance['source_snapshot']=snapshot(args.output,args.binary if model else None)
    write('provenance.json',provenance)
    index = BM25(dataset) if args.backend=="bm25" else None
    rows, sequences = [], []
    try:
        with tempfile.TemporaryDirectory(prefix="ixos-session-config-") as temporary,ExitStack() as stack:
            server=stack.enter_context(ServeBackend(args.binary,args.model_path,args.root,dataset,args.output,session=args.session,budget=args.output_bytes)) if args.backend=='serve' else None
            config = Path(temporary)/"config.toml"
            config.write_text('version=1\n[search]\nsearch_mode="flash"\nflash_model_type="ixos-flash-v2"\nmin_score_threshold=0.0\nenable_secure_ranking=false\nuse_stub_model=false\nprogressive_by_default=false\ntimeout_seconds=60\n[output]\ndefault_format="json"\ncolor=false\n',encoding="utf-8")
            for repetition in range(args.repetitions):
                def backend(text,feedback,qid):
                    label=f"{qid}-{repetition}"
                    def capture(argv,exit_code,stdout,stderr,wall_ms):
                        (args.output/f"{label}.raw.stdout").write_bytes(stdout)
                        (args.output/f"{label}.raw.stderr").write_bytes(stderr)
                        write(f"{label}.command.json",{"argv":argv,"exit_code":exit_code,"wall_ms":wall_ms})
                    options=dict(limit=args.limit,context=args.context,output_bytes=args.output_bytes)
                    if server is not None:
                        response=server.search(text,feedback,qid)
                        if response.diagnostics['modelFingerprint']!=model['fingerprint']:raise ContractError('Persistent engine loaded a different artifact')
                    elif args.backend=="ixos":
                        response=run_ixos(args.binary,config,args.root,dataset,text,extra_args=["--search-mode","flash","--model","ixos-flash-v2"],capture=capture,**options)
                        primary=next((m for m in response.diagnostics.get("models",[]) if m["role"]=="primary"),None)
                        if not primary or primary["fingerprint"]!=model["fingerprint"]:
                            raise ContractError("Actual loaded model differs")
                    elif args.backend=="rg":
                        response=run_rg("rg",args.root,dataset,text,capture=capture,**options)
                    else:
                        response=index.search(text,**options)
                        capture(response.argv,response.exit_code,response.raw_stdout,response.raw_stderr,response.wall_ms)
                    (args.output/f"{label}.response.stdout").write_bytes(response.raw_stdout)
                    return response
                current, summary=replay(dataset,selected,backend,lambda text:len(encoding.encode(text,disallowed_special=())),reset=server.reset if server else lambda:None)
                for row in current:
                    row["repetition"]=repetition
                    with (args.output/"records.jsonl").open("a",encoding="utf-8") as stream:
                        stream.write(json.dumps(row,ensure_ascii=False)+"\n")
                rows.extend(current)
                sequences.extend(dict(row,repetition=repetition) for row in summary)
                print(f"{args.backend}: repetition {repetition+1}, {len(current)} turns",flush=True)
        load_dataset(args.manifest,args.root)
        if model and artifact_identity(args.model_path)!=model:
            raise ContractError("Model changed during replay")
    except Exception as error:
        provenance.update(status="failed",failure=str(error))
        write("provenance.json",provenance)
        raise
    write("sequences.json",sequences)
    write("summary.json",{"unique_queries":len(selected),"unique_sequences":len({q.sequence for q in selected}),"runs":len(rows),"sequences":sequences,"evidence_failures":sum(len(r["evidence_failures"]) for r in rows),"label":f"retrieval replay, session policy {args.session if args.backend=='serve' else 'off'}; no autonomous agent success claim"})
    provenance["status"]="passed"
    write("provenance.json",provenance)


if __name__=="__main__":
    main()
