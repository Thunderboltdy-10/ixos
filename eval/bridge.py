"""Persistent CPU bridge; actually loads safetensors via the Rust runtime."""
from __future__ import annotations
import json
from pathlib import Path
import subprocess
import time
import numpy as np
from eval.contract import ContractError, digest
from eval.run import artifact_identity


class EmbedBridge:
    def __init__(self,binary:Path,model:Path,output:Path):
        self.identity=artifact_identity(model)
        self.stdout_log=(output/"embed-metrics.jsonl").open("a",encoding="utf-8")
        self.stderr_log=(output/"embed.stderr").open("ab")
        self.process=subprocess.Popen([str(binary.resolve()),"--model",str(model.resolve())],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        self.counter=0
        line=self.process.stderr.readline()
        self.stderr_log.write(line)
        self.stderr_log.flush()
        try:
            self.ready=json.loads(line)
            if self.ready["fingerprint"]!=self.identity["fingerprint"]:
                raise ContractError("Bridge loaded a different artifact")
        except Exception:
            self.close()
            raise
        self.binary_sha256=digest(binary.read_bytes())

    def embed(self,texts,max_tokens=None):
        if not texts:
            return np.empty((0,self.ready["dimensions"]),dtype=np.float32)
        parts=[]
        for start in range(0,len(texts),64):
            batch=texts[start:start+64]
            self.counter+=1
            request={"id":str(self.counter),"texts":batch,"max_tokens":max_tokens}
            encoded=(json.dumps(request,ensure_ascii=False,separators=(",",":"))+"\n").encode("utf-8")
            began=time.perf_counter()
            self.process.stdin.write(encoded)
            self.process.stdin.flush()
            raw=self.process.stdout.readline()
            if not raw:
                raise ContractError("Embedding bridge stopped without a response")
            response=json.loads(raw)
            vectors=np.asarray(response.pop("vectors"),dtype=np.float32)
            if response["id"]!=request["id"] or vectors.shape!=(len(batch),self.ready["dimensions"]) or not np.isfinite(vectors).all():
                raise ContractError("Embedding bridge shape/value/identity error")
            response.update(wall_ms=(time.perf_counter()-began)*1000,request_sha256=digest(encoded),response_sha256=digest(raw),response_bytes=len(raw))
            self.stdout_log.write(json.dumps(response)+"\n")
            self.stdout_log.flush()
            parts.append(vectors)
        return np.concatenate(parts)

    def close(self):
        process=getattr(self,"process",None)
        if process:
            if process.stdin and not process.stdin.closed:
                process.stdin.close()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            self.stderr_log.write(process.stderr.read())
            process.stdout.close()
            process.stderr.close()
        self.stdout_log.close()
        self.stderr_log.close()

    def __enter__(self): return self
    def __exit__(self,*_): self.close()
