"""Actual-model explicit inspection feedback contracts, not relevance labels."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import tempfile
import threading

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eval.artifacts import artifact_identity


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def state(root):
    return {p.relative_to(root).as_posix(): [sha(p.read_bytes()), p.stat().st_mtime_ns]
            for p in sorted(root.rglob('*')) if p.is_file()}


class Session:
    def __init__(self, argv, env, folder, budget):
        folder.mkdir(parents=True)
        self.folder, self.budget, self.argv = folder, budget, argv
        self.buffers = {'requests': [], 'stdout': [], 'stderr': []}
        self.process = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        stderr=subprocess.PIPE, env=env)
        self.out, self.err = queue.Queue(), queue.Queue()
        self.threads = []
        self.stats = {}
        for stream, target, key in [(self.process.stdout, self.out, 'stdout'),
                                    (self.process.stderr, self.err, 'stderr')]:
            def pump(stream=stream, target=target, key=key):
                for raw in iter(stream.readline, b''):
                    self.buffers[key].append(raw)
                    target.put(raw)
                target.put(b'')
            thread = threading.Thread(target=pump, daemon=True)
            self.threads.append(thread)
            thread.start()
        try:
            assert json.loads(self.err.get(timeout=60))['type'] == 'ready'
        except Exception:
            self.close(allow_nonzero=True)
            raise

    def call(self, request, error=False):
        raw = (json.dumps(request, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
        self.buffers['requests'].append(raw)
        self.process.stdin.write(raw)
        self.process.stdin.flush()
        raw = self.out.get(timeout=60)
        assert 0 < len(raw) <= self.budget
        value = json.loads(raw)
        assert (value.get('type') == 'error') == error, value
        if not error:
            assert value['id'] == request['id']
            if request.get('stats'):
                packet = json.loads(self.err.get(timeout=60))
                assert packet['type'] == 'stats' and packet['id'] == request['id']
                self.stats[request['id']] = packet['diagnostics']
        return value

    def close(self, allow_nonzero=False):
        self.process.stdin.close()
        try:
            self.process.wait(timeout=20)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()
            raise
        finally:
            for thread in self.threads:
                thread.join(timeout=5)
            for stream in (self.process.stdout, self.process.stderr):
                stream.close()
            for key, raw in self.buffers.items():
                (self.folder / (key + '.jsonl')).write_bytes(b''.join(raw))
        assert allow_nonzero or self.process.returncode == 0


def search(identity='follow', feedback=None, query='cache freshness'):
    return {'op': 'search', 'id': identity, 'query': query, 'stats': True,
            **({'feedback': feedback} if feedback else {})}


def fb(identity='r', accepted=None, rejected=None):
    return {'query_id': identity, 'accepted': [0] if accepted is None else accepted,
            'rejected': [] if rejected is None else rejected}


def read(identity='r', **extra):
    return {'op': 'read', 'id': identity, 'path': 'cache_a.rs', 'start': 1, 'lines': 3,
            'remember': True, **extra}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--binary', type=Path, required=True)
    p.add_argument('--control', type=Path)
    p.add_argument('--code-model', type=Path, required=True)
    p.add_argument('--documents-model', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--policies-only', action='store_true', help='Supplementary combined/context checks only')
    args = p.parse_args()
    assert not args.output.exists(), 'Use new output directory'
    args.output.mkdir(parents=True)
    record = {'status': 'running', 'binary_sha256': sha(args.binary.read_bytes()),
              'helper_sha256': sha(Path(__file__).read_bytes()), 'quality_benchmark': False, 'cases': []}
    env = dict(os.environ)
    env.pop('IXOS_MODEL_PATH', None)
    labels = ['read', 'grep', 'slice', 'rejected', 'lazy-reuse', 'unseen', 'silence', 'expired',
              'age-four', 'reset', 'stale', 'ignored', 'file-only', 'oversized-view', 'retention',
              'canonical', 'id-replace', 'tiny-budget', 'escaped-id', 'drift', 'off', 'related', 'lexical',
              'remember-false', 'invalid-flag', 'no-match', 'default', 'combined', 'context']
    if args.policies_only:
        labels = ['combined', 'context']
    for profile, model in [('code', args.code_model), ('documents', args.documents_model)]:
        for persist in (False, True):
            for label in labels:
                with tempfile.TemporaryDirectory(prefix='ixos-inspection-contract-') as folder:
                    base = Path(folder)
                    root = base / 'sources'
                    root.mkdir()
                    sources = {
                        'cache_a.rs': 'fn refresh_a() {}\nCache freshness checks source bytes and content hashes.\nCache validation rejects stale embeddings.\n',
                        'cache_b.rs': 'fn persist_b() {}\nCache entries store signed compressed embeddings.\n',
                        'cache_c.rs': 'fn search_c() {}\nCache navigation retrieves citations in scientific documents.\n',
                        '.gitignore': 'ignored.txt\n', 'ignored.txt': 'Cache freshness hidden witness',
                    }
                    if label in ('file-only', 'oversized-view'):
                        sources['long.rs'] = 'longWitness ' + 'word ' * 1900
                    for name, text in sources.items():
                        (root / name).write_bytes(text.encode())
                    before = state(root)
                    budget = 512 if label == 'tiny-budget' else 900 if label == 'file-only' else 16000 if label == 'oversized-view' else 6000
                    policy = label if label in ('off', 'related', 'combined', 'context') else 'feedback'
                    config = base / 'config.toml'
                    config.write_text(f'[retrieval]\nlimit=5\ncontext=2\noutput_bytes={budget}\nsession="{policy}"\npersist={str(persist).lower()}\n', encoding='utf-8')
                    argv = [str(args.binary.resolve()), '--config', str(config), 'serve', '--dir', str(root),
                            '--profile', profile, '--model-path', str(model.resolve()), '--quiet-stats']
                    if not persist:
                        argv.append('--jit')
                    if label == 'lexical':
                        argv += ['--retrieval', 'lexical']
                    out = args.output / profile / ('native' if persist else 'jit') / label
                    s = Session(argv, env, out, budget)
                    control_match = None
                    try:
                        if label == 'default':
                            requests = [search('seed'), {k: v for k, v in read().items() if k != 'remember'},
                                        {'op': 'grep', 'id': 'g', 'pattern': 'Cache', 'stats': True}, search()]
                            values = [s.call(r) for r in requests]
                            assert all('remembered' not in value for value in values)
                            assert 'inspection' not in s.stats['follow']
                            if args.control:
                                wire = b''.join(s.buffers['requests'])
                                old = subprocess.run([str(args.control.resolve()), *argv[1:]], input=wire,
                                                     capture_output=True, env=env, timeout=60)
                                (out / 'control.stdout').write_bytes(old.stdout)
                                (out / 'control.stderr').write_bytes(old.stderr)
                                assert old.returncode == 0 and old.stdout == b''.join(s.buffers['stdout'])
                                control_match = True
                        elif label in ('off', 'related', 'lexical', 'tiny-budget', 'ignored', 'invalid-flag'):
                            request = read(path='ignored.txt') if label == 'ignored' else read(remember='yes') if label == 'invalid-flag' else read()
                            s.call(request, error=True)
                            s.call(search(feedback=fb()))
                            assert not s.stats['follow']['feedbackConsumed']
                        elif label in ('remember-false', 'no-match'):
                            if label == 'remember-false':
                                value = s.call(read(remember=False))
                                assert 'remembered' not in value
                            else:
                                value = s.call({'op': 'grep', 'id': 'r', 'pattern': 'absentWitness', 'remember': True})
                                assert value['remembered'] == [] and value['results'] == []
                            s.call(search(feedback=fb()))
                            assert not s.stats['follow']['feedbackConsumed']
                        elif label == 'canonical':
                            outputs = []
                            for index, accepted in enumerate(([0, 1, 2], [2, 0, 1, 0], [1, 2, 'cache_a.rs', 0])):
                                s.call({'op': 'reset', 'id': 'reset' + str(index)})
                                value = s.call({'op': 'grep', 'id': 'g', 'pattern': 'Cache', 'remember': True, 'stats': True})
                                assert value['remembered'][:3] == [0, 1, 2]
                                outputs.append(s.call(search(feedback=fb('g', accepted))))
                                assert s.stats['follow']['inspection']['feedbackViews'] == 3
                            assert outputs[0] == outputs[1] == outputs[2]
                        elif label == 'file-only':
                            value = s.call({'op': 'grep', 'id': 'r', 'pattern': 'longWitness', 'remember': True})
                            assert value['results'][0]['evidence_omitted'] and value['remembered'] == []
                            s.call(search(feedback=fb()))
                            assert not s.stats['follow']['feedbackConsumed']
                        elif label == 'oversized-view':
                            value = s.call(read(path='long.rs', lines=1))
                            assert len(value['view']['text'].encode()) > 8192 and value['remembered'] == []
                            s.call(search(feedback=fb()))
                            assert not s.stats['follow']['feedbackConsumed']
                        elif label == 'retention':
                            for index in range(20):
                                s.call(read('r' + str(index)))
                            s.call(search('old', fb('r0')))
                            assert not s.stats['old']['feedbackConsumed']
                            assert s.stats['old']['inspection']['responses'] == 16
                            s.call(search('new', fb('r19')))
                            assert s.stats['new']['feedbackConsumed']
                        else:
                            if label in ('silence', 'drift', 'combined', 'context'):
                                seed = s.call(search('seed'))
                            identity = '\0' * 256 if label == 'escaped-id' else 'r'
                            if label == 'grep':
                                value = s.call({'op': 'grep', 'id': identity, 'pattern': 'Cache', 'remember': True, 'stats': True})
                            elif label == 'unseen':
                                value = s.call({k: v for k, v in read(identity).items() if k != 'remember'})
                            else:
                                value = s.call(read(identity, **({'characters': 20, 'character_offset': 1} if label == 'slice' else {})))
                            if label != 'unseen':
                                assert value['remembered'] and value['remembered'][0] == 0
                            if label in ('expired', 'age-four'):
                                for index in range(5 if label == 'expired' else 4):
                                    s.call(search('age' + str(index)))
                            if label == 'reset':
                                s.call({'op': 'reset', 'id': 'reset'})
                            if label == 'stale':
                                (root / 'cache_a.rs').write_bytes(sources['cache_a.rs'].replace('refresh_a', 'refresh_z').encode())
                                before = state(root)  # explicit equal-length authored edit, not a CLI mutation
                            if label == 'id-replace':
                                s.call(search(identity))
                            if label == 'drift':
                                query = 'astronomical nebula telescope galaxy orbit'
                            else:
                                query = 'cache freshness'
                            selection = fb(identity, [], [0]) if label == 'rejected' else fb(identity, [0, 9999, 'unseen.rs'])
                            if label == 'silence':
                                selection = None
                            answer = s.call(search(feedback=selection, query=query))
                            expected = label not in ('unseen', 'silence', 'expired', 'reset', 'stale', 'drift')
                            assert s.stats['follow']['feedbackConsumed'] == expected, (label, s.stats['follow'])
                            if label == 'drift':
                                assert s.stats['follow']['driftReset']
                            if label == 'silence':
                                assert answer['results'] == seed['results']
                                assert s.stats['follow']['inspection']['viewsEmbedded'] == 0
                            if label in ('read', 'slice', 'grep', 'rejected', 'lazy-reuse', 'age-four', 'escaped-id', 'combined', 'context'):
                                stats = s.stats['follow']['inspection']
                                assert stats['feedbackViews'] == stats['viewsEmbedded'] == 1
                                assert stats['storedTextBytes'] <= 16 * 8192
                            if label == 'lazy-reuse':
                                second = s.call(search('again', selection))
                                assert second['results'] == answer['results']
                                assert s.stats['again']['inspection']['viewsEmbedded'] == 0
                        assert state(root) == before, label
                    finally:
                        s.close()
                    record['cases'].append({'profile': profile, 'persist': persist, 'case': label,
                        'model': artifact_identity(model), 'argv': argv, 'budget': budget,
                        'stats': s.stats, 'source_preserved': True, 'control_stdout_equal': control_match,
                        'stdout_sha256': sha(b''.join(s.buffers['stdout'])),
                        'request_count': len(s.buffers['requests'])})
                    (args.output / 'receipt.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
    record['status'] = 'passed'
    (args.output / 'receipt.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'passed', 'actual_model_sequences': len(record['cases']),
                      'source_preserved': True, 'quality_benchmark': False}))


if __name__ == '__main__':
    main()
