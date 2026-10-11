set -euo pipefail
source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
unset PYTHONPATH IXOS_MODEL_PATH || true
python3 /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate15/readonly_probe.py
cp -r "$IXOS_REVIEW_ROOT/receipts-gate15-readonly" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate15/readonly
