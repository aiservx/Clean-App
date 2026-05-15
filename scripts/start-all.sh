#!/usr/bin/env bash
# Start all three services: API server, Admin dashboard, and Mobile app
set -u

# Kill stale processes on our ports (best-effort)
for port in 5000 8080 18115; do
  fuser -k "$port/tcp" 2>/dev/null || true
done
sleep 1

# Use CI=1 so Expo never prompts (Y/n) about port reuse — it will pick a free port silently
export CI=1

echo "[start-all] Starting API server on port 8080..."
PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!

echo "[start-all] Starting Admin dashboard on port 5000..."
PORT=5000 BASE_PATH=/admin/ pnpm --filter @workspace/admin run dev &
ADMIN_PID=$!

echo "[start-all] Starting Mobile app (Expo) on port 18115..."
PORT=18115 BASE_PATH=/ pnpm --filter @workspace/mobile run dev < /dev/null &
EXPO_PID=$!

echo "[start-all] All services starting (api=$API_PID admin=$ADMIN_PID expo=$EXPO_PID). Press Ctrl+C to stop."

# If any child exits, terminate the rest
trap "kill $API_PID $ADMIN_PID $EXPO_PID 2>/dev/null" EXIT INT TERM
wait -n
