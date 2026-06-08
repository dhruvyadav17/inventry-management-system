$path = Join-Path $PSScriptRoot '..\backend-laravel\.env'
$content = Get-Content $path -Raw
$replacements = @{
  'APP_URL=http://localhost' = 'APP_URL=http://localhost'
  'FRONTEND_URL=http://127.0.0.1:5173' = 'FRONTEND_URL=http://localhost'
  'CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173' = 'CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1'
  'DB_CONNECTION=sqlite' = 'DB_CONNECTION=mysql'
  '# DB_HOST=127.0.0.1' = 'DB_HOST=mysql'
  '# DB_PORT=3306' = 'DB_PORT=3306'
  '# DB_DATABASE=laravel' = 'DB_DATABASE=inventry_management_system'
  '# DB_USERNAME=root' = 'DB_USERNAME=inventory_user'
  '# DB_PASSWORD=' = 'DB_PASSWORD=inventory_password'
}

foreach ($key in $replacements.Keys) {
  $content = $content.Replace($key, $replacements[$key])
}

Set-Content -Path $path -Value $content -NoNewline
