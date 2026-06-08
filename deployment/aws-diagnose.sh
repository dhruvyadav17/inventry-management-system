#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/inventry-management-system}"
API_URL="${API_URL:-http://43.204.141.93/api/v1}"
TOKEN="${TOKEN:-}"

cd "$ROOT/backend-laravel"

echo "==> Git version"
git -C "$ROOT" log -5 --oneline

echo
echo "==> Laravel environment"
php artisan about --only=environment || true

echo
echo "==> Migration status"
php artisan migrate:status || true

echo
echo "==> Required columns/tables"
php artisan tinker --execute="
foreach (['cache','roles','permissions','personal_access_tokens'] as \$table) {
    echo \$table.': '.(Schema::hasTable(\$table) ? 'yes' : 'no').PHP_EOL;
}
foreach ([['roles','status'], ['permissions','status']] as \$pair) {
    echo \$pair[0].'.'.\$pair[1].': '.(Schema::hasColumn(\$pair[0], \$pair[1]) ? 'yes' : 'no').PHP_EOL;
}
" || true

echo
echo "==> RBAC options through Laravel"
php artisan tinker --execute="
\$service = app(App\Services\Admin\AdminOptionService::class);
\$data = \$service->rbac();
echo 'roles='.count(\$data['roles']).' permissions='.count(\$data['permissions']).PHP_EOL;
" || true

echo
echo "==> HTTP check"
if [ -n "$TOKEN" ]; then
    curl -i -H "Accept: application/json" -H "Authorization: Bearer $TOKEN" "$API_URL/options/rbac" || true
else
    echo "Set TOKEN='1|...' to test authenticated /options/rbac."
fi

echo
echo "==> Latest Laravel log"
tail -n 120 storage/logs/laravel.log || true
