<?php

namespace App\Services\Admin;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\AdminCache;
use Illuminate\Support\Facades\Cache;

class AdminDashboardService
{
    public function payload(): array
    {
        return Cache::remember(AdminCache::DASHBOARD, AdminCache::ttl('dashboard'), fn () => [
            'stats' => $this->stats(),
            'recent_audits' => $this->recentAudits(),
        ]);
    }

    private function stats(): array
    {
        return [
            'users' => User::count(),
            'active_users' => User::where('status', 'active')->count(),
            'roles' => Role::count(),
            'permissions' => Permission::count(),
            'deleted_users' => User::onlyTrashed()->count(),
        ];
    }

    private function recentAudits()
    {
        return AuditLog::latest()
            ->limit((int) config('admin.dashboard_limits.recent_audits', 10))
            ->get();
    }
}
