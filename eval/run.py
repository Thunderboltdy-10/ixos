"""Reproducible real CLI / lexical baselines with retained raw outputs and budgets.

Use --split dev before selection. Held-out test requires a frozen selection record;
this runner never fits model/fusion/threshold parameters to its evaluation queries.
"""
from __future__ import annotations
import argparse
from collections import defaultdict
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import random
import statistics
import subprocess
import sys
import tempfile
import time

from eval.backends import run_ixos
from eval.contract import ContractError, canonical_hash, cluster_mean_ci, digest, load_dataset, score_query
from eval.lexical import BM25, run_rg
from eval.provenance import snapshot
from eval.artifacts import artifact_identity


def bundle_check(datasets):
    ids, groups, text_splits, source_splits = set(), {}, {}, {}
    for dataset in datasets:
        for query in dataset.queries:
            if query.id in ids:
                raise ContractError("Query ID repeated across dataset manifests")
            ids.add(query.id)
            if groups.setdefault(query.group, query.split) != query.split:
                raise ContractError("Family leaks across manifests")
            text = " ".join(query.text.casefold().split())
            if text_splits.setdefault(text, query.split) != query.split:
                raise ContractError("Query text leaks across manifests")
            for gold in query.gold:
                sha = dataset.sources[gold.path].sha256
                if source_splits.setdefault(sha, query.split) != query.split:
                    raise ContractError("Relevant content leaks across manifests")


