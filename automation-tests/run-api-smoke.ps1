param(
    [string] $HostName = "127.0.0.1",
    [int] $Port = 8000,
    [string] $ApiBaseUrl = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend-laravel"
$script = Join-Path $PSScriptRoot "api-smoke.mjs"
$baseUrl = if ($ApiBaseUrl) { $ApiBaseUrl } else { "http://${HostName}:${Port}/api/v1" }

Write-Host "Starting Laravel API at $baseUrl"
$server = Start-Process -FilePath php `
    -ArgumentList @("artisan", "serve", "--host=$HostName", "--port=$Port") `
    -WorkingDirectory $backend `
    -WindowStyle Hidden `
    -PassThru

try {
    Start-Sleep -Seconds 4
    $env:API_BASE_URL = $baseUrl
    node $script
} finally {
    if ($server -and -not $server.HasExited) {
        Stop-Process -Id $server.Id -Force
    }
}
