#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/inventry-management-system}"
API_URL="${API_URL:-http://43.204.141.93/api/v1}"

cd "$ROOT"

echo "==> Git"
git --no-pager log -1 --oneline

echo "==> Containers"
docker compose -f docker-compose.prod.yml ps

echo "==> Laravel env"
docker compose -f docker-compose.prod.yml exec -T backend php artisan about --only=environment || true

echo "==> Migrations"
docker compose -f docker-compose.prod.yml exec -T backend php artisan migrate:status || true

echo "==> Health"
curl -i -H "Accept: application/json" "${API_URL%/v1}/health" || true

echo "==> Backend logs"
docker compose -f docker-compose.prod.yml logs --tail=120 backend

echo "==> Nginx logs"
docker compose -f docker-compose.prod.yml logs --tail=80 nginx
