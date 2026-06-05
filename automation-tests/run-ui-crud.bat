@echo off
setlocal

set "ROOT=%~dp0.."
cd /d "%ROOT%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\automation-tests\run-ui-crud.ps1"

if errorlevel 1 (
    echo.
    echo Visible UI CRUD scenarios found issues. Check the suggestions above.
    exit /b 1
)

echo.
echo Visible UI CRUD scenarios completed successfully.
