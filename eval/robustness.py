"""Deterministic typo diagnostics preserving original queries and qrels.

Derived questions are not an independent benchmark or newly verified relevance
labels. Only development data may be augmented; held-out questions stay original.
"""
import argparse
import copy
import json
from pathlib import Path
import re
from eval.contract import canonical_hash,load_dataset


def typo_variant(text):
    # Protect quoted phrases, identifiers, numbers, paths and operators. Select
    # the longest ordinary lowercase word, with deterministic first-occurrence ties.
    protected=[(m.start(),m.end()) for m in re.finditer(r'"[^"]*"|\S*[_:/\\]\S*|\S*\d\S*|\S*[A-Z]\S*',text)]
    candidates=[m for m in re.finditer(r"\b[a-z]{6,}\b",text) if not any(a<m.end() and m.start()<b for a,b in protected)]
    if not candidates: return None
    target=max(candidates,key=lambda m:len(m.group()))
    word=target.group()
    index=next((i for i in range(1,len(word)-2) if word[i]!=word[i+1]),None)
    if index is None: return None
    changed=word[:index]+word[index+1]+word[index]+word[index+2:]
    return text[:target.start()]+changed+text[target.end():]


def prepare(manifest,root,destination):
    dataset=load_dataset(manifest,root)
    if destination.exists(): raise ValueError("Do not overwrite a derived manifest")
    raw=json.loads(manifest.read_text(encoding="utf-8"))
    queries=[]
    for query in raw["queries"]:
        if query["split"]!="dev" or "sequence" in query: continue
        changed=typo_variant(query["text"])
        if changed is None: continue
        row=copy.deepcopy(query)
        row.update(id=query["id"]+"-typo",text=changed,kind="derived-single-typo")
        queries.append(row)
    if not queries: raise ValueError("No eligible ordinary-word queries")
    raw.update(id=dataset.id+"-typo",queries=queries)
    raw["provenance"]={**raw["provenance"],"origin":raw["provenance"]["origin"]+"; deterministic Ixos typo diagnostic","revision":raw["provenance"]["revision"]+"; typo-v1","label_method":raw["provenance"]["label_method"]+"; qrels retained for one transposed ordinary word, no relabeling","limitations":raw["provenance"]["limitations"]+" Derived robustness diagnostic, not independent relevance labels or original leaderboard protocol."}
    destination.write_text(json.dumps(raw,indent=2,ensure_ascii=False),encoding="utf-8")
    result=load_dataset(destination,root)
    return {"source_manifest_sha256":dataset.fingerprint,"derived_manifest_sha256":result.fingerprint,"queries":len(queries),"rule":"one internal adjacent transposition in the longest eligible ordinary lowercase word"}


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest",type=Path,required=True)
    parser.add_argument("--root",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    print(json.dumps(prepare(args.manifest,args.root,args.output),indent=2))
