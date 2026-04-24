# PreToolUse hook (Windows/PowerShell)
# Logs every tool call and blocks known destructive patterns.
$inputData = $input | Out-String

$logDir = ".claude/logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

try {
    $data = $inputData | ConvertFrom-Json
    $toolName = $data.tool_name
    $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $entry = "{`"ts`":`"$ts`",`"event`":`"pre`",`"tool`":`"$toolName`"}"
    Add-Content -Path "$logDir/tool-calls.jsonl" -Value $entry -Encoding UTF8

    # Guard: block known destructive Bash patterns
    if ($toolName -eq "Bash") {
        $cmd = $data.tool_input.command
        if ($cmd -match "rm -rf /|DROP DATABASE|format [Cc]:") {
            @{
                decision = "block"
                reason   = "Potentially destructive command blocked by pre-tool-use hook. Review and run manually if intentional."
            } | ConvertTo-Json -Compress
            exit 2
        }
    }
} catch {
    # Never block Claude due to hook parse errors
}

exit 0
