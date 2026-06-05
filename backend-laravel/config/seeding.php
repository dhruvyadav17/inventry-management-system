<?php

return [
    'large_inventory' => [
        'enabled' => env('SEED_LARGE_INVENTORY', true),
        'suppliers' => env('SEED_SUPPLIERS', 100),
        'customers' => env('SEED_CUSTOMERS', 500),
        'products' => env('SEED_PRODUCTS', 1000),
        'purchases' => env('SEED_PURCHASES', 500),
        'sales' => env('SEED_SALES', 1000),
        'chunk' => env('SEED_CHUNK_SIZE', 500),
    ],
];
