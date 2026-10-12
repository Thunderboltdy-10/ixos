"""Freeze submitted repairs and all actor failures before reference/test access."""
import hashlib
import json
from pathlib import Path
import sys

import tiktoken

base = Path(__file__).resolve().parent
root = base.parents[2]
sys.path.insert(0, str(root))
from scripts.qasper.cache_probe import state

sha = lambda raw: hashlib.sha256(raw).hexdigest()
load = lambda path: json.loads(path.read_text(encoding='utf-8'))
tokenizer = tiktoken.get_encoding('cl100k_base')
target = base / 'freeze.json'
assert not target.exists(), 'Do not replace frozen submissions'
selection = load(base / 'selection.json')
binding = load(base / 'actor-inputs.json')
preparation = load(base / 'preparation.json')
assert sha((base / 'selection.json').read_bytes()) == binding['selection_sha256']
assert sha((root / '.tmp/gate26/task-manifest.json').read_bytes()) == preparation['task_manifest_sha256']
sessions = []
for folder in ('S01', 'S01-recovery', 'S02', 'S03'):
    receipt_raw = (base / folder / 'receipt.json').read_bytes()
    receipt = json.loads(receipt_raw)
    assert receipt['source_preserved'] and not receipt['references_loaded_by_actor']
    assert state(Path(receipt['task']['root'])) == receipt['sources']
    wire_raw = (base / folder / 'wire.jsonl').read_bytes()
    wire = [json.loads(line) for line in wire_raw.decode('utf-8').splitlines()]
    counts = {key: 0 for key in ('stdin', 'stdout', 'stderr')}
    attempts = 0
    errors = 0
    for packet in wire:
        counts[packet['stream']] += len(tokenizer.encode(packet['raw'], disallowed_special=()))
        if packet['stream'] == 'stdin':
            attempts += 1
        elif packet['stream'] == 'stdout' and json.loads(packet['raw']).get('type') == 'error':
            errors += 1
    sessions.append({'folder': folder, 'case': receipt['task']['id'], 'status': receipt['status'],
                     'receipt_sha256': sha(receipt_raw), 'wire_sha256': sha(wire_raw),
                     'attempted_cli_requests': attempts, 'error_responses': errors,
                     'wire_tokens': counts, 'source_preserved': True})

cases = []
for case, folder in [('S01', 'S01-recovery'), ('S03', 'S03')]:
    receipt = load(base / folder / 'receipt.json')
    assert receipt['status'] == 'submitted' and receipt['submission']['status'] == 'answered'
    patch = receipt['submission']['repair_patch']
    assert isinstance(patch, str) and patch and len(patch.encode()) <= 65536
    if case == 'S03':
        amendment = load(base / 'S03-format-amendment.json')
        assert sha((base / folder / 'receipt.json').read_bytes()) == amendment['original_receipt_sha256']
        assert sha(patch.encode()) == amendment['original_patch_sha256']
        assert amendment['before_reference_or_test_access'] and amendment['semantic_edits_unchanged']
        patch = amendment['repair_patch']
        assert sha(patch.encode()) == amendment['repair_patch_sha256']
    cases.append({'case': case, 'folder': folder, 'instance_id': receipt['task']['instance_id'],
                  'patch_sha256': sha(patch.encode()), 'repair_patch': patch,
                  'submitted_status': receipt['submission']['status'],
                  'source_commit': receipt['task']['source_commit']})
blank = load(base / 'S02/receipt.json')
assert blank['task']['problem_statement'] == '' and blank['status'] == 'incomplete'
result = {'protocol_sha256': sha((base / 'protocol.json').read_bytes()),
          'selection_sha256': sha((base / 'selection.json').read_bytes()),
          'preparation_sha256': sha((base / 'preparation.json').read_bytes()),
          'amendment_sha256': sha((base / 'S03-format-amendment.json').read_bytes()),
          'sessions': sessions, 'cases': cases,
          'unusable_cases': [{'case': 'S02', 'reason': 'Empty issue text in hash-first selected training row; CLI correctly rejects empty query. Retain the failed actor session; no resolution score for a task with no supplied retrieval prompt.'}],
          'reference_fields_loaded': False, 'validation_problem_reference_fields_loaded': False,
          'boundary': 'Two valid synthetic task repairs, one unusable input and one caller-flag failure/recovery. All failed requests/repeated startup/query wire costs counted. No independent agent A/B or human benchmark claim.'}
target.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'frozen_valid_repairs': len(cases), 'unusable_cases': 1,
                  'attempts': sum(row['attempted_cli_requests'] for row in sessions),
                  'errors': sum(row['error_responses'] for row in sessions),
                  'wire_tokens': {kind: sum(row['wire_tokens'][kind] for row in sessions) for kind in ('stdin','stdout','stderr')},
                  'reference_fields_loaded': False}))
