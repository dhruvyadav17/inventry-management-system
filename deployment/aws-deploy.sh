#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/inventry-management-system}"
API_URL="${API_URL:-http://43.204.141.93/api/v1}"
HEALTH_URL="${HEALTH_URL:-${API_URL%/v1}/health}"
FRONTEND_BASE_PATH="${FRONTEND_BASE_PATH:-/}"
PHP_FPM_SERVICE="${PHP_FPM_SERVICE:-php8.3-fpm}"
WEB_USER="${WEB_USER:-www-data}"

cd "$ROOT"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Installing backend dependencies"
cd "$ROOT/backend-laravel"
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction

echo "==> Preparing Laravel runtime folders"
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
if command -v sudo >/dev/null 2>&1; then
    sudo chown -R "$WEB_USER:$WEB_USER" storage bootstrap/cache || true
fi
chmod -R ug+rwX storage bootstrap/cache

echo "==> Running migrations"
php artisan migrate --force

echo "==> Clearing and rebuilding Laravel caches"
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> Building frontend"
cd "$ROOT/frontend-react"
rm -rf "$ROOT/production-build/frontend"
npm ci
VITE_API_URL="$API_URL" VITE_PUBLIC_BASE_PATH="$FRONTEND_BASE_PATH" npm run build

echo "==> Restarting PHP-FPM when available"
if command -v sudo >/dev/null 2>&1 && systemctl list-unit-files | grep -q "^${PHP_FPM_SERVICE}.service"; then
    sudo systemctl reload "$PHP_FPM_SERVICE" || sudo systemctl restart "$PHP_FPM_SERVICE"
fi

echo "==> Smoke check"
curl -fsS -H "Accept: application/json" "$HEALTH_URL" >/dev/null || true

echo "Deploy completed. If /options/rbac still returns 500, run:"
echo "  bash deployment/aws-diagnose.sh"
