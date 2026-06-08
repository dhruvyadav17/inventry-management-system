@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-production.ps1" %*
