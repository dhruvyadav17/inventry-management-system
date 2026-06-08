param(
    [string] $ApiUrl = "https://example.com/api/v1",
    [string] $BasePath = "/",
    [string] $FrontendOutDir = "../production-build/frontend",
    [switch] $WithLaravelOptimize
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend-laravel"
$frontend = Join-Path $root "frontend-react"

$previousApiUrl = $env:VITE_API_URL
$previousBasePath = $env:VITE_PUBLIC_BASE_PATH
$previousOutDir = $env:VITE_BUILD_OUT_DIR
$previousSourcemap = $env:VITE_BUILD_SOURCEMAP

try {
    $env:VITE_API_URL = $ApiUrl
    $env:VITE_PUBLIC_BASE_PATH = $BasePath
    $env:VITE_BUILD_OUT_DIR = $FrontendOutDir
    $env:VITE_BUILD_SOURCEMAP = "false"

    Push-Location $frontend
    npm run build
    Pop-Location

    if ($WithLaravelOptimize) {
        Push-Location $backend
        php artisan optimize:clear
        php artisan config:cache
        php artisan route:cache
        php artisan view:cache
        Pop-Location
    }

    Write-Host "Frontend production build created at $FrontendOutDir"
} finally {
    if ((Get-Location).Path -eq $frontend -or (Get-Location).Path -eq $backend) {
        Pop-Location
    }

    if ($null -eq $previousApiUrl) { Remove-Item Env:\VITE_API_URL -ErrorAction SilentlyContinue } else { $env:VITE_API_URL = $previousApiUrl }
    if ($null -eq $previousBasePath) { Remove-Item Env:\VITE_PUBLIC_BASE_PATH -ErrorAction SilentlyContinue } else { $env:VITE_PUBLIC_BASE_PATH = $previousBasePath }
    if ($null -eq $previousOutDir) { Remove-Item Env:\VITE_BUILD_OUT_DIR -ErrorAction SilentlyContinue } else { $env:VITE_BUILD_OUT_DIR = $previousOutDir }
    if ($null -eq $previousSourcemap) { Remove-Item Env:\VITE_BUILD_SOURCEMAP -ErrorAction SilentlyContinue } else { $env:VITE_BUILD_SOURCEMAP = $previousSourcemap }
}
