@echo off
setlocal

set "ROOT=%~dp0.."
cd /d "%ROOT%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\automation-tests\run-api-smoke.ps1"

if errorlevel 1 (
    echo.
    echo API smoke failed. Check the error above.
    exit /b 1
)

echo.
echo API smoke completed successfully.
