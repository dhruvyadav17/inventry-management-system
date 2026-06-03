<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\AdminCache;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $dashboard = Cache::remember(AdminCache::DASHBOARD, AdminCache::ttl('dashboard'), fn () => [
            'stats' => [
                'users' => User::count(),
                'active_users' => User::where('status', 'active')->count(),
                'roles' => Role::count(),
                'permissions' => Permission::count(),
                'deleted_users' => User::onlyTrashed()->count(),
            ],
            'recent_audits' => AuditLog::latest()->limit(10)->get(),
        ]);

        return ApiResponse::success($dashboard);
    }
}
