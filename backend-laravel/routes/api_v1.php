<?php

use Illuminate\Support\Facades\Route;

Route::middleware('throttle:api')->group(function (): void {
    require __DIR__.'/api/v1/auth.php';

    Route::middleware('auth:sanctum')->group(function (): void {
        require __DIR__.'/api/v1/common.php';
        require __DIR__.'/api/v1/shopkeeper.php';
        require __DIR__.'/api/v1/admin.php';
    });
});
