# PostToolUse hook (Windows/PowerShell)
# Logs tool completion.
$inputData = $input | Out-String

$logDir = ".claude/logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

try {
    $data = $inputData | ConvertFrom-Json
    $toolName = $data.tool_name
    $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $entry = "{`"ts`":`"$ts`",`"event`":`"post`",`"tool`":`"$toolName`"}"
    Add-Content -Path "$logDir/tool-calls.jsonl" -Value $entry -Encoding UTF8
} catch {}

exit 0
