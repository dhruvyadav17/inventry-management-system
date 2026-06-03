<?php

return [
    'cache_ttl' => [
        'dashboard' => env('ADMIN_DASHBOARD_CACHE_TTL', 60),
        'settings' => env('ADMIN_SETTINGS_CACHE_TTL', 300),
        'options' => env('ADMIN_OPTIONS_CACHE_TTL', 300),
    ],

    'settings_defaults' => [
        'app_name' => env('APP_NAME', 'Inventory Admin Panel'),
        'timezone' => env('APP_TIMEZONE', 'UTC'),
    ],
];
