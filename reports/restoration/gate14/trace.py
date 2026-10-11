import hashlib, json, os, resource, signal, subprocess, tempfile
from pathlib import Path
root=Path(os.environ['IXOS_REVIEW_ROOT']); source=root/'source'; out=root/'receipts-gate14-trace'; out.mkdir()
binary=source/'target/release/ixos'; profiler=root/'strace-gate14/extracted/usr/bin/strace'
reference=json.loads((root/'receipts-gate14-allocator/receipt.json').read_text())
requests=reference['requests']; cpus=os.sched_getaffinity(0)
receipt={'status':'running','binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'profiler_sha256':hashlib.sha256(profiler.read_bytes()).hexdigest(),'quality_benchmark':False,'runs':[],'condition':'Profile-only syscall counts. strace overhead makes its timings unsuitable for performance comparisons. One core/RAYON1/io1; virtual limit256MiB, allocator default versus max1, and uncapped default. Fresh processes, two repetitions each/model. No production change.'}
def save(): (out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
with tempfile.TemporaryDirectory(dir=root/'probes',prefix='ixos-strace-config-') as temporary:
 config=Path(temporary)/'config.toml'; config.write_text(reference['configuration_toml'])
 for index,model in enumerate(reference['models']):
  for repetition in range(2):
   for label,arenas,limit in [('default256',None,256),('arena1-256',1,256),('default-unlimited',None,None)]:
    stem=out/f'{index}-{repetition}-{label}'
    env=dict(os.environ); env.pop('IXOS_MODEL_PATH',None); env.pop('GLIBC_TUNABLES',None); env.pop('MALLOC_ARENA_MAX',None); env['RAYON_NUM_THREADS']='1'
    if arenas: env['MALLOC_ARENA_MAX']=str(arenas)
    argv=[str(profiler),'-f','-c','-e','trace=%memory,futex','-o',str(stem.with_suffix('.summary')),str(binary),'--config',str(config),'serve','--dir',str(root/'frozen-code-gate12/src'),'--model-path',str(root/'models'/('potion-code-16M-v2-unbounded' if index==0 else 'potion-retrieval-32M-row-int8')),'--representation',model['representation'],'--io-workers','1','--jit','--quiet-stats']
    def constrain():
     resource.setrlimit(resource.RLIMIT_CORE,(0,0)); os.sched_setaffinity(0,{min(cpus)})
     if limit: resource.setrlimit(resource.RLIMIT_AS,(limit*1024*1024,limit*1024*1024))
    process=subprocess.Popen(argv,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,preexec_fn=constrain,start_new_session=True)
    timed_out=False
    try: stdout,stderr=process.communicate(('\n'.join(json.dumps(r) for r in requests)+'\n').encode(),timeout=120)
    except subprocess.TimeoutExpired:
     timed_out=True; os.killpg(process.pid,signal.SIGKILL); stdout,stderr=process.communicate()
    stem.with_suffix('.stdout').write_bytes(stdout); stem.with_suffix('.stderr').write_bytes(stderr)
    row={'model_index':index,'repetition':repetition,'condition':label,'argv':argv,'exit_code':process.returncode,'timed_out':timed_out,'output_sha256':hashlib.sha256(stdout).hexdigest()}
    if process.returncode==0:
     expected=next(r for r in model['runs'] if r['status']=='passed')
     assert [hashlib.sha256(r).hexdigest() for r in stdout.splitlines(keepends=True)]==[r['response_sha256'] for r in expected['requests']]
     row['exact_output_equal']=True
    receipt['runs'].append(row); save(); print(f'{index}/{label}: exit{process.returncode}',flush=True)
receipt['status']='completed'; save()
