#!/usr/bin/env bash
# Start all three services: API server, Admin dashboard, and Mobile app
set -u

# Kill stale processes
for port in 8080 18115 23744; do
  fuser -k "$port/tcp" 2>/dev/null || true
done

echo "[start-all] Starting API server on port 8080..."
PORT=8080 pnpm --filter @workspace/api-server run dev &

echo "[start-all] Starting Admin dashboard on port 23744..."
PORT=23744 BASE_PATH=/admin/ pnpm --filter @workspace/admin run dev &

echo "[start-all] Starting Mobile app (Expo) on port 18115..."
PORT=18115 BASE_PATH=/ pnpm --filter @workspace/mobile run dev &

echo "[start-all] All services starting. Press Ctrl+C to stop."
wait
