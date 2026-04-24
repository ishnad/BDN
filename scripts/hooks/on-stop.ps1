# Stop hook (Windows/PowerShell)
# Prints a brief session summary when Claude finishes.
$logFile = ".claude/logs/tool-calls.jsonl"

if (Test-Path $logFile) {
    $count = (Get-Content $logFile | Measure-Object -Line).Lines
    Write-Host "Claude session ended. Tools invoked this session: $count"
} else {
    Write-Host "Claude session ended."
}

exit 0
