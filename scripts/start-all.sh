#!/usr/bin/env bash
# One-command launcher: starts the mobile app + admin dashboard + API server.
# Used by the "Start application" workflow and runnable manually from shell.
set -u

cd "$(dirname "$0")/.."

# Free up any port that might still be held by an old process
free_port() {
  local p="$1"
  local pids
  pids="$(ss -lntp 2>/dev/null | awk -v p=":$p" '$4 ~ p {print $0}' | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)"
  if [[ -n "${pids}" ]]; then
    echo "[start-all] killing previous processes on port $p: $pids"
    kill -9 $pids 2>/dev/null || true
  fi
}

free_port 8080
free_port 18115
free_port 23744

# Start API server in background
PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Start admin web in background
PORT=23744 pnpm --filter @workspace/admin run dev &
ADMIN_PID=$!

# Trap to clean up on exit
trap 'echo "[start-all] shutting down..."; kill -TERM "$API_PID" "$ADMIN_PID" 2>/dev/null || true; wait 2>/dev/null || true' EXIT INT TERM

# Mobile app stays in the foreground so the workflow keeps the log tail
exec pnpm --filter @workspace/mobile run dev
