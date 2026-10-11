"""Query-independent document representations for quality screening.

These are experimental in-memory records, not a claim about production ADS/xattr
latency. Source snapshots are provided without queries or relevance annotations.
"""
from __future__ import annotations
from collections import Counter
from dataclasses import dataclass
import math
import time
import numpy as np
from eval.contract import ContractError, Source
from eval.lexical import tokens

POLICIES=("prefix-512","whole-token-centroid","intro-uniform","intro-lex-diverse","intro-vector-diverse","all-passages")


@dataclass(frozen=True)
class Chunk:
    text:str
    start_line:int
    end_line:int
    start_byte:int
    end_byte:int


def chunks(source:Source, *, characters=1800):
    """Contiguous full-coverage chunks, preferring line/word boundaries.

    No random sampling or chunk-level drop. Tokenizer artifacts can independently
    impose truncation/padding; their settings are recorded by the runner. Partial long lines keep
    byte locators as well as physical source coordinates. This phase is bounded
    by the frozen source's size; it never silently drops the final section.
    """
    if characters<4:
        raise ContractError("Chunk target must be at least four characters")
    text="\n".join(source.lines)
    rows=[]
    start=byte=line=0
    while start<len(text):
        end=min(start+characters,len(text))
        if end<len(text):
            boundary=text.rfind("\n",start+characters//2,end)
            if boundary<0:
                boundary=text.rfind(" ",start+characters//2,end)
            if boundary>=0:
                end=boundary+1
        part=text[start:end]
        encoded=len(part.encode("utf-8"))
        # A trailing LF belongs to the preceding line; next chunk starts on the
        # following one. This prevents including an unseen line in locators.
        rows.append(Chunk(part,line+1,line+part.count("\n")+(0 if part.endswith("\n") else 1),byte,byte+encoded))
        line+=part.count("\n")
        byte+=encoded
        start=end
    return rows


def representative_count(count):
    if count<=2: return count
    return min(count,4 if count<=8 else 8)


def uniform_indices(count,budget):
    if budget>=count: return list(range(count))
    return sorted({round(i*(count-1)/(budget-1)) for i in range(budget)}) if budget>1 else [0]


def diverse_indices(vectors,budget):
    if not len(vectors): return []
    selected=[0] # Introduction anchor is unconditional.
    closest=vectors@vectors[0]
    while len(selected)<min(budget,len(vectors)):
        distances=closest.copy()
        distances[selected]=np.inf
        candidate=int(np.argmin(distances))
        selected.append(candidate)
        closest=np.maximum(closest,vectors@vectors[candidate])
    return sorted(selected)


def lexical_diverse_indices(parts,budget):
    counts=[Counter(tokens(chunk.text)) for chunk in parts]
    df=Counter()
    for row in counts: df.update(row.keys())
    weighted=[{t:(1+math.log(n))*math.log(1+len(parts)/(1+df[t])) for t,n in row.items()} for row in counts]
    norms=[math.sqrt(sum(v*v for v in row.values())) for row in weighted]
    def similarity(i,j):
        left,right=weighted[i],weighted[j]
        if len(left)>len(right): left,right=right,left
        return sum(v*right.get(t,0) for t,v in left.items())/max(norms[i]*norms[j],1e-12)
    if not parts: return []
    selected=[0]
    closest=[similarity(i,0) for i in range(len(parts))]
    while len(selected)<min(budget,len(parts)):
        # Empty/tokenless chunks supply no useful representative. Stable ties.
        options=[i for i in range(len(parts)) if i not in selected and norms[i]>0]
        if not options: break
        chosen=min(options,key=lambda i:(closest[i],i))
        selected.append(chosen)
        closest=[max(value,similarity(i,chosen)) for i,value in enumerate(closest)]
    return sorted(selected)


def quantize(vectors,precision):
    """Actual round-trip, no truncation of embedding dimensions."""
    if precision=="f32": return vectors.copy(),vectors.nbytes
    if precision=="f16":
        packed=vectors.astype(np.float16)
        return packed.astype(np.float32),packed.nbytes
    if precision=="int8":
        scales=np.maximum(np.max(np.abs(vectors),axis=1,keepdims=True)/127,np.finfo(np.float32).tiny)
        packed=np.rint(vectors/scales).clip(-127,127).astype(np.int8)
        return packed.astype(np.float32)*scales,packed.nbytes+scales.nbytes
    raise ContractError("Unknown vector precision")


@dataclass
class Prepared:
    policy:str
    paths:list[str]
    vectors:np.ndarray
    locators:list[Chunk]
    prepare_ms:float
    source_bytes:int
    all_passages:int
    selected_passages:int


def prepare(sources:dict[str,Source],policy,bridge):
    if policy not in POLICIES: raise ContractError("Unknown representation")
    began=time.perf_counter()
    paths=[]
    locators=[]
    inputs=[]
    recipes=[]
    all_count=source_bytes=0
    for path,source in sorted(sources.items()):
        parts=chunks(source)
        all_count+=len(parts)
        source_bytes+=len("\n".join(source.lines).encode("utf-8"))
        if not parts: continue
        budget=representative_count(len(parts))
        if policy in {"prefix-512","whole-token-centroid"}:
            text="\n".join(source.lines)
            anchors=[parts[0] if policy=="prefix-512" else Chunk(text,1,len(source.lines),0,len(text.encode("utf-8")))]
            texts=[text]
        elif policy in {"intro-uniform","intro-lex-diverse"}:
            picks=uniform_indices(len(parts),budget) if policy=="intro-uniform" else lexical_diverse_indices(parts,budget)
            anchors=[parts[i] for i in picks]
            texts=[p.text for p in anchors]
        else:
            anchors=parts
            texts=[p.text for p in parts]
        recipes.append((path,len(inputs),len(texts),anchors,budget))
        inputs.extend(texts)
    every=bridge.embed(inputs,512 if policy=="prefix-512" else None)
    selected=[]
    for path,start,count,anchors,budget in recipes:
        vectors=every[start:start+count]
        picks=diverse_indices(vectors,budget) if policy=="intro-vector-diverse" else list(range(count))
        selected.append(vectors[picks])
        locators.extend(anchors[i] for i in picks)
        paths.extend([path]*len(picks))
    if not paths: raise ContractError("No nonempty document representation")
    return Prepared(policy,paths,np.concatenate(selected),locators,(time.perf_counter()-began)*1000,source_bytes,all_count,len(paths))
