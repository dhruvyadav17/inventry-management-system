param(
    [string] $HostName = "127.0.0.1",
    [int] $BackendPort = 8000,
    [int] $FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend-laravel"
$frontend = Join-Path $root "frontend-react"
$script = Join-Path $PSScriptRoot "ui-crud-scenarios.mjs"

function Stop-ProcessTree {
    param([int] $ProcessId)

    $children = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId }
    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId $child.ProcessId
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "Starting backend on http://${HostName}:${BackendPort}"
$backendProcess = Start-Process -FilePath php `
    -ArgumentList @("artisan", "serve", "--host=$HostName", "--port=$BackendPort") `
    -WorkingDirectory $backend `
    -WindowStyle Hidden `
    -PassThru

Write-Host "Starting frontend on http://${HostName}:${FrontendPort}"
$frontendProcess = Start-Process -FilePath npm.cmd `
    -ArgumentList @("run", "dev", "--", "--host", $HostName, "--port", "$FrontendPort") `
    -WorkingDirectory $frontend `
    -WindowStyle Hidden `
    -PassThru

try {
    Start-Sleep -Seconds 6
    $env:UI_SERVERS_ALREADY_RUNNING = "1"
    $env:CDP_PORT = Get-Random -Minimum 9300 -Maximum 9999
    node $script
    $exitCode = $LASTEXITCODE
} finally {
    Remove-Item Env:\UI_SERVERS_ALREADY_RUNNING -ErrorAction SilentlyContinue
    Remove-Item Env:\CDP_PORT -ErrorAction SilentlyContinue

    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-ProcessTree -ProcessId $backendProcess.Id
    }

    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-ProcessTree -ProcessId $frontendProcess.Id
    }
}

exit $exitCode
