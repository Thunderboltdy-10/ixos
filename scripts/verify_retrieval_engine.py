"""Real-artifact native cache, source edits and JSONL failure-isolation probes."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import sys
import os
import stat
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from eval.serve_backend import ServeBackend


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary',type=Path,default=Path('target/release/ixos.exe'))
    parser.add_argument('--model',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    results=[]
    with tempfile.TemporaryDirectory(prefix='ixos-record-probe-') as temporary:
        root=Path(temporary)
        path=root/'long.txt'
        text='Introduction about source discovery.\n'+'routine notes 中😀\n'*2400+'LATE_WITNESS_A appears after the entire long prefix.\n'
        path.write_bytes(text.encode())
        (root/'.gitignore').write_text('ignored.txt\n',encoding='utf-8')
        (root/'ignored.txt').write_text('LATE_WITNESS_A',encoding='utf-8')
        before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.iterdir() if p.is_file()}
        def metadata():
            value=path.stat()
            return {'mode':stat.S_IMODE(value.st_mode),'bytes':value.st_size,
                    'mtime_ns':value.st_mtime_ns,'ctime_ns':value.st_ctime_ns}
        before_metadata=metadata()
        def search(query,cache='native-cache'):
            argv=[str(args.binary.resolve()),'search',query,'--dir',str(root),'--retrieval','hybrid','--model-path',str(args.model.resolve()),'--json','--stats','--cache-mode',cache,'--max-output-bytes','3000']
            raw=subprocess.run(argv,capture_output=True,timeout=120)
            if raw.returncode:raise AssertionError(raw.stderr.decode())
            value=json.loads(raw.stdout)
            stats=json.loads(raw.stderr)['diagnostics']
            assert len(raw.stdout)<=3000
            assert value['results'][0]['path']==path.name
            assert value['results'][0]['view']['start_line']>2000
            return value,stats
        first,s1=search('LATE_WITNESS_A')
        second,s2=search('LATE_WITNESS_A')
        assert s1['passagesEmbedded']==8 and s2['passagesEmbedded']==0
        assert s2['nativeCacheHits']+s2['applicationCacheHits']==1
        assert abs(first['results'][0]['score']-second['results'][0]['score'])<1e-6
        assert before=={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.iterdir() if p.is_file()}
        if os.name=='nt' or sys.platform.startswith('linux'):
            assert metadata()['mtime_ns']==before_metadata['mtime_ns']
        results.append({'case':'warm record preserves source/ranking and eight passages','first':s1,'second':s2,
                        'source_metadata_before':before_metadata,'source_metadata_after':metadata()})
        path.write_bytes(text.replace('LATE_WITNESS_A','LATE_WITNESS_B').encode())
        _,edited=search('LATE_WITNESS_B')
        assert edited['passagesEmbedded']==8
        results.append({'case':'equal-length source edit refreshes record','stats':edited})
        moved=root/'moved.txt'
        path.rename(moved);path=moved
        _,renamed=search('LATE_WITNESS_B')
        if s1['cacheWrites'] and s2['nativeCacheHits']:assert renamed['passagesEmbedded']==0
        results.append({'case':'rename preserves native record','stats':renamed})
        _,jit=search('LATE_WITNESS_B','ephemeral')
        assert jit['passagesEmbedded']==8 and jit['cacheWrites']==0 and jit['nativeCacheHits']==0
        results.append({'case':'JIT ignores native record and does not persist','stats':jit})
        before_clear=metadata()
        cleared=subprocess.run([str(args.binary.resolve()),'cache','clear','--dir',str(root),'--force'],capture_output=True,timeout=120)
        assert cleared.returncode==0,cleared.stderr.decode()
        if os.name=='nt' or sys.platform.startswith('linux'):
            assert metadata()['mtime_ns']==before_clear['mtime_ns']
        _,cleared_stats=search('LATE_WITNESS_B')
        assert cleared_stats['passagesEmbedded']==8
        results.append({'case':'explicit cache clear includes document namespace','stats':cleared_stats})
        # Raw malformed request must return one error and permit the next valid
        # request. A separate native process validates that failure isolation.
        messages=[b'{bad}\n',json.dumps({'op':'search','id':'next','query':'LATE_WITNESS_B'}).encode()+b'\n']
        process=subprocess.run([str(args.binary.resolve()),'serve','--dir',str(root),'--model-path',str(args.model.resolve()),'--max-output-bytes','3000'],input=b''.join(messages),capture_output=True,timeout=120)
        assert process.returncode==0,process.stderr.decode()
        rows=[json.loads(line) for line in process.stdout.decode().split('\n') if line]
        assert rows[0]['type']=='error' and rows[1]['id']=='next' and rows[1]['results'][0]['path']=='moved.txt'
        assert all(len((json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n').encode())<=3000 for row in rows)
        results.append({'case':'malformed JSONL request does not kill following search','responses':len(rows)})
        with tempfile.TemporaryDirectory(prefix='ixos-wire-probe-') as wire:
            with ServeBackend(args.binary,args.model,root,None,Path(wire),session='combined',budget=3000) as server:
                server.request({'op':'search','id':'before-edit','query':'LATE_WITNESS_B'})
                _,_,indexed,_,_=server.request({'op':'search','id':'indexed-feedback','query':'What happens to it?','feedback':{'query_id':'before-edit','accepted':[0],'rejected':[]}})
                assert indexed['feedbackConsumed']
                path.write_bytes(text.replace('LATE_WITNESS_A','LATE_WITNESS_C').encode())
                _,_,statistics,_,_=server.request({'op':'search','id':'after-edit','query':'What happens to it?','feedback':{'query_id':'before-edit','accepted':['moved.txt'],'rejected':[]}})
                assert statistics['passagesEmbedded']==8 and not statistics['feedbackConsumed']
                server.reset()
                _,_,statistics,_,_=server.request({'op':'search','id':'after-reset','query':'LATE_WITNESS_C'})
                assert statistics['sessionEntries']==1
        results.append({'case':'indexed feedback is consumed; source edits invalidate live vectors and old feedback; reset clears session','status':'passed'})
        # Linux user.* attributes require source write permission. Run this as
        # an ordinary user; root bypasses the permission being tested. Native
        # macOS permission behavior needs its own probe rather than assuming
        # that every Unix filesystem matches Linux.
        if os.name=='nt' or (sys.platform.startswith('linux') and os.geteuid()!=0):
            path.write_bytes(text.replace('LATE_WITNESS_A','LATE_WITNESS_F').encode())
            original_mode=stat.S_IMODE(path.stat().st_mode)
            path.chmod(stat.S_IREAD)
            try:
                _,filled=search('LATE_WITNESS_F')
                _,fallback=search('LATE_WITNESS_F')
                assert filled['cacheWrites']==1 and fallback['applicationCacheHits']==1
                assert fallback['passagesEmbedded']==0
                results.append({'case':'readonly native source uses application DB without sidecars','fill':filled,'warm':fallback})
            finally:path.chmod(original_mode)
        subprocess.run([str(args.binary.resolve()),'cache','clear','--dir',str(root),'--force'],capture_output=True,timeout=120,check=True)
        unicode_path=root/'Ω 中😀'/'source 中.rs'
        unicode_path.parent.mkdir()
        unicode_bytes='fn UNIQUE_UNICODE_WITNESS() {}\n// Evidence 中😀\n'.encode()
        unicode_path.write_bytes(unicode_bytes)
        before_names={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
        argv=[str(args.binary.resolve()),'search','UNIQUE_UNICODE_WITNESS','--dir',str(root),
              '--model-path',str(args.model.resolve()),'--json','--stats','--max-output-bytes','3000']
        unicode_rows=[]
        for _ in range(2):
            raw=subprocess.run(argv,capture_output=True,timeout=120,check=True)
            value=json.loads(raw.stdout)
            stats=json.loads(raw.stderr)['diagnostics']
            assert value['results'][0]['path']==unicode_path.relative_to(root).as_posix()
            assert '中😀' in value['results'][0]['view']['text']
            unicode_rows.append(stats)
        assert unicode_rows[1]['passagesEmbedded']==0
        assert unicode_rows[1]['nativeCacheHits']+unicode_rows[1]['applicationCacheHits']==2
        assert unicode_path.read_bytes()==unicode_bytes
        assert before_names=={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
        results.append({'case':'Unicode source names/content retrieve and cache without adjacent files',
                        'first':unicode_rows[0],'warm':unicode_rows[1]})
        subprocess.run([str(args.binary.resolve()),'cache','clear','--dir',str(root),'--force'],capture_output=True,timeout=120,check=True)
    args.output.write_text(json.dumps({'status':'passed','model':str(args.model),'cases':results},indent=2),encoding='utf-8')
    print(f'{len(results)} real-artifact retrieval/cache/protocol probes passed')


if __name__=='__main__':main()
