<?php

return [
    'cache_ttl' => [
        'dashboard' => env('ADMIN_DASHBOARD_CACHE_TTL', 60),
        'settings' => env('ADMIN_SETTINGS_CACHE_TTL', 300),
        'options' => env('ADMIN_OPTIONS_CACHE_TTL', 300),
    ],

    'shopkeeper_cache_ttl' => [
        'dashboard' => env('SHOPKEEPER_DASHBOARD_CACHE_TTL', 45),
        'options' => env('SHOPKEEPER_OPTIONS_CACHE_TTL', 300),
        'reports' => env('SHOPKEEPER_REPORTS_CACHE_TTL', 60),
    ],

    'settings_defaults' => [
        'app_name' => env('APP_NAME', 'Inventory Admin Panel'),
        'timezone' => env('APP_TIMEZONE', 'UTC'),
    ],
];
