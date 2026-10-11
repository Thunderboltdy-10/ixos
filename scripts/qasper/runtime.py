"""Deadline-bounded actual CLI sessions with exact UTF-8 wire captures."""
import json
import queue
import subprocess
import threading
import time


class Runtime:
    def __init__(self,argv,environment,wire,paper_id):
        self.wire,self.paper_id=wire,paper_id
        self.process=subprocess.Popen(argv,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=environment)
        self.out,self.err=queue.Queue(),queue.Queue()
        self.threads=[]
        for stream,target,kind in ((self.process.stdout,self.out,'stdout'),(self.process.stderr,self.err,'stderr')):
            def pump(stream=stream,target=target,kind=kind):
                try:
                    while True:
                        raw=stream.readline(1024*1024+1)
                        if not raw:
                            break
                        self.record(kind,raw)
                        target.put(raw)
                finally:
                    target.put(b'')
            thread=threading.Thread(target=pump,daemon=True)
            self.threads.append(thread)
            thread.start()
        try:
            raw=self.next(self.err)
            self.ready_raw=raw
            self.ready=json.loads(raw)
            if self.ready.get('type')!='ready':
                raise ValueError('No ready record from actual model process')
        except Exception:
            self.close()
            raise

    def record(self,kind,raw):
        # The caller provides a lock-protected sink; arbitrary interleaving of the
        # two streams is captured without implying stdout/stderr total order.
        self.wire({'paper_id':self.paper_id,'stream':kind,'raw':raw.decode('utf-8')})

    def next(self,target):
        raw=target.get(timeout=120)
        if not raw or len(raw)>1024*1024:
            raise ValueError('Process ended or exceeded response limit')
        return raw

    def call(self,request):
        encoded=(json.dumps(request,ensure_ascii=False,separators=(',',':'))+'\n').encode()
        self.record('stdin',encoded)
        began=time.perf_counter()
        self.process.stdin.write(encoded)
        self.process.stdin.flush()
        raw=self.next(self.out)
        value=json.loads(raw)
        if value.get('id')!=request['id'] or value.get('type')=='error' or 'error' in value:
            raise ValueError('CLI returned incorrect identity or request error: '+raw.decode())
        diagnostics=b''
        stats={}
        if request.get('stats'):
            diagnostics=self.next(self.err)
            packet=json.loads(diagnostics)
            if packet.get('id')!=request['id']:
                raise ValueError('Diagnostic response identity differs')
            stats=packet['diagnostics']
        return value,raw,diagnostics,stats,(time.perf_counter()-began)*1000,encoded

    def close(self):
        try:
            if not self.process.stdin.closed:
                self.process.stdin.close()
            self.process.wait(timeout=20)
        except (BrokenPipeError,subprocess.TimeoutExpired):
            self.process.kill()
            self.process.wait()
        for thread in self.threads:
            thread.join(timeout=5)
        for stream in (self.process.stdout,self.process.stderr):
            stream.close()
        if self.process.returncode!=0:
            raise ValueError(f'CLI process exit {self.process.returncode}')

    def __enter__(self):
        return self

    def __exit__(self,*_):
        self.close()
