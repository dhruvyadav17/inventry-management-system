@echo off
setlocal

set "ROOT=%~dp0.."
cd /d "%ROOT%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\automation-tests\run-ui-visible.ps1"

if errorlevel 1 (
    echo.
    echo Visible UI smoke found issues. Check the suggestions above.
    exit /b 1
)

echo.
echo Visible UI smoke completed successfully.
