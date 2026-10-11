"""Prepare the original BEIR SciFact archive with non-overlapping selection families.

All 300 official test queries are preserved. Selection uses only training-query
components that share no relevant paper with test queries. The original archive
and source text remain outside Git, while this transformation is reproducible.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import io
import json
from pathlib import Path
import zipfile
from eval.contract import digest, load_dataset

ARCHIVE_MD5 = "5f7d1de60b170fc8027bb7898e2efca1"
ARCHIVE_SHA256 = "536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165"
URL = "https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--destination", type=Path, default=Path("dataset/restoration/scifact"))
    parser.add_argument("--receipt", type=Path, default=Path("reports/restoration/gate3-document-sources.json"))
    args = parser.parse_args()
    if (args.destination / "corpus").exists():
        parser.error("Use a new corpus directory; preparation must not merge earlier files")
    raw = args.archive.read_bytes()
    if hashlib.md5(raw).hexdigest() != ARCHIVE_MD5 or digest(raw) != ARCHIVE_SHA256:
        raise ValueError("SciFact archive differs from the frozen official archive")
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        corpus = [json.loads(line) for line in archive.read("scifact/corpus.jsonl").decode().split("\n") if line.strip()]
        queries = {row["_id"]:row for row in (json.loads(line) for line in archive.read("scifact/queries.jsonl").decode().split("\n") if line.strip())}
        qrels = {}
        for split in ["train", "test"]:
            mapping = defaultdict(list)
            for row in csv.DictReader(io.StringIO(archive.read(f"scifact/qrels/{split}.tsv").decode()), delimiter="\t"):
                if int(row["score"]) > 0:
                    mapping[row["query-id"]].append((row["corpus-id"], int(row["score"])))
            qrels[split] = mapping
    parents = {}
    def find(doc):
        parents.setdefault(doc,doc)
        if parents[doc] != doc:
            parents[doc] = find(parents[doc])
        return parents[doc]
    for mapping in qrels.values():
        for relevant in mapping.values():
            anchor = find(relevant[0][0])
            for doc, _ in relevant[1:]:
                root = find(doc)
                if root != anchor:
                    parents[max(root,anchor)] = min(root,anchor)
                    anchor = find(anchor)
    test_components = {find(relevant[0][0]) for relevant in qrels["test"].values()}
    folder = args.destination
    root = folder/"corpus"
    root.mkdir(parents=True)
    sources = []
    for doc in corpus:
        filename = f"{doc['_id']}.txt"
        if not doc["_id"].isdigit():
            raise ValueError("SciFact document ID is not a safe numerical filename")
        data = (doc["title"]+"\n"+doc["text"]+"\n").encode("utf-8")
        (root/filename).write_bytes(data)
        sources.append({"path":filename,"sha256":digest(data)})
    rows, excluded = [], []
    for original_split in ["train", "test"]:
        for qid, relevant in sorted(qrels[original_split].items(),key=lambda item:int(item[0])):
            component = find(relevant[0][0])
            if original_split=="train" and component in test_components:
                excluded.append({"query_id":qid,"reason":"relevant-paper component overlaps official test"})
                continue
            split = "test" if original_split=="test" else ("validation" if int(digest(component.encode())[:8],16)%5==0 else "dev")
            rows.append({"id":f"scifact-{qid}","text":queries[qid]["text"],"group":f"scifact-paper-component-{component}","split":split,"workload":"document-agent","kind":"scientific-claim","answerability":"answerable","gold":[{"path":f"{doc}.txt","grade":grade,"spans":[]} for doc,grade in relevant]})
    manifest = {"schema":1,"id":"beir-scifact","provenance":{"origin":URL,"revision":ARCHIVE_SHA256,"label_method":"Original BEIR SciFact qrels; relevant-paper connected components isolate selection from official test","license":"Original SciFact/BEIR source licenses apply; corpus text is not redistributed in this repository","limitations":"All official test qrels preserved; selection training queries that overlap test papers are excluded and recorded. Clean title/abstract text does not exercise PDF/Office parsing; no source spans are invented."},"sources":sources,"queries":rows}
    folder.mkdir(parents=True,exist_ok=True)
    path = folder/"manifest.json"
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    dataset = load_dataset(path,root)
    (folder/"excluded-selection-labels.json").write_text(json.dumps(excluded,indent=2),encoding="utf-8")
    receipt = {"url":URL,"archive_md5":ARCHIVE_MD5,"archive_sha256":ARCHIVE_SHA256,"manifest_sha256":dataset.fingerprint,"sources":len(sources),"queries_by_split":dict(Counter(q.split for q in dataset.queries)),"families_by_split":{s:len({q.group for q in dataset.queries if q.split==s}) for s in ["dev","validation","test"]},"excluded_selection_queries":len(excluded),"excluded_identity_sha256":digest(json.dumps(excluded,sort_keys=True).encode()),"official_test_preserved":len(qrels['test'])==sum(q.split=='test' for q in dataset.queries),"format":"original title newline original abstract newline"}
    args.receipt.parent.mkdir(parents=True,exist_ok=True)
    args.receipt.write_text(json.dumps(receipt,indent=2),encoding="utf-8")
    print(json.dumps(receipt,indent=2))


if __name__ == "__main__":
    main()
