#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TEST_DIR=$(mktemp -d)
DEV_PID=""

cleanup() {
  if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill -TERM "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

export CALL_LOG="$TEST_DIR/calls.log"
touch "$CALL_LOG"
mkdir -p "$TEST_DIR/bin"

cat >"$TEST_DIR/bin/docker" <<'EOF'
#!/usr/bin/env bash
printf 'docker %s\n' "$*" >>"$CALL_LOG"
exit 0
EOF

cat >"$TEST_DIR/bin/uv" <<'EOF'
#!/usr/bin/env bash
printf 'uv %s\n' "$*" >>"$CALL_LOG"
while true; do sleep 1; done
EOF

cat >"$TEST_DIR/bin/npm" <<'EOF'
#!/usr/bin/env bash
printf 'npm %s\n' "$*" >>"$CALL_LOG"
while true; do sleep 1; done
EOF
chmod +x "$TEST_DIR/bin/docker" "$TEST_DIR/bin/uv" "$TEST_DIR/bin/npm"

cat >"$TEST_DIR/launch.py" <<'EOF'
import os
import signal
import sys

signal.signal(signal.SIGINT, signal.SIG_DFL)
os.execv(sys.argv[1], sys.argv[1:])
EOF

PATH="$TEST_DIR/bin:$PATH" python3 "$TEST_DIR/launch.py" \
  "$ROOT_DIR/scripts/dev.sh" >"$TEST_DIR/output.log" 2>&1 &
DEV_PID=$!

for _ in {1..50}; do
  if grep -q '^npm run dev$' "$CALL_LOG"; then
    break
  fi
  sleep 0.1
done

grep -q 'up -d postgres$' "$CALL_LOG"
grep -q '^uv run uvicorn ai_news_project.main:app --reload --app-dir src$' "$CALL_LOG"
grep -q '^npm run dev$' "$CALL_LOG"

kill -INT "$DEV_PID"
set +e
wait "$DEV_PID"
status=$?
set -e
DEV_PID=""

[[ $status -eq 130 ]]
grep -q 'stop postgres$' "$CALL_LOG"
printf 'dev lifecycle test passed\n'
