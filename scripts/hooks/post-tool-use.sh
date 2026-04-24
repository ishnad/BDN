#!/usr/bin/env bash
# PostToolUse hook — logs tool completion.
# Claude sends: { tool_name, tool_input, tool_response }
set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_name', ''))
" 2>/dev/null || echo "")

LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)
echo "{\"ts\":\"$TS\",\"event\":\"post\",\"tool\":\"$TOOL_NAME\"}" \
  >> "$LOG_DIR/tool-calls.jsonl"

exit 0
