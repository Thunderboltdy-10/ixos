set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
python3 - <<'PY'
import hashlib,json,os,tempfile
from pathlib import Path
report={'purpose':'Authored metadata-capacity probe on same isolated ext4 filesystem, not search throughput','rows':[]}
with tempfile.TemporaryDirectory(prefix='ixos-capacity-') as directory:
    path=Path(directory)/'witness.txt'
    path.write_bytes(b'primary witness source\n')
    before=(hashlib.sha256(path.read_bytes()).hexdigest(),path.stat().st_mtime_ns)
    for size in (643,2375,4423):
        row={'requested_metadata_bytes':size}
        try:
            os.setxattr(path,'user.ixos_capacity_probe',b'0'*size)
            assert len(os.getxattr(path,'user.ixos_capacity_probe'))==size
            row['status']='stored'
        except OSError as error:
            row.update(status='failed',errno=error.errno,message=str(error))
        report['rows'].append(row)
    os.removexattr(path,'user.ixos_capacity_probe')
    assert before==(hashlib.sha256(path.read_bytes()).hexdigest(),path.stat().st_mtime_ns)
report['source_preserved']=True
print(json.dumps(report,indent=2))
PY
