#!/bin/bash
# Ensure dev server is running on port 3000.
# Starts one if needed, reuses existing if functional.
# Usage: ./dev.sh

cd "$(dirname "$0")"

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Dev server already running on port 3000"
    exit 0
fi

# Kill stale (non-functional) process on port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "Killing stale process on port 3000..."
    kill $(lsof -ti:3000) 2>/dev/null || true
    sleep 1
fi

echo "Starting dev server..."
nohup npm run dev > /dev/null 2>&1 &
DEV_PID=$!

for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "Dev server ready (PID: $DEV_PID)"
        exit 0
    fi
    sleep 1
done

echo "ERROR: Dev server failed to start"
exit 1
