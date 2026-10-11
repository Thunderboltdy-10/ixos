"""Measured retrieval candidates and bounded session controls for the lab.

This is a persistent, precomputed-vector quality screen. It does not simulate
filesystem/cache or fresh CLI timings. Raw visible responses still obey budgets.
"""
from __future__ import annotations
from collections import OrderedDict
import math
import time
import numpy as np
from eval.backends import Response
from eval.lexical import BM25,compact_response,terms,tokens,view_at
from eval.representations import quantize


def unit(vector):
    norm=float(np.linalg.norm(vector))
    return vector/norm if norm>0 else vector


def lexical_scores(index,query):
    query_terms=terms(query)
    idfs={t:math.log(1+(len(index.tf)-index.df[t]+.5)/(index.df[t]+.5)) for t in query_terms}
    scored={path:sum(idfs[t]*(counts[t]*2.2)/(counts[t]+1.2*(.25+.75*index.lengths[path]/max(index.average_length,1))) for t in query_terms if counts[t]) for path,counts in index.tf.items()}
    return scored,idfs


class Session:
    """At most 16 prior responses / four-turn feedback horizon; reset on drift."""
    def __init__(self,policy):
        self.policy=policy
        self.history=OrderedDict()
        self.turn=0
        self.current_topic=None

    def adjusted(self,query,feedback,text=''):
        original=unit(query)
        changed=original.copy()
        reset=False
        if self.policy=="off": return original,False,False
        previous=next(reversed(self.history.values()),None)
        pronouns={'it','its','they','them','their','that','this','those'}
        continuation=bool(pronouns.intersection(tokens(text))) and len([t for t in terms(text) if t not in pronouns])<=3
        if previous and not continuation and float(original@previous["query"])<.2:
            self.history.clear()
            previous=None
            reset=True
        if previous and self.policy in {"query-ema","combined"}:
            changed+=(.35 if continuation else .12)*previous.get('topic',previous['query'])
        consumed=False
        if feedback is not None and self.policy in {"feedback-rocchio","combined"}:
            record=self.history.get(feedback["query_id"])
            if record and self.turn-record["turn"]<=4 and (continuation or float(original@record["query"])>=.2):
                # Responses only contain returned documents. Unavailable paths
                # cannot be looked up through the full corpus or relevance gold.
                accepted=[record["documents"][p] for p in feedback["accepted"] if p in record["documents"]]
                rejected=[record["documents"][p] for p in feedback["rejected"] if p in record["documents"]]
                if accepted: changed+=.15*unit(np.mean(accepted,axis=0))
                if rejected: changed-=.07*unit(np.mean(rejected,axis=0))
                consumed=bool(accepted or rejected)
        self.current_topic=previous.get('topic',previous['query']) if previous and continuation else original
        return unit(changed),consumed,reset

    def remember(self,qid,query,documents):
        if self.policy=="off": return
        self.history[qid]={"query":unit(query.copy()),"topic":self.current_topic.copy() if self.current_topic is not None else unit(query.copy()),"documents":documents,"turn":self.turn}
        self.turn+=1
        while len(self.history)>16: self.history.popitem(last=False)


class Retriever:
    def __init__(self,dataset,prepared,precision,mode,*,threshold=0,limit=10,context=2,output_bytes=12000,session="off",literal_guard=True,index=None,lexical_cache=None,anchor_cache=None):
        self.dataset=dataset
        self.prepared=prepared
        self.vectors,self.vector_payload_bytes=quantize(prepared.vectors,precision)
        norms=np.linalg.norm(self.vectors,axis=1,keepdims=True)
        self.vectors=np.divide(self.vectors,norms,out=np.zeros_like(self.vectors),where=norms>0)
        self.mode=mode
        self.threshold=threshold
        self.limit=limit
        self.context=context
        self.output_bytes=output_bytes
        self.literal_guard=literal_guard
        self.index=index or BM25(dataset)
        self.lexical_cache=lexical_cache if lexical_cache is not None else {}
        self.anchor_cache=anchor_cache if anchor_cache is not None else {}
        self.session=Session(session)
        self.path_rows={}
        for i,path in enumerate(prepared.paths): self.path_rows.setdefault(path,[]).append(i)

    def reset(self): self.session=Session(self.session.policy)

    def search(self,query,embedding,feedback=None,qid="independent"):
        started=time.perf_counter()
        adjusted,consumed,drift_reset=self.session.adjusted(embedding,feedback,query)
        raw_scores=self.vectors@adjusted
        strongest={p:max(rows,key=lambda i:raw_scores[i]) for p,rows in self.path_rows.items()}
        semantic={p:float(raw_scores[i]) for p,i in strongest.items()}
        if query not in self.lexical_cache:
            self.lexical_cache[query]=lexical_scores(self.index,query)
        lexical,idfs=self.lexical_cache[query]
        sem_rank=sorted((p for p in semantic if semantic[p]>self.threshold),key=lambda p:(-semantic[p],p))
        lex_rank=sorted((p for p in lexical if lexical[p]>0),key=lambda p:(-lexical[p],p))
        if self.mode=="semantic":
            fused={p:semantic[p] for p in sem_rank}
        elif self.mode=="hybrid-rrf":
            fused={}
            for order in [sem_rank[:100],lex_rank[:100]]:
                for rank,path in enumerate(order,1): fused[path]=fused.get(path,0)+1/(60+rank)
        else:
            maximum=max(lexical.values(),default=0)
            fused={p:.5*max(semantic.get(p,0),0)+.5*lexical[p]/max(maximum,1e-12) for p in set(sem_rank[:100])|set(lex_rank[:100])}
        literal=query.strip()
        is_identifier=(" " not in literal and any(c in literal for c in "_:/\\") or " " not in literal and any(c.isupper() for c in literal[1:]) and any(c.islower() for c in literal))
        guarded=self.literal_guard and is_identifier
        if guarded:
            fused={p:score for p,score in fused.items() if literal.casefold() in "\n".join(self.dataset.sources[p].lines).casefold() or literal.casefold() in p.casefold()}
        ranked=sorted(fused,key=lambda p:(-fused[p],p))[:self.limit]
        rows=[]
        for path in ranked:
            source=self.dataset.sources[path]
            best=strongest[path]
            key=(query,path)
            if key not in self.anchor_cache:
                weights=[sum(idfs.get(t,0) for t in set(tokens(line))) for line in source.lines]
                self.anchor_cache[key]=max(range(len(weights)),key=lambda i:(weights[i],-i))+1 if weights and max(weights)>0 else None
            if self.anchor_cache[key] is not None:
                anchor=self.anchor_cache[key]
            else:
                anchor=self.prepared.locators[best].start_line
            rows.append({"path":path,"score":fused[path],"semantic_score":semantic[path],"lexical_score":lexical[path],"view":view_at(self.dataset,path,anchor,self.context),"_anchor":anchor})
        raw,retained=compact_response(rows,self.output_bytes)
        documents={r["path"]:self.vectors[strongest[r["path"]]].copy() for r in retained}
        self.session.remember(qid,embedding,documents)
        return Response([r["path"] for r in retained],[r["view"] for r in retained if r.get("view") is not None],raw,b"",["lab-persistent-vector-query",query],0,(time.perf_counter()-started)*1000,{"condition":"quality screen with shared lexical/anchor memoization; excludes query embedding and filesystem/cache I/O; not production latency","feedback_consumed":consumed,"drift_reset":drift_reset,"session_entries":len(self.session.history),"literal_guard":guarded,"vectors_scored":len(self.vectors),"files_scored":len(strongest),"vector_payload_bytes":self.vector_payload_bytes},[])
