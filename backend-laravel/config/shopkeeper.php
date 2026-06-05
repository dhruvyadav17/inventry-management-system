<?php

return [
    'cache_ttl' => [
        'dashboard' => env('SHOPKEEPER_DASHBOARD_CACHE_TTL', 45),
        'options' => env('SHOPKEEPER_OPTIONS_CACHE_TTL', 300),
        'reports' => env('SHOPKEEPER_REPORTS_CACHE_TTL', 60),
    ],

    'resources' => [
        'products',
        'stock',
        'purchases',
        'sales',
        'customers',
        'suppliers',
        'returns',
        'reports',
    ],

    'editable_resources' => [
        'products',
        'customers',
        'suppliers',
    ],

    'dashboard_limits' => [
        'recent_products' => env('SHOPKEEPER_DASHBOARD_RECENT_PRODUCTS', 6),
        'low_stock_products' => env('SHOPKEEPER_DASHBOARD_LOW_STOCK_PRODUCTS', 8),
    ],

    'report_limits' => [
        'low_stock_products' => env('SHOPKEEPER_REPORT_LOW_STOCK_PRODUCTS', 10),
        'recent_sales' => env('SHOPKEEPER_REPORT_RECENT_SALES', 10),
        'recent_purchases' => env('SHOPKEEPER_REPORT_RECENT_PURCHASES', 10),
    ],

    'option_limits' => [
        'categories' => env('SHOPKEEPER_OPTION_CATEGORIES', 200),
        'suppliers' => env('SHOPKEEPER_OPTION_SUPPLIERS', 200),
        'customers' => env('SHOPKEEPER_OPTION_CUSTOMERS', 200),
        'products' => env('SHOPKEEPER_OPTION_PRODUCTS', 300),
    ],

    'search' => [
        'min_length' => env('SHOPKEEPER_SEARCH_MIN_LENGTH', 2),
    ],

    'modules' => [
        ['name' => 'Products', 'icon' => 'bi-box-seam', 'path' => '/shopkeeper/products'],
        ['name' => 'Stock Movement', 'icon' => 'bi-arrow-left-right', 'path' => '/shopkeeper/stock'],
        ['name' => 'Purchases', 'icon' => 'bi-bag-plus', 'path' => '/shopkeeper/purchases'],
        ['name' => 'Sales Billing', 'icon' => 'bi-receipt', 'path' => '/shopkeeper/sales'],
        ['name' => 'Customers', 'icon' => 'bi-person-lines-fill', 'path' => '/shopkeeper/customers'],
        ['name' => 'Suppliers', 'icon' => 'bi-truck', 'path' => '/shopkeeper/suppliers'],
        ['name' => 'Returns', 'icon' => 'bi-arrow-counterclockwise', 'path' => '/shopkeeper/returns'],
        ['name' => 'Reports', 'icon' => 'bi-graph-up-arrow', 'path' => '/shopkeeper/reports'],
    ],
];
