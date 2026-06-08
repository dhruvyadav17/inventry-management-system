# Inventory Management Separated Admin Panel

Laravel 12 API backend and React TypeScript AdminLTE frontend.

## Structure

- `backend-laravel` - Laravel 12 REST API with Sanctum, Spatie Permission, activity logs, migrations, factories, and seeders.
- `frontend-react` - React 19 + TypeScript + Vite AdminLTE admin panel.

## Backend Setup

```bash
cd backend-laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Default seeded admin:

- Email: `admin@example.com`
- Password: `password`

For MySQL, set `DB_CONNECTION=mysql`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `backend-laravel/.env`.

## Frontend Setup

```bash
cd frontend-react
npm install
npm run dev
```

Set API URL when needed:

```bash
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

## Production Build

Frontend production assets are generated outside the source app in `production-build/frontend`.

```powershell
.\build-production.bat -ApiUrl "https://your-domain.com/api/v1"
```

Optional when the backend `.env` is already set for production:

```powershell
.\build-production.bat -ApiUrl "https://your-domain.com/api/v1" -BasePath "/" -WithLaravelOptimize
```

Useful production env values:

```bash
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
API_RATE_LIMIT_PER_MINUTE=60
SANCTUM_STATEFUL_API=false
CORS_ALLOWED_ORIGINS=https://your-domain.com
CORS_SUPPORTS_CREDENTIALS=false
VITE_API_URL=https://your-domain.com/api/v1
VITE_PUBLIC_BASE_PATH=/
VITE_BUILD_OUT_DIR=../production-build/frontend
```

Deploy `backend-laravel` as the API app and point the web server/static host to `production-build/frontend` for the React app.

For AWS or any separate frontend/API domain, keep `SANCTUM_STATEFUL_API=false` because this frontend uses bearer tokens in the `Authorization` header. If you later switch to Sanctum cookie authentication, then set the stateful domains/session/CORS credential values together.

### AWS Ubuntu Deploy

On the EC2 server:

```bash
cd /var/www/inventry-management-system
API_URL="http://43.204.141.93/api/v1" bash deployment/aws-deploy.sh
```

If your PHP-FPM service name is different:

```bash
PHP_FPM_SERVICE="php8.2-fpm" API_URL="http://43.204.141.93/api/v1" bash deployment/aws-deploy.sh
```

If a production API route returns `500`, run:

```bash
cd /var/www/inventry-management-system
TOKEN="1|your-token" API_URL="http://43.204.141.93/api/v1" bash deployment/aws-diagnose.sh
```

This checks the latest git commit, migration status, required RBAC/cache tables, `/options/rbac`, and the last Laravel log lines.

## Verification

```bash
cd backend-laravel && php artisan test
cd frontend-react && npm run build
```

## Docker Automation

This repo includes automated local Docker, AWS Docker deployment, and GitHub Actions CI/CD files.

### Local Docker Deploy

Start Docker Desktop first, then run:

```powershell
scripts\local-deploy.bat
```

The script builds the frontend, starts MySQL/PHP-FPM/Nginx, runs `migrate:fresh --seed`, links storage, and serves the app at:

```text
http://localhost
```

Useful local checks:

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f nginx
```

### AWS Docker Deploy

On EC2, keep `backend-laravel/.env` production-ready with `DB_HOST=mysql`, then run:

```bash
cd /var/www/inventry-management-system
API_URL="http://43.204.141.93/api/v1" bash deployment/aws-docker-deploy.sh
```

Diagnostics:

```bash
cd /var/www/inventry-management-system
API_URL="http://43.204.141.93/api/v1" bash deployment/aws-docker-diagnose.sh
```

### GitHub Actions CI/CD

Add these repository secrets:

```text
EC2_HOST=43.204.141.93
EC2_USER=deploy
EC2_PROJECT_PATH=/var/www/inventry-management-system
EC2_SSH_KEY=private SSH key
VITE_API_URL=http://43.204.141.93/api/v1
```

After that, every push to `main` runs backend tests, frontend build, then deploys on EC2 through `deployment/aws-docker-deploy.sh`.
