#!/bin/bash
# Ensure dev server is running.
# Starts one if needed, reuses existing if functional.
# Override port via PORT env var (default: 3000).
# Usage: ./dev.sh

cd "$(dirname "$0")"

# Load local overrides (e.g. PORT=3001)
[ -f .env.local ] && export $(grep -v '^#' .env.local | xargs)

DEV_PORT="${PORT:-3000}"

if curl -s http://localhost:$DEV_PORT > /dev/null 2>&1; then
    echo "Dev server already running on port $DEV_PORT"
    exit 0
fi

# Kill stale (non-functional) process on the port
if lsof -ti:$DEV_PORT > /dev/null 2>&1; then
    echo "Killing stale process on port $DEV_PORT..."
    kill $(lsof -ti:$DEV_PORT) 2>/dev/null || true
    sleep 1
fi

echo "Starting dev server on port $DEV_PORT..."
PORT=$DEV_PORT nohup npm run dev > /dev/null 2>&1 &
DEV_PID=$!

for i in {1..15}; do
    if curl -s http://localhost:$DEV_PORT > /dev/null 2>&1; then
        echo "Dev server ready (PID: $DEV_PID)"
        exit 0
    fi
    sleep 1
done

echo "ERROR: Dev server failed to start"
exit 1
