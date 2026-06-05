<?php

use App\Http\Controllers\Api\V1\Shopkeeper\ShopkeeperDashboardController;
use App\Http\Controllers\Api\V1\Shopkeeper\ShopkeeperInventoryController;
use Illuminate\Support\Facades\Route;

Route::prefix('shopkeeper')
    ->middleware('permission:shopkeeper.dashboard.view')
    ->group(function (): void {
        Route::get('dashboard', [ShopkeeperDashboardController::class, 'index']);
        Route::get('options', [ShopkeeperInventoryController::class, 'options']);
        Route::get('{resource}', [ShopkeeperInventoryController::class, 'index']);
        Route::post('{resource}', [ShopkeeperInventoryController::class, 'store']);
        Route::match(['put', 'patch'], '{resource}/{id}', [ShopkeeperInventoryController::class, 'update']);
        Route::delete('{resource}/{id}', [ShopkeeperInventoryController::class, 'destroy']);
    });
