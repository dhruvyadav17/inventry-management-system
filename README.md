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

## Verification

```bash
cd backend-laravel && php artisan test
cd frontend-react && npm run build
```
