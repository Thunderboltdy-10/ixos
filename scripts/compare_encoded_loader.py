"""Real-model bit equivalence and sequential encoded/eager loader costs.

No relevance labels or training. Use a fixed source export, fresh raw-output and
receipt paths. Both measured arms use the same bridge executable; an optional
earlier bridge verifies the reference wrapper independently.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import statistics
import struct
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from eval.artifacts import artifact_identity
from scripts.profile_resident import windows_memory


def memory(pid):
    if os.name == 'nt':
        return windows_memory(pid)
    if sys.platform.startswith('linux'):
        fields = {}
        for line in Path(f'/proc/{pid}/status').read_text().splitlines():
            if line.startswith(('VmRSS:', 'VmHWM:')):
                key, value, _ = line.split()
                fields[key[:-1]] = int(value) * 1024
        return fields
    return None


def vector_hash(vectors):
    digest = hashlib.sha256()
    for vector in vectors:
        digest.update(struct.pack('<I', len(vector)))
        for value in vector:
            digest.update(struct.pack('<f', value))
    return digest.hexdigest()


def inputs(source):
    hashes, chunks = {}, []
    for path in sorted((source / 'src').rglob('*.rs')):
        data = path.read_bytes()
        hashes[path.relative_to(source).as_posix()] = hashlib.sha256(data).hexdigest()
        text = data.decode('utf-8').replace('\r\n', '\n')
        chunks.extend(text[start:start + 1800] for start in range(0, len(text), 1800))
    probes = ['', 'unknown 😀 中 Ελληνικά', 'equal-length source edits invalidate cache vectors',
              'Dónde se comprueba la frescura de los archivos', '学校的研究文件和检索',
              'fn raw_hash(bytes: &[u8]) -> [u8; 32] { sha256(bytes) }',
              'office extraction supports bounded text without binary corruption. ' * 1200]
    return hashes, [
        {'id': 'query', 'texts': [probes[2]], 'max_tokens': None},
        {'id': 'edge-uncapped', 'texts': probes, 'max_tokens': None},
        {'id': 'edge-capped', 'texts': probes, 'max_tokens': 512},
        {'id': 'source-uncapped', 'texts': chunks, 'max_tokens': None},
        {'id': 'source-capped', 'texts': chunks, 'max_tokens': 128},
    ]


def run(binary, model, encoded, folder, requests):
    folder.mkdir()
    argv = [str(binary.resolve()), '--model', str(model.resolve())] + (['--encoded'] if encoded else [])
    (folder / 'argv.json').write_text(json.dumps(argv, indent=2) + '\n', encoding='utf-8')
    started = time.perf_counter()
    process = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        ready_raw = process.stderr.readline()
        (folder / 'ready.stderr').write_bytes(ready_raw)
        ready = json.loads(ready_raw)
        assert ready['type'] == 'ready'
        result = {'argv': argv, 'ready': ready, 'startup_wall_ms': (time.perf_counter()-started)*1000,
                  'model_only_memory': memory(process.pid), 'requests': []}
        for request in requests:
            raw = (json.dumps(request, ensure_ascii=False) + '\n').encode('utf-8')
            (folder / (request['id'] + '.stdin')).write_bytes(raw)
            process.stdin.write(raw)
            process.stdin.flush()
            reply_raw = process.stdout.readline()
            (folder / (request['id'] + '.stdout')).write_bytes(reply_raw)
            reply = json.loads(reply_raw)
            assert reply['id'] == request['id'] and len(reply['vectors']) == len(request['texts'])
            result['requests'].append({'id': request['id'], 'inputs': reply['inputs'],
                'input_bytes': reply['input_bytes'], 'max_tokens': reply['max_tokens'],
                'embed_ms': reply['embed_ms'], 'f32_bits_sha256': vector_hash(reply['vectors'])})
        result['after_requests_memory'] = memory(process.pid)
        process.stdin.close()
        assert process.wait(timeout=30) == 0
        (folder / 'remaining.stderr').write_bytes(process.stderr.read())
        return result
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--reference-binary', type=Path)
    parser.add_argument('--model', type=Path, action='append', required=True)
    parser.add_argument('--source-export', type=Path, required=True)
    parser.add_argument('--runs', type=int, default=5)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists() or args.receipt.exists() or not 1 <= args.runs <= 20:
        parser.error('Use new paths and 1–20 measured repetitions')
    args.output.mkdir(parents=True)
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    hashes, requests = inputs(args.source_export)
    receipt = {'status': 'running', 'quality_benchmark': False, 'source_hashes': hashes,
               'binary_sha256': hashlib.sha256(args.binary.read_bytes()).hexdigest(),
               'reference_binary_sha256': hashlib.sha256(args.reference_binary.read_bytes()).hexdigest() if args.reference_binary else None,
               'inputs_sha256': hashlib.sha256(json.dumps(requests, ensure_ascii=False).encode()).hexdigest(),
               'runs': args.runs, 'models': [], 'condition': 'One unmeasured warm-up per arm, then alternating arm order; sequential fresh processes. Same executable and fixed input bytes. All f32 bits, not cosine tolerance. Model-only memory at ready; later peak includes embedding work. Not retrieval quality or low-end/Mac proof.'}
    def save():
        args.receipt.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    save()
    for index, model in enumerate(args.model):
        record = {'model': artifact_identity(model), 'runs': []}
        receipt['models'].append(record)
        reference = None
        reference_metadata = None
        arms = [('original', args.reference_binary, False)] if args.reference_binary else []
        arms += [('eager-warmup', args.binary, False), ('encoded-warmup', args.binary, True)]
        for label, binary, encoded in arms:
            result = run(binary, model, encoded, args.output/f'{index}-{label}', requests)
            signatures = [row['f32_bits_sha256'] for row in result['requests']]
            if reference is None:
                reference = signatures
                reference_metadata = {key: result['ready'][key] for key in ['fingerprint', 'dimensions', 'tokenizer_settings']}
            assert signatures == reference, 'Real-model bit mismatch: ' + label
            assert {key: result['ready'][key] for key in reference_metadata} == reference_metadata
            assert result['ready']['fingerprint'] == record['model']['fingerprint']
            record['runs'].append({'arm': label, 'measured': False, **result})
            save()
        for repetition in range(args.runs):
            for arm in (['eager', 'encoded'] if repetition % 2 == 0 else ['encoded', 'eager']):
                result = run(args.binary, model, arm == 'encoded', args.output/f'{index}-{repetition}-{arm}', requests)
                assert [row['f32_bits_sha256'] for row in result['requests']] == reference, 'Real-model bit mismatch: ' + arm
                assert {key: result['ready'][key] for key in reference_metadata} == reference_metadata
                record['runs'].append({'arm': arm, 'measured': True, **result})
                save()
        record['summary'] = {}
        for arm in ['eager', 'encoded']:
            rows = [row for row in record['runs'] if row['measured'] and row['arm'] == arm]
            record['summary'][arm] = {'load_p50_ms': statistics.median(row['ready']['load_ms'] for row in rows),
                'startup_p50_ms': statistics.median(row['startup_wall_ms'] for row in rows),
                'embedding_p50_ms': {q['id']: statistics.median(row['requests'][i]['embed_ms'] for row in rows)
                                     for i, q in enumerate(requests)}}
        save()
        print(model.name + ': all f32 bits equal; ' + json.dumps(record['summary']), flush=True)
    receipt['status'] = 'passed'
    receipt['bitwise_equivalent'] = True
    save()


if __name__ == '__main__':
    main()
