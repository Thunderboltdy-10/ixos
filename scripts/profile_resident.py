"""Profile actual resident CPU retrieval and OS memory; no relevance labels.

Windows reports sampled/peak working set and private committed bytes. Other
platforms report process peak RSS via child rusage, explicitly in native units.
"""
import argparse
import hashlib
import json
from pathlib import Path
import statistics
import subprocess
import sys
import tempfile
import time


def windows_memory(pid):
    import ctypes
    from ctypes import wintypes
    class Counters(ctypes.Structure):
        _fields_ = [('cb', wintypes.DWORD), ('PageFaultCount', wintypes.DWORD)] + [(key, ctypes.c_size_t) for key in ['PeakWorkingSetSize', 'WorkingSetSize', 'QuotaPeakPagedPoolUsage', 'QuotaPagedPoolUsage', 'QuotaPeakNonPagedPoolUsage', 'QuotaNonPagedPoolUsage', 'PagefileUsage', 'PeakPagefileUsage', 'PrivateUsage']]
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    psapi = ctypes.WinDLL('psapi', use_last_error=True)
    kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel.OpenProcess.restype = wintypes.HANDLE
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
    psapi.GetProcessMemoryInfo.restype = wintypes.BOOL
    handle = kernel.OpenProcess(0x410, False, pid)
    if not handle:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        counts = Counters()
        counts.cb = ctypes.sizeof(counts)
        if not psapi.GetProcessMemoryInfo(handle, ctypes.byref(counts), counts.cb):
            raise ctypes.WinError(ctypes.get_last_error())
        return {'working_set_bytes': counts.WorkingSetSize, 'peak_working_set_bytes': counts.PeakWorkingSetSize, 'private_committed_bytes': counts.PrivateUsage}
    finally:
        kernel.CloseHandle(handle)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--representation', choices=['intro-uniform', 'whole-token-centroid'], required=True)
    parser.add_argument('--query', required=True)
    parser.add_argument('--runs', type=int, default=5)
    parser.add_argument('--evidence-policy', choices=['global-line', 'bounded-rerank'], default='global-line')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert 1 <= args.runs <= 100
    source_hashes = {str(path.relative_to(args.root)): hashlib.sha256(path.read_bytes()).hexdigest()
                     for path in sorted(args.root.rglob('*')) if path.is_file() and not path.is_symlink()}
    configuration = '[retrieval]\nmode="hybrid"\nevidence_policy="global-line"\nsession="off"\nlimit=10\ncontext=2\noutput_bytes=6000\nio_workers=4\ntypo_correction=false\n'
    temporary_config = tempfile.TemporaryDirectory(prefix='ixos-resident-profile-config-')
    config_path = Path(temporary_config.name) / 'config.toml'
    config_path.write_text(configuration, encoding='utf-8')
    argv = [str(args.binary.resolve()), '--config', str(config_path), 'serve', '--dir', str(args.root.resolve()), '--model-path', str(args.model.resolve()), '--representation', args.representation, '--quiet-stats', '--jit']
    if args.evidence_policy != 'global-line': argv += ['--evidence-policy', args.evidence_policy]
    began = time.perf_counter()
    process = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    samples = []
    try:
        ready = json.loads(process.stderr.readline())
        startup = (time.perf_counter() - began) * 1000
        assert ready['type'] == 'ready'
        if sys.platform == 'win32':
            model_memory = windows_memory(process.pid)
        else:
            model_memory = None
        for i in range(args.runs + 1):
            request = {'op': 'search', 'id': str(i), 'query': args.query, 'stats': True}
            began = time.perf_counter()
            process.stdin.write((json.dumps(request) + '\n').encode())
            process.stdin.flush()
            stats = json.loads(process.stderr.readline())
            raw = process.stdout.readline()
            elapsed = (time.perf_counter() - began) * 1000
            response = json.loads(raw)
            assert stats['type'] == 'stats' and response['id'] == str(i)
            samples.append({'condition': 'fill' if i == 0 else 'resident-warm', 'wall_ms': elapsed, 'stdout_bytes': len(raw), 'diagnostics': stats['diagnostics'], 'memory': windows_memory(process.pid) if sys.platform == 'win32' else None})
        process.stdin.close()
        assert process.wait(timeout=30) == 0
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()
        temporary_config.cleanup()
    peak = None
    if sys.platform != 'win32':
        import resource
        usage = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
        peak = {'peak_rss_bytes': usage if sys.platform == 'darwin' else usage * 1024}
    value = {'quality_benchmark': False, 'argv': argv, 'platform': sys.platform,
             'configuration_toml': configuration,
             'source_hashes': source_hashes,
             'binary_sha256': hashlib.sha256(args.binary.read_bytes()).hexdigest(),
             'startup_wall_ms': startup, 'model_only_memory': model_memory,
             'other_platform_peak': peak, 'warm_p50_ms': statistics.median(row['wall_ms'] for row in samples[1:]),
             'samples': samples, 'note': 'Fixed query, own source, sequential fresh resident process. Warm requests still read/hash every source. Disk artifact size is not RSS; private committed bytes are not working set. Not low-end-device or agent-task evidence.'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    assert source_hashes == {str(path.relative_to(args.root)): hashlib.sha256(path.read_bytes()).hexdigest()
                             for path in sorted(args.root.rglob('*')) if path.is_file() and not path.is_symlink()}
    args.output.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: value[key] for key in ['startup_wall_ms', 'model_only_memory', 'warm_p50_ms']}, indent=2))


if __name__ == '__main__':
    main()
