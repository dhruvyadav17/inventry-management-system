#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/inventry-management-system}"
API_URL="${API_URL:-http://43.204.141.93/api/v1}"
FRONTEND_BASE_PATH="${FRONTEND_BASE_PATH:-/}"
HEALTH_URL="${HEALTH_URL:-${API_URL%/v1}/health}"

cd "$ROOT"

if [ -f "$ROOT/backend-laravel/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$ROOT/backend-laravel/.env"
    set +a
fi

export MYSQL_DATABASE="${MYSQL_DATABASE:-${DB_DATABASE:-inventry_management_system}}"
export MYSQL_USER="${MYSQL_USER:-${DB_USERNAME:-inventory_user}}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-${DB_PASSWORD:-inventory_password}}"
export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-${DB_PASSWORD:-root_password}}"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building frontend assets"
rm -rf "$ROOT/production-build/frontend"
mkdir -p "$ROOT/production-build/frontend"
docker compose -f docker-compose.prod.yml build \
  --build-arg VITE_API_URL="$API_URL" \
  --build-arg VITE_PUBLIC_BASE_PATH="$FRONTEND_BASE_PATH" \
  frontend
container_id="$(docker create "$(docker compose -f docker-compose.prod.yml images -q frontend)")"
docker cp "$container_id:/usr/share/nginx/html/." "$ROOT/production-build/frontend"
docker rm "$container_id" >/dev/null

echo "==> Building and starting backend stack"
docker compose -f docker-compose.prod.yml up -d --build mysql backend nginx

echo "==> Preparing Laravel"
docker compose -f docker-compose.prod.yml exec -T backend mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
docker compose -f docker-compose.prod.yml exec -T backend php artisan migrate --force
docker compose -f docker-compose.prod.yml exec -T backend php artisan storage:link || true
docker compose -f docker-compose.prod.yml exec -T backend php artisan optimize:clear
docker compose -f docker-compose.prod.yml exec -T backend php artisan config:cache
docker compose -f docker-compose.prod.yml exec -T backend php artisan route:cache
docker compose -f docker-compose.prod.yml exec -T backend php artisan view:cache
docker compose -f docker-compose.prod.yml exec -T backend php artisan queue:restart || true

echo "==> Health check"
curl -fsS -H "Accept: application/json" "$HEALTH_URL"
echo
echo "Docker deploy completed."
