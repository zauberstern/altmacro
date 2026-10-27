#!/bin/sh
# Stamp a green suite. The stop hook only nags when source is newer than this file.
stamp=".cursor/tdd-green"
mkdir -p .cursor
if [ -f package.json ]; then
  npm test
  code=$?
  if [ "$code" -eq 0 ]; then
    date -u +%Y-%m-%dT%H:%M:%SZ > "$stamp"
  fi
  exit "$code"
fi
if [ -d tests ]; then
  python3 -m pytest -q
  code=$?
  if [ "$code" -eq 0 ]; then
    date -u +%Y-%m-%dT%H:%M:%SZ > "$stamp"
  fi
  exit "$code"
fi
exit 0
