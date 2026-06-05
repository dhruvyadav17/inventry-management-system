@echo off
setlocal

set "ROOT=%~dp0.."
cd /d "%ROOT%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$backend = Start-Process -FilePath php -ArgumentList @('artisan','serve','--host=127.0.0.1','--port=8000') -WorkingDirectory '%ROOT%\backend-laravel' -WindowStyle Hidden -PassThru; try { Start-Sleep -Seconds 4; node '%ROOT%\automation-tests\api-validation-security-performance.mjs'; exit $LASTEXITCODE } finally { if ($backend -and -not $backend.HasExited) { Stop-Process -Id $backend.Id -Force } }"

if errorlevel 1 (
    echo.
    echo API validation/security/performance audit found issues. Check suggestions above.
    exit /b 1
)

echo.
echo API validation/security/performance audit completed successfully.
