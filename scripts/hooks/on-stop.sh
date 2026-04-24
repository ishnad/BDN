#!/usr/bin/env bash
# Stop hook — prints a brief session summary when Claude finishes.
LOG_FILE=".claude/logs/tool-calls.jsonl"

if [[ -f "$LOG_FILE" ]]; then
  COUNT=$(wc -l < "$LOG_FILE" | tr -d ' ')
  echo "Claude session ended. Tools invoked this session: $COUNT"
else
  echo "Claude session ended."
fi

exit 0
