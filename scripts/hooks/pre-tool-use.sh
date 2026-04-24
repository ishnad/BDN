#!/usr/bin/env bash
# PreToolUse hook — logs every tool call and blocks known destructive patterns.
# Claude sends a JSON object on stdin: { tool_name, tool_input }
# Exit 0 = allow, exit 2 = block (Claude surfaces the reason to the user).
set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_name', ''))
" 2>/dev/null || echo "")

TOOL_INPUT=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(json.dumps(d.get('tool_input', {})))
" 2>/dev/null || echo "{}")

# Append to session log
LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)
echo "{\"ts\":\"$TS\",\"event\":\"pre\",\"tool\":\"$TOOL_NAME\",\"input\":$TOOL_INPUT}" \
  >> "$LOG_DIR/tool-calls.jsonl"

# Guard: block known destructive Bash patterns
if [[ "$TOOL_NAME" == "Bash" ]]; then
  CMD=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
print(d.get('command', ''))
" 2>/dev/null || echo "")

  if echo "$CMD" | grep -qE "(rm -rf /|DROP DATABASE|format [Cc]:)"; then
    echo '{"decision":"block","reason":"Potentially destructive command blocked by pre-tool-use hook. Review and run manually if intentional."}'
    exit 2
  fi
fi

exit 0
