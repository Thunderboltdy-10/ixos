source /home/thunderboltdy/.cache/ixos-review-298088f-20261011/environment.sh
export TMPDIR="$IXOS_REVIEW_ROOT/probes"
unset PYTHONPATH IXOS_MODEL_PATH || true
python3 /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate14/trace.py > "$IXOS_REVIEW_ROOT/gate14-trace.stdout" 2> "$IXOS_REVIEW_ROOT/gate14-trace.stderr"
task_status=$?
cp "$IXOS_REVIEW_ROOT/gate14-trace.stdout" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate14/trace.stdout
cp "$IXOS_REVIEW_ROOT/gate14-trace.stderr" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate14/trace.stderr
cp -r "$IXOS_REVIEW_ROOT/receipts-gate14-trace" /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate14/trace
exit "$task_status"