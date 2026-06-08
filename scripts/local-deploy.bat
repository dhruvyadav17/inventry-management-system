@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0.."

if not exist "backend-laravel\.env" (
  copy "backend-laravel\.env.example" "backend-laravel\.env" >nul
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\write-local-docker-env.ps1"
)

set VITE_API_URL=http://localhost/api/v1
set VITE_PUBLIC_BASE_PATH=/

docker compose down
docker compose build backend
docker compose --profile build run --rm frontend-build
docker compose up -d mysql backend nginx
docker compose exec backend composer install
docker compose exec backend php artisan key:generate --force
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan storage:link
docker compose exec backend php artisan optimize:clear

echo.
echo Local Docker deployment completed: http://localhost
docker compose ps
