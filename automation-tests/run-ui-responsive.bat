@echo off
setlocal

set "ROOT=%~dp0.."
cd /d "%ROOT%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\automation-tests\run-ui-responsive.ps1"

if errorlevel 1 (
    echo.
    echo Responsive UI audit found issues. Check suggestions above.
    exit /b 1
)

echo.
echo Responsive UI audit completed successfully.
