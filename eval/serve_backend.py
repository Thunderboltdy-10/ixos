"""Actual persistent Ixos JSONL process, with deadlines and raw wire capture."""
import json
from pathlib import Path
import queue
import subprocess
import threading
import time
from eval.backends import Response,decode_ixos
from eval.contract import ContractError


class ServeBackend:
    def __init__(self,binary,model,root,dataset,output,*,session='off',representation='intro-uniform',budget=6000,jit=False,io_workers=1):
        self.root,self.dataset=root,dataset
        self.budget=budget
        self.session=session
        self.argv=[str(binary.resolve()),'serve','--dir',str(root.resolve()),'--model-path',str(model.resolve()),'--session',session,'--representation',representation,'--max-output-bytes',str(budget)]
        self.argv.extend(['--io-workers',str(io_workers)])
        if jit:self.argv.append('--jit')
        self.stdout_log=(output/'serve.raw.stdout').open('wb')
        self.stderr_log=(output/'serve.raw.stderr').open('wb')
        self.requests_log=(output/'serve.requests.jsonl').open('wb')
        self.process=subprocess.Popen(self.argv,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        self.out,self.err=queue.Queue(),queue.Queue()
        def pump(stream,log,mailbox):
            try:
                while True:
                    raw=stream.readline(1024*1024+1)
                    if not raw:break
                    log.write(raw);log.flush();mailbox.put(raw)
            finally:mailbox.put(None)
        self.threads=[threading.Thread(target=pump,args=(self.process.stdout,self.stdout_log,self.out),daemon=True),threading.Thread(target=pump,args=(self.process.stderr,self.stderr_log,self.err),daemon=True)]
        for thread in self.threads:thread.start()
        raw=self._next(self.err)
        self.ready=json.loads(raw)
        if self.ready.get('type')!='ready':self.close();raise ContractError('Persistent engine did not load')

    def _next(self,mailbox):
        try:raw=mailbox.get(timeout=120)
        except queue.Empty:
            self.close();raise ContractError('Persistent engine timed out')
        if raw is None:raise ContractError('Persistent engine exited before a response')
        if len(raw)>1024*1024:raise ContractError('Persistent engine emitted an oversized line')
        return raw

    def request(self,message):
        encoded=(json.dumps(message,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
        self.requests_log.write(encoded);self.requests_log.flush()
        began=time.perf_counter()
        self.process.stdin.write(encoded);self.process.stdin.flush()
        raw=self._next(self.out)
        elapsed=(time.perf_counter()-began)*1000
        value=json.loads(raw)
        if value.get('type')=='error':raise ContractError('Actual persistent request failed: '+value.get('message',''))
        if value.get('id')!=message['id'] or len(raw)>self.budget:raise ContractError('Persistent response identity/budget mismatch')
        stats_raw=b''
        stats={}
        if message['op'] in {'search','grep'}:
            stats_raw=self._next(self.err)
            statistics=json.loads(stats_raw)
            if statistics.get('id')!=message['id']:raise ContractError('Persistent diagnostic identity mismatch')
            stats=statistics['diagnostics']
        return raw,stats_raw,stats,elapsed,encoded

    def reset(self):self.request({'op':'reset','id':'reset'})

    def search(self,text,feedback,qid):
        message={'op':'search','id':qid,'query':text}
        if feedback is not None and self.session!='off':message['feedback']=feedback
        raw,stderr,stats,wall,encoded=self.request(message)
        if stats['discoveredFiles']!=len(self.dataset.sources) or stats['searchableFiles']!=len(self.dataset.sources):raise ContractError('Persistent discovery/extraction differs from the frozen eligible inventory')
        paths,views,failures=decode_ixos(raw,self.root,self.dataset)
        diagnostics={**stats,'feedback_consumed':stats['feedbackConsumed'],'feedback_submitted':'feedback' in message,'raw_request':encoded.decode('utf-8')}
        return Response(paths,views,raw,stderr,self.argv,0,wall,diagnostics,failures)

    def close(self):
        if self.process.stdin and not self.process.stdin.closed:self.process.stdin.close()
        try:self.process.wait(timeout=10)
        except subprocess.TimeoutExpired:self.process.kill();self.process.wait()
        for thread in self.threads:thread.join(timeout=2)
        for stream in [self.process.stdout,self.process.stderr,self.stdout_log,self.stderr_log,self.requests_log]:stream.close()
    def __enter__(self):return self
    def __exit__(self,*_):self.close()
