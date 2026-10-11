"""Real-model development/validation quality screen with conditional interactions.

No training; no held-out test inspection. The persistent vector/lexical analysis
is not a replacement for native-cache or fresh CLI latency measurements.
"""
from __future__ import annotations
import argparse
from collections import defaultdict
import gzip
import importlib.metadata
import itertools
import json
import os
from pathlib import Path
import platform
import statistics
import subprocess
import sys
import time
from eval.bridge import EmbedBridge
from eval.contract import canonical_hash,cluster_mean_ci,digest,load_dataset,score_query
from eval.lexical import BM25
from eval.representations import POLICIES,prepare
from eval.retrieval import Retriever
from eval.run import bundle_check
from eval.run import artifact_identity
from eval.sessions import replay

MODES=("semantic","hybrid-rrf","hybrid-normalized")
SESSIONS=("off","query-ema","feedback-rocchio","combined")


def summarize(rows,config):
    recipe={k:v for k,v in config.items() if k not in {"dataset","split","model_label"}}
    result={"config":config,"config_sha256":canonical_hash(recipe),"run_sha256":canonical_hash(config),"unique_queries":len(rows),"workloads":{}}
    for workload in sorted({r["workload"] for r in rows}):
        subset=[r for r in rows if r["workload"]==workload]
        result["workloads"][workload]={"queries":len(subset),"metrics":{m:cluster_mean_ci(subset,m,seed=42) for m in ["ndcg","mrr","recall","span_recall","span_precision","false_positive"]},"mean_stdout_tokens":statistics.mean(r["stdout_tokens"] for r in subset)}
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest",type=Path,action="append",required=True)
    parser.add_argument("--root",type=Path,action="append",required=True)
    parser.add_argument("--model",type=Path,action="append",required=True)
    parser.add_argument("--binary",type=Path,default=Path("target/release/ixos-lab-embed.exe" if os.name=="nt" else "target/release/ixos-lab-embed"))
    parser.add_argument("--split",choices=["dev","validation"],default="dev")
    parser.add_argument("--document-sample",type=int,default=80,help="Deterministic dev exploratory document subset; validation uses all")
    parser.add_argument("--policy",choices=POLICIES,action="append")
    parser.add_argument("--recipes",type=Path,help="Frozen development shortlist; execute only these exact recipes")
    parser.add_argument("--precision",choices=["f32","f16","int8"],action="append")
    parser.add_argument("--threshold",type=float,action="append")
    parser.add_argument("--limit",type=int,default=10)
    parser.add_argument("--context",type=int,default=2)
    parser.add_argument("--output-bytes",type=int,default=12000)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    recipe_document=json.loads(args.recipes.read_text(encoding="utf-8")) if args.recipes else None
    recipes=recipe_document["recipes"] if recipe_document else None
    if recipes and args.split!="validation": parser.error("Shortlist execution is validation-only; test needs a separately frozen selection")
    if len(args.manifest)!=len(args.root) or args.output.exists() or args.document_sample<1:
        parser.error("Match manifest/root counts and use a new output directory")
    import tiktoken
    encoding=tiktoken.get_encoding("cl100k_base")
    count=lambda text:len(encoding.encode(text,disallowed_special=()))
    datasets=[load_dataset(m,r) for m,r in zip(args.manifest,args.root)]
    bundle_check(datasets)
    queries={}
    for d in datasets:
        selected=[q for q in d.queries if q.split==args.split]
        if args.split=="dev" and selected and all(q.workload=="document-agent" and q.sequence is None for q in selected):
            selected=sorted(selected,key=lambda q:digest(f"42:{q.id}".encode()))[:args.document_sample]
        queries[d.id]=selected
    if not any(queries.values()): parser.error("No selected queries")
    policies=args.policy or POLICIES
    if recipes: policies=tuple(dict.fromkeys(r["representation"] for r in recipes))
    precisions=args.precision or ["f16","int8"]
    thresholds=args.threshold or [0.0,0.25]
    args.output.mkdir(parents=True)
    def write(name,data): (args.output/name).write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding="utf-8")
    provenance={"argv":sys.argv,"git_head":subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(),"dirty_diff_sha256":digest(subprocess.check_output(["git","diff","HEAD","--"])),"harness_sha256":canonical_hash({p.as_posix():digest(p.read_bytes()) for p in sorted(Path("eval").glob("*.py"))}),"datasets":[{"id":d.id,"sha256":d.fingerprint,"sources":len(d.sources),"selected_query_ids":[q.id for q in queries[d.id]],"provenance":d.provenance} for d in datasets],"axes":{"policies":list(policies),"precision":precisions,"mode":MODES,"threshold":thresholds,"session":SESSIONS},"conditional_exclusions":"Session-on only applies to explicit ordered sequences. Lexical-only is the separately measured no-model baseline. All-passages is a storage/cost reference, not a tiny metadata claim.","condition":"Persistent CPU quality screen; query embeddings and lexical/anchor analyses reused across configurations. Query math timings are not CLI/cache performance.","tokenizer":{"name":"cl100k_base","version":importlib.metadata.version("tiktoken")},"platform":platform.platform(),"logical_cpus":os.cpu_count(),"status":"running"}
    from eval.provenance import snapshot
    provenance['source_snapshot']=snapshot(args.output,args.binary)
    if recipe_document: provenance["frozen_shortlist"]={"sha256":digest(args.recipes.read_bytes()),"document":recipe_document}
    write("provenance.json",provenance)
    summaries=[]
    try:
        for model in args.model:
            model_folder=args.output/model.name
            model_folder.mkdir()
            with EmbedBridge(args.binary,model,model_folder) as bridge:
                write(f"{model.name}/identity.json",{"artifact":bridge.identity,"runtime":bridge.ready,"binary_sha256":bridge.binary_sha256})
                model_summaries=[]
                for dataset in datasets:
                    selected=queries[dataset.id]
                    if not selected: continue
                    # The document-preparation API receives sources only. It has
                    # no access to selected queries, gold, or feedback labels.
                    embeddings=None
                    index=BM25(dataset)
                    lex_cache,anchor_cache={},{}
                    for policy in policies:
                        eligible=[r for r in recipes if r["model_fingerprint"]==bridge.identity["fingerprint"] and r["representation"]==policy] if recipes else None
                        if recipes and not eligible: continue
                        prepared=prepare(dataset.sources,policy,bridge)
                        write(f"{model.name}/{dataset.id}-{policy}-preparation.json",{"policy":policy,"prepare_ms":prepared.prepare_ms,"source_bytes":prepared.source_bytes,"all_passages":prepared.all_passages,"selected_passages":prepared.selected_passages,"dimensions":bridge.ready["dimensions"],"query_independent":True,"tokenizer_settings":bridge.identity['tokenizer_settings'],"coverage":"Full source chunking; prefix-512 explicitly limits API tokens. Tokenizer truncation/padding can impose further limits; full-token claims require disabled tokenizer rules. No random passage sampling."})
                        if embeddings is None:
                            began=time.perf_counter()
                            embeddings=bridge.embed([q.text for q in selected])
                            write(f"{model.name}/{dataset.id}-queries.json",{"query_ids":[q.id for q in selected],"batch_embed_wall_ms":(time.perf_counter()-began)*1000,"note":"Query embeddings reused for quality screening; not warm CLI timing"})
                        lookup={q.id:embedding for q,embedding in zip(selected,embeddings)}
                        ordered=all(q.sequence is not None for q in selected)
                        if not ordered and any(q.sequence is not None for q in selected):
                            raise ValueError("Use separate independent and ordered manifests")
                        for precision,mode,threshold,session in itertools.product(precisions,MODES,thresholds,SESSIONS if ordered else ["off"]):
                            config={"model_fingerprint":bridge.identity["fingerprint"],"model_label":model.name,"dataset":dataset.id,"split":args.split,"representation":policy,"chunk_characters":1800,"precision":precision,"mode":mode,"semantic_threshold":threshold,"session":session,"literal_guard":True,"limit":args.limit,"context":args.context,"output_bytes":args.output_bytes}
                            config['session_algorithm']='bounded-context-v2'
                            if recipes and not any(all(config.get(k)==v for k,v in recipe.items()) for recipe in eligible): continue
                            config_hash=canonical_hash(config)
                            retriever=Retriever(dataset,prepared,precision,mode,threshold=threshold,limit=args.limit,context=args.context,output_bytes=args.output_bytes,session=session,index=index,lexical_cache=lex_cache,anchor_cache=anchor_cache)
                            rows=[]
                            with gzip.open(model_folder/f"{config_hash}.records.jsonl.gz","wt",encoding="utf-8") as stream:
                                if ordered:
                                    replay_rows,sequence_rows=replay(dataset,selected,lambda text,feedback,qid:retriever.search(text,lookup[qid],feedback,qid),count,reset=retriever.reset)
                                    write(f"{model.name}/{config_hash}.sequences.json",sequence_rows)
                                    for row in replay_rows:
                                        query=next(q for q in selected if q.id==row["query_id"])
                                        metric_row={"query_id":query.id,"group":query.group,"workload":query.workload,**row["metrics"],"stdout_tokens":row["stdout_tokens"]}
                                        rows.append(metric_row)
                                        stream.write(json.dumps(row,ensure_ascii=False)+"\n")
                                else:
                                    for query in selected:
                                        response=retriever.search(query.text,lookup[query.id],qid=query.id)
                                        metrics=score_query(query,response.views,dataset,paths=response.paths)
                                        row={"query_id":query.id,"group":query.group,"workload":query.workload,**metrics,"stdout_tokens":count(response.raw_stdout.decode("utf-8"))}
                                        rows.append(row)
                                        stream.write(json.dumps({**row,"paths":response.paths,"views":response.views,"raw_stdout":response.raw_stdout.decode("utf-8"),"diagnostics":response.diagnostics,"math_wall_ms":response.wall_ms},ensure_ascii=False)+"\n")
                            summary=summarize(rows,config)
                            summary.update(vector_payload_bytes=retriever.vector_payload_bytes,selected_passages=prepared.selected_passages,all_passages=prepared.all_passages,prepare_ms=prepared.prepare_ms,lexical_index_prepare_ms=index.prepare_ms)
                            model_summaries.append(summary)
                            with (args.output/"summaries.jsonl").open("a",encoding="utf-8") as stream: stream.write(json.dumps(summary)+"\n")
                        print(f"{model.name}: {dataset.id} {policy}; {prepared.selected_passages}/{prepared.all_passages} passages",flush=True)
                summaries.extend(model_summaries)
                write(f"{model.name}/summaries.json",model_summaries)
                if bridge.identity!=artifact_identity(model):
                    raise ValueError("Model artifacts changed during screening")
        for manifest,root in zip(args.manifest,args.root): load_dataset(manifest,root)
    except Exception as error:
        provenance.update(status="failed",failure=str(error),completed_configurations=len(summaries))
        write("provenance.json",provenance)
        raise
    provenance.update(status="passed",completed_configurations=len(summaries))
    write("provenance.json",provenance)
    print(f"Completed {len(summaries)} dataset/configuration screens; unique queries are reported separately.",flush=True)


if __name__=="__main__": main()
