#!/bin/sh
# Follow up when source moved after the last green suite.
input=$(cat)
stamp=".cursor/tdd-green"
if [ ! -f "$stamp" ]; then
  printf '%s\n' '{"followup_message":"No green test stamp yet. Run scripts/test-green.sh and keep the result."}'
  exit 0
fi
newer=$(find src tests scripts -type f \( -name '*.py' -o -name '*.ts' -o -name '*.svelte' \) -newer "$stamp" 2>/dev/null | head -1)
if [ -n "$newer" ]; then
  printf '%s\n' '{"followup_message":"Source changed after the last green suite. Run scripts/test-green.sh and fix the red test."}'
  exit 0
fi
printf '%s\n' '{}'
exit 0
