#!/usr/bin/env bash
# Clean up temporary screenshots generated during art reviews and testing.
# Safe to run at any time — only removes files inside tests/screenshots/.

set -euo pipefail

DIR="tests/screenshots"

if [ ! -d "$DIR" ]; then
  echo "No screenshots directory found — nothing to clean."
  exit 0
fi

count=$(find "$DIR" -type f | wc -l)
if [ "$count" -eq 0 ]; then
  echo "No screenshots to clean."
  exit 0
fi

find "$DIR" -type f -delete
find "$DIR" -mindepth 1 -type d -empty -delete

echo "Cleaned $count screenshot(s) from $DIR/"
