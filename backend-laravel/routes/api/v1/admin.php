<?php

use App\Http\Controllers\Api\V1\Admin\DashboardController;
use App\Http\Controllers\Api\V1\Admin\LogController;
use App\Http\Controllers\Api\V1\Admin\OptionController;
use App\Http\Controllers\Api\V1\Admin\PermissionController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Admin\SettingController;
use App\Http\Controllers\Api\V1\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::get('dashboard', [DashboardController::class, 'index'])->middleware('permission:dashboard.view');
Route::get('reports', [DashboardController::class, 'index'])->middleware('permission:reports.view');
Route::get('options/rbac', [OptionController::class, 'rbac'])->middleware('permission:users.view|roles.view');

Route::prefix('users')->group(function (): void {
    Route::post('{id}/restore', [UserController::class, 'restore'])->middleware('permission:users.restore');
    Route::get('/', [UserController::class, 'index'])->middleware('permission:users.view');
    Route::post('/', [UserController::class, 'store'])->middleware('permission:users.create');
    Route::get('{user}', [UserController::class, 'show'])->withTrashed()->middleware('permission:users.view');
    Route::match(['put', 'patch'], '{user}', [UserController::class, 'update'])->withTrashed()->middleware('permission:users.update');
    Route::delete('{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');
});

Route::prefix('roles')->group(function (): void {
    Route::post('{id}/restore', [RoleController::class, 'restore'])->middleware('permission:roles.restore');
    Route::get('/', [RoleController::class, 'index'])->middleware('permission:roles.view');
    Route::post('/', [RoleController::class, 'store'])->middleware('permission:roles.create');
    Route::get('{role}', [RoleController::class, 'show'])->withTrashed()->middleware('permission:roles.view');
    Route::match(['put', 'patch'], '{role}', [RoleController::class, 'update'])->withTrashed()->middleware('permission:roles.update');
    Route::delete('{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.delete');
});

Route::prefix('permissions')->group(function (): void {
    Route::post('{id}/restore', [PermissionController::class, 'restore'])->middleware('permission:permissions.restore');
    Route::get('/', [PermissionController::class, 'index'])->middleware('permission:permissions.view');
    Route::post('/', [PermissionController::class, 'store'])->middleware('permission:permissions.create');
    Route::get('{permission}', [PermissionController::class, 'show'])->withTrashed()->middleware('permission:permissions.view');
    Route::match(['put', 'patch'], '{permission}', [PermissionController::class, 'update'])->withTrashed()->middleware('permission:permissions.update');
    Route::delete('{permission}', [PermissionController::class, 'destroy'])->middleware('permission:permissions.delete');
});

Route::get('settings', [SettingController::class, 'index'])->middleware('permission:settings.view');
Route::put('settings', [SettingController::class, 'update'])->middleware('permission:settings.update');
Route::get('logs/activities', [LogController::class, 'activities'])->middleware('permission:logs.view');
Route::get('logs/audits', [LogController::class, 'audits'])->middleware('permission:logs.view');
