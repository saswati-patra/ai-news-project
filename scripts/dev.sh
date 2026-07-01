#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
BACKEND_PID=""
FRONTEND_PID=""
POSTGRES_STARTED=false

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

stop_process() {
  local pid=$1
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  stop_process "$BACKEND_PID"
  stop_process "$FRONTEND_PID"
  if [[ "$POSTGRES_STARTED" == true ]]; then
    docker compose -f "$COMPOSE_FILE" stop postgres >/dev/null || true
  fi
  exit "$status"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

require_command docker
require_command uv
require_command npm

docker compose -f "$COMPOSE_FILE" up -d postgres
POSTGRES_STARTED=true

postgres_ready=false
for _ in {1..30}; do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_isready -U postgres -d newsdb >/dev/null 2>&1; then
    postgres_ready=true
    break
  fi
  sleep 1
done

if [[ "$postgres_ready" != true ]]; then
  printf 'PostgreSQL did not become ready within 30 seconds.\n' >&2
  exit 1
fi

printf 'Backend: http://127.0.0.1:8000\n'
printf 'Frontend: http://127.0.0.1:5173\n'
printf 'Press Ctrl+C to stop all services.\n'

(cd "$ROOT_DIR/backend" && exec uv run uvicorn ai_news_project.main:app --reload --app-dir src) &
BACKEND_PID=$!
(cd "$ROOT_DIR/frontend" && exec npm run dev) &
FRONTEND_PID=$!

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 1
done

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  set +e
  wait "$BACKEND_PID"
  status=$?
  set -e
else
  set +e
  wait "$FRONTEND_PID"
  status=$?
  set -e
fi

if [[ $status -eq 0 ]]; then
  status=1
fi

exit "$status"
