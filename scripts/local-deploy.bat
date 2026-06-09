@echo off
setlocal

cd /d "%~dp0.."

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker CLI is not installed or is not available in PATH.
  echo Install Docker Desktop, restart Windows, and run this script again.
  exit /b 1
)

call :wait_for_docker
if errorlevel 1 exit /b 1

if not exist "backend-laravel\.env" (
  copy "backend-laravel\.env.example" "backend-laravel\.env" >nul
  if errorlevel 1 (
    echo ERROR: Could not create backend-laravel\.env.
    exit /b 1
  )
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\write-local-docker-env.ps1"
  if errorlevel 1 (
    echo ERROR: Could not configure backend-laravel\.env for Docker.
    exit /b 1
  )
)

set VITE_API_URL=http://localhost/api/v1
set VITE_PUBLIC_BASE_PATH=/

echo.
echo ^> docker compose down --volumes --remove-orphans
docker compose down --volumes --remove-orphans || goto :failed

echo.
echo ^> docker compose build backend
docker compose build backend || goto :failed

echo.
echo ^> docker compose --profile build run --rm frontend-build
docker compose --profile build run --rm frontend-build || goto :failed

echo.
echo ^> docker compose up -d mysql backend nginx
docker compose up -d mysql backend nginx || goto :failed

echo.
echo ^> docker compose exec -T backend composer install --no-interaction
docker compose exec -T backend composer install --no-interaction || goto :failed

echo.
echo ^> docker compose exec -T backend php artisan key:generate --force
docker compose exec -T backend php artisan key:generate --force || goto :failed

echo.
echo ^> docker compose exec -T backend php artisan migrate:fresh --seed
docker compose exec -T backend php artisan migrate:fresh --seed || goto :failed

docker compose exec -T backend php artisan storage:link >nul 2>&1

echo.
echo ^> docker compose exec -T backend php artisan optimize:clear
docker compose exec -T backend php artisan optimize:clear || goto :failed

call :wait_for_app
if errorlevel 1 exit /b 1

echo.
echo Local Docker deployment completed: http://localhost
docker compose ps
exit /b 0

:failed
echo.
echo ERROR: Local Docker deployment stopped because a command failed.
exit /b 1

:wait_for_docker
docker info >nul 2>&1
if not errorlevel 1 exit /b 0

set "DOCKER_DESKTOP=C:\Program Files\Docker\Docker\Docker Desktop.exe"
if not exist "%DOCKER_DESKTOP%" (
  echo ERROR: Docker Desktop is installed incorrectly or could not be found.
  echo Expected: %DOCKER_DESKTOP%
  exit /b 1
)

echo Docker engine is not running. Starting Docker Desktop...
start "" "%DOCKER_DESKTOP%"

for /L %%I in (1,1,90) do (
  docker info >nul 2>&1
  if not errorlevel 1 (
    echo Docker engine is ready.
    exit /b 0
  )
  timeout /t 2 /nobreak >nul
)

echo ERROR: Docker Desktop did not become ready within 3 minutes.
echo Open Docker Desktop, wait until Engine running appears, then run this script again.
exit /b 1

:wait_for_app
echo.
echo Waiting for frontend and API health checks...
for /L %%I in (1,1,30) do (
  curl.exe -fsS http://localhost/api/health >nul 2>&1
  if not errorlevel 1 (
    curl.exe -fsS http://localhost/favicon.svg -o NUL >nul 2>&1
    if not errorlevel 1 (
      echo Frontend and API are ready.
      exit /b 0
    )
  )
  timeout /t 2 /nobreak >nul
)

echo ERROR: Application health checks did not pass within 60 seconds.
docker compose ps
docker compose logs --tail=50 nginx backend
exit /b 1