def percentile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered)-1)*fraction
    low = int(position)
    high = min(low+1, len(ordered)-1)
    return ordered[low]*(high-position)+ordered[high]*(position-low) if high != low else ordered[low]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, action="append", required=True)
    parser.add_argument("--root", type=Path, action="append", required=True)
    parser.add_argument("--backend", choices=["ixos", "rg", "bm25"], required=True)
    parser.add_argument("--binary", type=Path, default=Path("target/release/ixos.exe" if os.name=="nt" else "target/release/ixos"))
    parser.add_argument("--model-path", type=Path, default=Path("models/ixos-flash-v2"))
    parser.add_argument("--retrieval",choices=['legacy','lexical','semantic','hybrid'],default='legacy')
    parser.add_argument("--representation",choices=['intro-uniform','whole-token-centroid'],default='intro-uniform')
    parser.add_argument('--io-workers',type=int,default=1)
    parser.add_argument('--typo-correction',action='store_true')
    parser.add_argument("--cache", choices=["jit", "native-cold", "native-warm"], default="jit")
    parser.add_argument("--split", choices=["dev", "validation", "test"], default="dev")
    parser.add_argument("--selection", type=Path)
    parser.add_argument("--repetitions", type=int, default=3)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--sample", type=int, help="Deterministic exploratory subset, development only")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--context", type=int, default=2)
    parser.add_argument("--output-bytes", type=int, default=12000)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if len(args.manifest) != len(args.root) or args.repetitions < 1 or args.limit < 1 or args.context < 0:
        parser.error("Match manifest/root counts and use valid repetitions/limit/context")
    if args.backend != "ixos" and args.cache != "jit":
        parser.error("Native embedding-cache conditions apply only to Ixos")
    if args.split == "test" and not args.selection:
        parser.error("Freeze selection/config/model identities before a held-out run")
    if args.sample is not None and (args.sample < 1 or args.split != "dev"):
        parser.error("Exploratory sampling requires a positive count on development only")
    if args.output.exists():
        parser.error("Use a new output directory; previous evidence must not be overwritten")
    import tiktoken
    encoding = tiktoken.get_encoding("cl100k_base")
    started = time.perf_counter()
    datasets = [load_dataset(m, r) for m, r in zip(args.manifest, args.root)]
    dataset_load_ms = (time.perf_counter()-started)*1000
    bundle_check(datasets)
    selected = [(dataset, root, q) for dataset, root in zip(datasets, args.root) for q in dataset.queries if q.split==args.split]
    if not selected:
        parser.error("No queries in the requested split")
    if any(q.sequence is not None for _, _, q in selected):
        parser.error("Session datasets require the ordered session runner, not shuffled independent queries")
    original_query_count = len(selected)
    if args.sample is not None and args.sample < len(selected):
        selected = sorted(selected, key=lambda row:digest(f"{args.seed}:{row[2].id}".encode()))[:args.sample]
    model = artifact_identity(args.model_path) if args.backend == "ixos" and args.retrieval!='lexical' else None
    config_identity = {"backend": args.backend, "cache": args.cache, "limit": args.limit, "context": args.context, "output_bytes": args.output_bytes, "model_fingerprint": model["fingerprint"] if model else None, "legacy_mode": "flash" if model else None}
    if args.retrieval!='legacy': config_identity.update(retrieval=args.retrieval,representation=args.representation,legacy_mode=None,io_workers=args.io_workers,typo_correction=args.typo_correction,output_contract='bounded-rows-v2')
    config_hash = canonical_hash(config_identity)
    if args.selection:
        selection = json.loads(args.selection.read_text(encoding="utf-8"))
        if config_hash not in selection["config_hashes"] or any(d.fingerprint not in selection["dataset_hashes"] for d in datasets):
            parser.error("Run identity is absent from the frozen selection record")
        if args.backend=='ixos' and digest(args.binary.read_bytes())!=selection.get('binary_sha256'):
            parser.error('Actual binary differs from the frozen test binary')
    args.output.mkdir(parents=True)
    def write(name, value):
        (args.output/name).write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    provenance = {"argv": sys.argv, "config": config_identity, "config_sha256": config_hash, "datasets": [{"id":d.id,"sha256":d.fingerprint,"sources":len(d.sources),"provenance":d.provenance} for d in datasets], "dataset_load_ms": dataset_load_ms, "model": model, "binary_sha256": digest(args.binary.read_bytes()) if args.backend=="ixos" else None, "git_head": subprocess.check_output(["git","rev-parse","HEAD"], text=True).strip(), "dirty_diff_sha256": digest(subprocess.check_output(["git","diff","HEAD","--"])), "harness_sha256": canonical_hash({p.as_posix():digest(p.read_bytes()) for p in sorted(Path("eval").glob("*.py"))}), "platform": platform.platform(), "machine": platform.machine(), "processor": platform.processor(), "logical_cpus": os.cpu_count(), "python": sys.version, "tokenizer": {"name":"cl100k_base", "package":"tiktoken", "version":importlib.metadata.version("tiktoken")}, "timing_condition": "fresh CLI process" if args.backend=="ixos" else ("fresh ripgrep process + ranked source windows from loaded corpus" if args.backend=="rg" else "persistent in-memory BM25 query"), "seed":args.seed, "repetitions":args.repetitions, "status":"running"}
    provenance.update(available_split_queries=original_query_count, selected_queries=len(selected), exploratory_sample=args.sample)
    provenance['source_snapshot']=snapshot(args.output,args.binary if args.backend=='ixos' else None)
    write("provenance.json", provenance)
    corpus_indexes = {d.id: BM25(d) for d in datasets} if args.backend=="bm25" else {}
    order = list(range(len(selected)))
    random.Random(args.seed).shuffle(order)
    write("query-order.json", [selected[i][2].id for i in order])
    records = []
    with tempfile.TemporaryDirectory(prefix="ixos-eval-config-") as temp:
        config = Path(temp)/"config.toml"
        config.write_text('version=1\n[search]\nsearch_mode="flash"\nflash_model_type="ixos-flash-v2"\nmin_score_threshold=0.0\nenable_secure_ranking=false\nuse_stub_model=false\nprogressive_by_default=false\ntimeout_seconds=60\n[output]\ndefault_format="json"\ncolor=false\n', encoding="utf-8")
        def utility(root, name, *argv):
            command = [str(args.binary.resolve()), "--config", str(config), *map(str, argv)]
            begin = time.perf_counter()
            result = subprocess.run(command, capture_output=True, timeout=120)
            (args.output/f"{name}.stdout").write_bytes(result.stdout)
            (args.output/f"{name}.stderr").write_bytes(result.stderr)
            write(f"{name}.command.json", {"argv":command,"cwd":str(root.resolve()),"exit_code":result.returncode,"wall_ms":(time.perf_counter()-begin)*1000})
            if result.returncode:
                raise ContractError("Cache preparation failed")
        if args.backend=="ixos" and args.cache=="native-warm":
            for i, root in enumerate(args.root):
                if args.retrieval=='legacy': utility(root, f"warm-{i}", "index", root, "--use-xattr")
                else: utility(root,f"warm-{i}","search","cache warmup","--dir",root,"--json","--retrieval",args.retrieval,"--representation",args.representation,"--model-path",args.model_path,"--cache-mode","native-cache")
        try:
            for index in order:
                dataset, root, query = selected[index]
                for repetition in range(args.repetitions):
                    label = digest(query.id.encode())[:12]+f"-{repetition}"
                    def capture(argv, exit_code, stdout, stderr, wall_ms):
                        (args.output/f"{label}.raw.stdout").write_bytes(stdout)
                        (args.output/f"{label}.raw.stderr").write_bytes(stderr)
                        write(f"{label}.command.json", {"argv":argv,"cwd":str(root.resolve()),"exit_code":exit_code,"wall_ms":wall_ms})
                    if args.backend=="ixos":
                        if args.cache=="native-cold":
                            utility(root, f"clear-{label}", "cache", "clear", "--dir", root, "--force")
                        extras=["--search-mode","flash","--model","ixos-flash-v2"] if args.retrieval=='legacy' else ['--retrieval',args.retrieval,'--representation',args.representation,'--model-path',str(args.model_path.resolve()),'--io-workers',str(args.io_workers)]
                        if args.typo_correction:extras.append('--typo-correction')
                        response = run_ixos(args.binary,config,root,dataset,query.text,cache_mode="ephemeral" if args.cache=="jit" else "native-cache",limit=args.limit,context=args.context,output_bytes=args.output_bytes,extra_args=extras,capture=capture)
                        if args.retrieval=='legacy':
                            primary = next((m for m in response.diagnostics.get("models",[]) if m["role"]=="primary"),None)
                            if not primary or primary["fingerprint"] != model["fingerprint"]: raise ContractError("Loaded model differs from frozen artifact identity")
                            work=response.diagnostics['diagnostics']['embedding']
                            embedded,hits=work['candidates_embedded'],work['cache_hits']
                        else:
                            work=response.diagnostics['diagnostics']
                            if model and work['modelFingerprint']!=model['fingerprint']: raise ContractError('Loaded model differs from frozen artifact identity')
                            embedded,hits=work['passagesEmbedded'],work['nativeCacheHits']+work['applicationCacheHits']
                        if args.cache=="native-warm" and (embedded != 0 or (response.paths and hits == 0)):
                            raise ContractError("Native-warm condition did not produce actual disk-cache hits")
                    elif args.backend=="rg":
                        response = run_rg("rg",root,dataset,query.text,limit=args.limit,context=args.context,output_bytes=args.output_bytes,capture=capture)
                    else:
                        response = corpus_indexes[dataset.id].search(query.text,limit=args.limit,context=args.context,output_bytes=args.output_bytes)
                        capture(response.argv,response.exit_code,response.raw_stdout,response.raw_stderr,response.wall_ms)
                    (args.output/f"{label}.response.stdout").write_bytes(response.raw_stdout)
                    metrics = score_query(query,response.views,dataset,k=10,paths=response.paths)
                    record = {"query_id":query.id,"group":query.group,"dataset":dataset.id,"split":query.split,"kind":query.kind,"repetition":repetition,"metrics":metrics,"paths":response.paths,"views":response.views,"wall_ms":response.wall_ms,"stdout_bytes":len(response.raw_stdout),"stdout_tokens":len(encoding.encode(response.raw_stdout.decode("utf-8"),disallowed_special=())),"stderr_bytes":len(response.raw_stderr),"query_tokens":len(encoding.encode(query.text,disallowed_special=())),"diagnostics":response.diagnostics,"evidence_failures":response.evidence_failures,"artifact_prefix":label}
                    records.append(record)
                    record['stderr_tokens']=len(encoding.encode(response.raw_stderr.decode('utf-8'),disallowed_special=()))
                    record['total_response_tokens']=record['stdout_tokens']+record['stderr_tokens']
                    with (args.output/"records.jsonl").open("a",encoding="utf-8") as stream:
                        stream.write(json.dumps(record,ensure_ascii=False)+"\n")
                print(f"{query.id}: {args.repetitions} runs, files={len(response.paths)}, verified_views={len(response.views)}",flush=True)
            for manifest, root in zip(args.manifest,args.root):
                load_dataset(manifest,root) # Source edits or new writes cannot masquerade as a frozen run.
            if model and artifact_identity(args.model_path) != model:
                raise ContractError("Model artifacts changed during the run")
        except Exception as error:
            provenance.update(status="failed",failure=str(error),completed_runs=len(records))
            write("provenance.json",provenance)
            raise
    grouped = defaultdict(list)
    for row in records:
        grouped[row["query_id"]].append(row)
    unique = []
    for query_id, rows in grouped.items():
        row = {"query_id":query_id,"group":rows[0]["group"]}
        for metric in ["mrr","recall","ndcg","span_recall","span_precision","false_positive"]:
            values = [r["metrics"][metric] for r in rows if r["metrics"][metric] is not None]
            row[metric] = statistics.mean(values) if values else None
        unique.append(row)
    summary = {"config_sha256":config_hash,"queries":len(unique),"runs":len(records),"families":len(set(r["group"] for r in records)),"quality":{metric:cluster_mean_ci(unique,metric,seed=args.seed) for metric in ["mrr","recall","ndcg","span_recall","span_precision","false_positive"]},"wall_ms":{"p50":percentile([r["wall_ms"] for r in records],.5),"p95":percentile([r["wall_ms"] for r in records],.95)},"output":{"mean_bytes":statistics.mean(r["stdout_bytes"] for r in records),"mean_tokens":statistics.mean(r["stdout_tokens"] for r in records),"p95_tokens":percentile([r["stdout_tokens"] for r in records],.95),"verified_views":sum(len(r["views"]) for r in records),"evidence_failures":sum(len(r["evidence_failures"]) for r in records)},"notes":"Equal-family quality means; repetitions are timing/stability samples. Latency conditions differ across backend types and are labeled in provenance. Span annotations may be incomplete."}
    summary['output'].update(mean_stderr_tokens=statistics.mean(r['stderr_tokens'] for r in records),mean_total_response_tokens=statistics.mean(r['total_response_tokens'] for r in records),p95_total_response_tokens=percentile([r['total_response_tokens'] for r in records],.95))
    write("summary.json",summary)
    provenance.update(status="passed",completed_runs=len(records))
    write("provenance.json",provenance)
    print(json.dumps(summary,indent=2),flush=True)


if __name__ == "__main__":
    main()
