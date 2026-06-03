<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\LogController;
use App\Http\Controllers\Api\V1\OptionController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\ShopkeeperDashboardController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:api')->group(function (): void {
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/change-password', [AuthController::class, 'changePassword']);
        Route::put('profile', [ProfileController::class, 'update']);

        Route::get('dashboard', [DashboardController::class, 'index'])->middleware('permission:dashboard.view');
        Route::get('shopkeeper/dashboard', [ShopkeeperDashboardController::class, 'index'])->middleware('permission:shopkeeper.dashboard.view');
        Route::get('reports', [DashboardController::class, 'index'])->middleware('permission:reports.view');
        Route::get('options/rbac', [OptionController::class, 'rbac'])->middleware('permission:users.view|roles.view');

        Route::post('users/{id}/restore', [UserController::class, 'restore'])->middleware('permission:users.restore');
        Route::get('users', [UserController::class, 'index'])->middleware('permission:users.view');
        Route::post('users', [UserController::class, 'store'])->middleware('permission:users.create');
        Route::get('users/{user}', [UserController::class, 'show'])->withTrashed()->middleware('permission:users.view');
        Route::match(['put', 'patch'], 'users/{user}', [UserController::class, 'update'])->withTrashed()->middleware('permission:users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

        Route::post('roles/{id}/restore', [RoleController::class, 'restore'])->middleware('permission:roles.restore');
        Route::get('roles', [RoleController::class, 'index'])->middleware('permission:roles.view');
        Route::post('roles', [RoleController::class, 'store'])->middleware('permission:roles.create');
        Route::get('roles/{role}', [RoleController::class, 'show'])->withTrashed()->middleware('permission:roles.view');
        Route::match(['put', 'patch'], 'roles/{role}', [RoleController::class, 'update'])->withTrashed()->middleware('permission:roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.delete');

        Route::post('permissions/{id}/restore', [PermissionController::class, 'restore'])->middleware('permission:permissions.restore');
        Route::get('permissions', [PermissionController::class, 'index'])->middleware('permission:permissions.view');
        Route::post('permissions', [PermissionController::class, 'store'])->middleware('permission:permissions.create');
        Route::get('permissions/{permission}', [PermissionController::class, 'show'])->withTrashed()->middleware('permission:permissions.view');
        Route::match(['put', 'patch'], 'permissions/{permission}', [PermissionController::class, 'update'])->withTrashed()->middleware('permission:permissions.update');
        Route::delete('permissions/{permission}', [PermissionController::class, 'destroy'])->middleware('permission:permissions.delete');

        Route::get('settings', [SettingController::class, 'index'])->middleware('permission:settings.view');
        Route::put('settings', [SettingController::class, 'update'])->middleware('permission:settings.update');
        Route::get('logs/activities', [LogController::class, 'activities'])->middleware('permission:logs.view');
        Route::get('logs/audits', [LogController::class, 'audits'])->middleware('permission:logs.view');
    });
});
