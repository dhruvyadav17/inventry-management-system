# Automation Testing

This folder contains black-box tests that run against a real API server. Use them after `php artisan migrate:fresh --seed` to verify the application from outside Laravel's in-process test runner.

## Run Backend Contract Tests

```powershell
cd C:\xampp\htdocs\project\inventry-management-system\backend-laravel
php artisan test
```

## Run External API Smoke Test

Start the backend API:

```powershell
cd C:\xampp\htdocs\project\inventry-management-system\backend-laravel
php artisan serve --host=127.0.0.1 --port=8000
```

In another terminal, run:

```powershell
cd C:\xampp\htdocs\project\inventry-management-system
node .\automation-tests\api-smoke.mjs
```

Or run the helper that starts and stops the backend automatically:

```powershell
cd C:\xampp\htdocs\project\inventry-management-system
.\automation-tests\run-api-smoke.ps1
```

If PowerShell blocks scripts on your machine, use the batch wrapper:

```powershell
cd C:\xampp\htdocs\project\inventry-management-system
.\automation-tests\run-api-smoke.bat
```

Optional environment overrides:

```powershell
$env:API_BASE_URL = "http://127.0.0.1:8000/api/v1"
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "Admin@123456"
$env:SHOPKEEPER_EMAIL = "shopkeeper@example.com"
$env:SHOPKEEPER_PASSWORD = "Shopkeeper@123456"
node .\automation-tests\api-smoke.mjs
```

The smoke test checks login failure, admin login, shopkeeper login, profile payload, dashboard payload, large-list pagination cap, product create, oversell rejection, valid sale, and product archive.

## Run Full API Feature Scenarios

```powershell
cd C:\xampp\htdocs\project\inventry-management-system
.\automation-tests\run-api-full.bat
```

This covers admin dashboard, users, roles, permissions, settings, logs, shopkeeper products, stock, purchases, sales, customers, suppliers, returns, reports, duplicate validation, overpaid validation, oversell validation, archive, restore, and role boundaries.

## Run Visible UI Smoke Test

This opens Edge/Chrome visibly and drives the React UI through login and role navigation checks:

```powershell
cd C:\xampp\htdocs\project\inventry-management-system
.\automation-tests\run-ui-visible.bat
```

The visible UI test checks bad login, admin redirect, admin profile navigation, shopkeeper redirect, shopkeeper profile navigation, shopkeeper admin-page denial, and browser console/runtime errors. Screenshots are saved under `automation-tests/reports/`.

## Run Visible UI CRUD Scenarios

This opens Edge/Chrome visibly and performs create, update, archive, and validation flows from the React UI:

```powershell
cd C:\xampp\htdocs\project\inventry-management-system
.\automation-tests\run-ui-crud.bat
```

The CRUD runner covers admin permissions, roles, users, archived filters, shopkeeper suppliers, customers, products, stock movements, purchases, sales, returns, validation failures, and reports after data changes. PNG snapshots are saved under `automation-tests/reports/`.
