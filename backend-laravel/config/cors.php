<?php

$frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:5173');
$allowedOrigins = array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', $frontendUrl))));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $allowedOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => env('CORS_SUPPORTS_CREDENTIALS', false),
];
