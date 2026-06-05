@echo off
setlocal

set "ROOT=%~dp0.."
cd /d "%ROOT%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$backend = Start-Process -FilePath php -ArgumentList @('artisan','serve','--host=127.0.0.1','--port=8000') -WorkingDirectory '%ROOT%\backend-laravel' -WindowStyle Hidden -PassThru; try { Start-Sleep -Seconds 4; node '%ROOT%\automation-tests\api-full-scenarios.mjs'; exit $LASTEXITCODE } finally { if ($backend -and -not $backend.HasExited) { Stop-Process -Id $backend.Id -Force } }"

if errorlevel 1 (
    echo.
    echo Full API scenarios found issues. Check suggestions above.
    exit /b 1
)

echo.
echo Full API scenarios completed successfully.
